import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import { attachments, offers, orders, partRequests, requestMessages, users, vehicles } from "@/lib/db/schema";
import { computeQuote, DEFAULT_PRICING, savePricingSettings } from "@/lib/pricing";
import { FIXTURE_VINS } from "@/lib/providers";
import { makeUser, testDb } from "@/tests/helpers/db";
import { acceptOffer } from "../orders";
import { setUserRole } from "../admin";
import { cancelRequest, createRequest, getRequestForCustomer, listMyRequests, postCustomerMessage } from "../requests";
import {
  addInternalNote,
  askClarification,
  CONFLICT_MESSAGE,
  createOffer,
  deleteOffer,
  getRequestForStaff,
  listQueue,
  previewQuote,
  publishOffers,
  queueCounts,
  releaseRequest,
  sendCustomerMessage,
  setStatus,
  TAKEN_MESSAGE,
  takeRequest,
  updateOffer,
  withdrawOffer,
  type OfferInput,
} from "../sourcing";

const routeState = vi.hoisted(() => ({ db: null as Db | null, actor: null as Actor | null }));
vi.mock("@/lib/auth/current", async () => {
  const { unauthorized } = await import("@/lib/server/errors");
  return {
    getActor: async () => routeState.actor,
    requireActor: async () => {
      if (!routeState.actor) throw unauthorized();
      return routeState.actor;
    },
  };
});
vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  getDb: async () => routeState.db,
}));

const OTHER_UUID = "00000000-0000-4000-8000-000000000000";
const INTERNAL_VALUES = ["Guangzhou Parts Co", "https://example.com/item/1", "supplier margin note", "120.00"];

let db: Db;
let alice: Actor;
let bob: Actor;
let sourcer: Actor;
let other: Actor;
let admin: Actor;
let info: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  info = vi.spyOn(console, "info").mockImplementation(() => {});
  db = await testDb();
  alice = await makeUser(db, "customer", { name: "Алия" });
  bob = await makeUser(db, "customer");
  sourcer = await makeUser(db, "sourcer", { name: "Айгерим" });
  other = await makeUser(db, "sourcer", { name: "Ли Вэй" });
  admin = await makeUser(db, "admin", { name: "Админ" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// One car per owner and VIN, as in the garage: a second request for the same car reuses it.
async function addVehicle(owner: Actor, extra: Partial<typeof vehicles.$inferInsert> = {}) {
  const values = {
    ownerId: owner.id,
    vin: FIXTURE_VINS.bydSongPlus,
    brand: "BYD",
    model: "Song Plus",
    year: 2023,
    trim: "DM-i 110 km Flagship",
    epc: "byd",
    decodeStatus: "decoded" as const,
    ...extra,
  };
  const [v] = await db
    .insert(vehicles)
    .values(values)
    .onConflictDoUpdate({ target: [vehicles.ownerId, vehicles.vin], set: values })
    .returning();
  return v;
}

async function newRequest(owner: Actor = alice, extra: { vehicle?: Partial<typeof vehicles.$inferInsert> | null; title?: string; oe?: string } = {}) {
  const car = extra.vehicle === null ? null : await addVehicle(owner, extra.vehicle ?? {});
  const created = await createRequest(db, owner, {
    vehicleId: car?.id ?? null,
    title: extra.title ?? "Колодки передние",
    partTypeId: "brake-pads",
    axis: "front",
    oe: extra.oe ?? "10273368-00",
    qty: 1,
  });
  const [row] = await db.select().from(partRequests).where(eq(partRequests.id, created.id));
  return row;
}

async function reload(id: string) {
  const [row] = await db.select().from(partRequests).where(eq(partRequests.id, id));
  return row;
}

const offerInput = (extra: Partial<OfferInput> = {}): OfferInput => ({
  title: "Колодки передние BYD",
  oe: "10273368-00",
  manufacturer: "BYD",
  kind: "original",
  qty: 1,
  priceCny: "120",
  weightKg: 1.5,
  leadDaysMin: 12,
  leadDaysMax: 18,
  fitment: "needs_check",
  note: "Оригинал из дилерского склада",
  supplierName: "Guangzhou Parts Co",
  supplierUrl: "https://example.com/item/1",
  internalNote: "supplier margin note",
  ...extra,
});

// A request taken by `sourcer`, in "searching".
async function takenRequest(owner: Actor = alice, extra: Parameters<typeof newRequest>[1] = {}) {
  const request = await newRequest(owner, extra);
  await takeRequest(db, sourcer, request.id, request.version);
  return reload(request.id);
}

const notified = (type: string) => info.mock.calls.filter(([line]) => String(line).includes(`notification ${type} `)).length;

describe("listQueue", () => {
  it("shows new unassigned requests first come, first served, with masked VIN and counts", async () => {
    const first = await newRequest(alice, { title: "Фара левая" });
    const second = await newRequest(bob, { vehicle: null, title: "Зеркало правое" });
    const taken = await newRequest(bob, { vehicle: { vin: FIXTURE_VINS.deepalS7 }, title: "Бампер" });
    await takeRequest(db, other, taken.id);
    await db.insert(attachments).values([
      { requestId: first.id, storageKey: "11111111-1111-4111-8111-111111111111", name: "a.jpg", mime: "image/jpeg", size: 10 },
      { requestId: first.id, storageKey: "22222222-2222-4222-8222-222222222222", name: "b.jpg", mime: "image/jpeg", size: 10 },
    ]);
    await db.insert(offers).values([
      { requestId: first.id, status: "draft", title: "x", kind: "oem", priceKzt: 1000, leadDaysMin: 1, leadDaysMax: 2 },
      { requestId: first.id, status: "withdrawn", title: "y", kind: "oem", priceKzt: 1000, leadDaysMin: 1, leadDaysMax: 2 },
    ]);

    const queue = await listQueue(db, sourcer, { view: "new" });
    expect(queue.map((r) => r.id)).toEqual([first.id, second.id]);
    expect(queue[0]).toMatchObject({
      number: first.number,
      title: "Фара левая",
      status: "new",
      vehicleLabel: "BYD Song Plus 2023",
      vinMasked: "LGX…0001",
      assignee: null,
      attachmentCount: 2,
      offerCount: 0,
      draftCount: 1,
      version: 1,
    });
    expect(JSON.stringify(queue)).not.toContain(FIXTURE_VINS.bydSongPlus);
    expect(queue[1]).toMatchObject({ vehicleLabel: null, vinMasked: null, attachmentCount: 0 });

    const all = await listQueue(db, sourcer, { view: "all" });
    expect(all).toHaveLength(3);
    expect(all.find((r) => r.id === taken.id)?.assignee).toEqual({ id: other.id, name: "Ли Вэй", isMe: false });
    expect(await listQueue(db, sourcer)).toHaveLength(2);
  });

  it("splits mine, clarification and offered", async () => {
    const mine = await takenRequest();
    const theirs = await newRequest(bob);
    await takeRequest(db, other, theirs.id);
    const done = await takenRequest(bob);
    await setStatus(db, sourcer, done.id, "cancelled", done.version);
    const asking = await takenRequest(alice);
    await askClarification(db, sourcer, asking.id, "Пришлите фото старой детали", asking.version);

    expect((await listQueue(db, sourcer, { view: "mine" })).map((r) => r.id).sort()).toEqual([mine.id, asking.id].sort());
    expect((await listQueue(db, other, { view: "mine" })).map((r) => r.id)).toEqual([theirs.id]);
    expect((await listQueue(db, other, { view: "clarification" })).map((r) => r.id)).toEqual([asking.id]);

    await createOffer(db, sourcer, mine.id, offerInput());
    await publishOffers(db, sourcer, mine.id, mine.version);
    expect((await listQueue(db, sourcer, { view: "offered" })).map((r) => [r.id, r.offerCount])).toEqual([[mine.id, 1]]);
    expect(await queueCounts(db, sourcer)).toEqual({ new: 0, mine: 2, clarification: 1, offered: 1 });
    expect(await queueCounts(db, other)).toMatchObject({ mine: 1 });
  });

  it("searches by number, title, OE and VIN tail", async () => {
    const pads = await newRequest(alice, { title: "Колодки передние", oe: "10273368-00" });
    const lamp = await newRequest(bob, { vehicle: { vin: FIXTURE_VINS.geelyGalaxyE5 }, title: "Фара 50% скидка", oe: "6600123456" });
    const ids = async (q: string) => (await listQueue(db, sourcer, { view: "all", q })).map((r) => r.id).sort();

    expect(await ids(String(lamp.number))).toContain(lamp.id);
    expect(await ids(`№${pads.number}`)).toEqual([pads.id]);
    expect(await ids("  колодки ")).toEqual([pads.id]);
    expect(await ids("1027336800")).toEqual([pads.id]);
    expect(await ids("10273368 00")).toEqual([pads.id]);
    expect(await ids("0002")).toEqual([lamp.id]);
    expect(await ids(FIXTURE_VINS.geelyGalaxyE5.toLowerCase())).toEqual([lamp.id]);
    // LIKE wildcards are literal.
    expect(await ids("%")).toEqual([lamp.id]);
    expect(await ids("_")).toEqual([]);
    expect(await ids("тормозной диск")).toEqual([]);

    await db.insert(offers).values({ requestId: lamp.id, title: "Фара", kind: "oem", oe: "LP-998877", priceKzt: 1, leadDaysMin: 1, leadDaysMax: 2 });
    expect(await ids("lp998877")).toEqual([lamp.id]);
  });

  it("is for staff only", async () => {
    await newRequest();
    for (const actor of [alice, await makeUser(db, "master")]) {
      await expect(listQueue(db, actor, { view: "all" })).rejects.toMatchObject({ status: 403 });
      await expect(queueCounts(db, actor)).rejects.toMatchObject({ status: 403 });
    }
    await expect(listQueue(db, sourcer, { view: "archive" })).rejects.toMatchObject({ status: 400 });
    expect(await listQueue(db, admin, { view: "new" })).toHaveLength(1);
  });
});

describe("getRequestForStaff", () => {
  it("returns everything: full VIN, internal notes, offers with internal fields, masked phone", async () => {
    const request = await takenRequest();
    await addInternalNote(db, sourcer, request.id, "Проверить у поставщика наличие");
    await createOffer(db, sourcer, request.id, offerInput());
    await db.insert(attachments).values({ requestId: request.id, storageKey: "33333333-3333-4333-8333-333333333333", name: "old.jpg", mime: "image/jpeg", size: 5 });

    const view = await getRequestForStaff(db, sourcer, request.id);
    expect(view.request).toMatchObject({
      id: request.id,
      status: "searching",
      partName: "Тормозные колодки",
      partNameZh: "前刹车片",
      axis: "front",
      oe: "10273368-00",
      version: request.version,
      assignedTo: sourcer.id,
    });
    expect(view.vehicle).toMatchObject({ vin: FIXTURE_VINS.bydSongPlus, label: "BYD Song Plus 2023", current: { decodeStatus: "decoded" } });
    expect(view.vinConfirmable).toBe(true);
    expect(view.canEdit).toBe(true);
    expect(view.assignee).toEqual({ id: sourcer.id, name: "Айгерим", isMe: true });
    expect(view.customer).toMatchObject({ id: alice.id, name: "Алия", phoneMasked: true });
    expect(view.customer?.phone).toMatch(/^\+7•+\d{4}$/);
    expect(view.customer?.phone).not.toContain(alice.phone.slice(1, 7));
    expect(view.messages.map((m) => [m.from, m.internal, m.body])).toEqual([
      ["system", false, "Заявка получена. Подборщик ответит в рабочее время."],
      ["system", false, TAKEN_MESSAGE],
      ["staff", true, "Проверить у поставщика наличие"],
    ]);
    expect(view.offers[0]).toMatchObject({ status: "draft", priceCny: "120.00", supplierName: "Guangzhou Parts Co", internalNote: "supplier margin note" });
    expect(view.offers[0].costKzt).toBeGreaterThan(0);
    expect(view.attachments).toMatchObject([{ name: "old.jpg" }]);

    const asAdmin = await getRequestForStaff(db, admin, String(request.number));
    expect(asAdmin.request.id).toBe(request.id);
    expect(asAdmin.customer).toMatchObject({ phoneMasked: false, phone: expect.stringContaining(alice.phone.slice(-2)) });
    expect(asAdmin.customer?.phone.replace(/\D/g, "")).toBe(alice.phone);

    const asOther = await getRequestForStaff(db, other, request.id);
    expect(asOther.canEdit).toBe(false);
    expect(asOther.assignee?.isMe).toBe(false);
  });

  it("allows «vin_confirmed» only with a decoded VIN or a chosen trim", async () => {
    const ambiguous = await newRequest(alice, {
      vehicle: {
        decodeStatus: "ambiguous",
        trim: null,
        candidates: [
          { id: "c1", brand: "BYD", model: "Song Plus", year: "2023", version: "110 km", description: "", engine: "", fuel: "", drive: "", epcId: "1", image: null },
          { id: "c2", brand: "BYD", model: "Song Plus", year: "2023", version: "150 km", description: "", engine: "", fuel: "", drive: "", epcId: "1", image: null },
        ],
      },
    });
    expect((await getRequestForStaff(db, sourcer, ambiguous.id)).vinConfirmable).toBe(false);
    await db.update(vehicles).set({ selectedCandidateId: "c2" }).where(eq(vehicles.id, ambiguous.vehicleId!));
    expect((await getRequestForStaff(db, sourcer, ambiguous.id)).vinConfirmable).toBe(true);

    const manual = await newRequest(bob, { vehicle: { vin: null, decodeStatus: "manual" } });
    expect((await getRequestForStaff(db, sourcer, manual.id)).vinConfirmable).toBe(false);
    const none = await newRequest(bob, { vehicle: null });
    expect((await getRequestForStaff(db, sourcer, none.id)).vinConfirmable).toBe(false);
  });

  it("hides the request from customers, including its owner", async () => {
    const request = await newRequest();
    for (const actor of [alice, bob, await makeUser(db, "master")])
      await expect(getRequestForStaff(db, actor, request.id)).rejects.toMatchObject({ status: 403 });
    for (const ref of [OTHER_UUID, "nope", "999999", "' or 1=1 --"])
      await expect(getRequestForStaff(db, sourcer, ref)).rejects.toMatchObject({ status: 404 });
  });
});

describe("taking and releasing", () => {
  it("takes a new request: assigned, searching, version bumped, the customer sees a message", async () => {
    const request = await newRequest();
    const taken = await takeRequest(db, sourcer, request.id, request.version);
    expect(taken).toMatchObject({ status: "searching", assignedTo: sourcer.id, version: request.version + 1 });
    const customer = await getRequestForCustomer(db, alice, request.id);
    expect(customer.request.status).toBe("searching");
    expect(customer.messages.map((m) => m.body)).toContain(TAKEN_MESSAGE);

    // Taking again is a no-op; someone else gets a clear conflict.
    expect(await takeRequest(db, sourcer, request.id)).toMatchObject({ version: taken.version });
    await expect(takeRequest(db, other, request.id)).rejects.toMatchObject({ status: 409, message: expect.stringContaining("другой подборщик") });
    await expect(takeRequest(db, admin, request.id)).rejects.toMatchObject({ status: 409 });
  });

  it("refuses a stale version, closed requests and customers", async () => {
    const request = await newRequest();
    await expect(takeRequest(db, sourcer, request.id, request.version + 5)).rejects.toMatchObject({ status: 409, message: CONFLICT_MESSAGE });
    await expect(takeRequest(db, alice, request.id)).rejects.toMatchObject({ status: 403 });
    await expect(takeRequest(db, sourcer, OTHER_UUID)).rejects.toMatchObject({ status: 404 });
    await setStatus(db, sourcer, request.id, "cancelled", request.version);
    await expect(takeRequest(db, sourcer, request.id)).rejects.toMatchObject({ status: 409 });
    expect((await reload(request.id)).assignedTo).toBeNull();
  });

  it("only one of two sourcers wins a race", async () => {
    const request = await newRequest();
    const results = await Promise.allSettled([
      takeRequest(db, sourcer, request.id, request.version),
      takeRequest(db, other, request.id, request.version),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toMatchObject([{ reason: { status: 409 } }]);
    const row = await reload(request.id);
    expect([sourcer.id, other.id]).toContain(row.assignedTo);
    expect(row.version).toBe(2);
  });

  it("releases back to the new queue; only the owner or an admin may release", async () => {
    const request = await takenRequest();
    await expect(releaseRequest(db, other, request.id, request.version)).rejects.toMatchObject({ status: 403 });
    await expect(releaseRequest(db, alice, request.id, request.version)).rejects.toMatchObject({ status: 403 });
    await expect(releaseRequest(db, sourcer, request.id, request.version - 1)).rejects.toMatchObject({ status: 409, message: CONFLICT_MESSAGE });
    const released = await releaseRequest(db, sourcer, request.id, request.version);
    expect(released).toMatchObject({ status: "new", assignedTo: null, version: request.version + 1 });
    expect((await listQueue(db, other, { view: "new" })).map((r) => r.id)).toEqual([request.id]);
    // The hand-over is a staff-only note.
    const customer = await getRequestForCustomer(db, alice, request.id);
    expect(customer.messages.some((m) => m.body.includes("Снял"))).toBe(false);
    await expect(releaseRequest(db, sourcer, request.id, released.version)).rejects.toMatchObject({ status: 409 });

    const again = await takeRequest(db, other, request.id, released.version);
    expect(await releaseRequest(db, admin, request.id, again.version)).toMatchObject({ assignedTo: null });
  });
});

describe("setStatus", () => {
  it("follows the allowed transitions with a version check", async () => {
    const request = await newRequest();
    const searching = await setStatus(db, sourcer, request.id, "searching", request.version);
    expect(searching).toMatchObject({ status: "searching", assignedTo: sourcer.id });
    await expect(setStatus(db, sourcer, request.id, "closed", searching.version)).rejects.toMatchObject({ status: 400, code: "invalid_transition" });
    await expect(setStatus(db, sourcer, request.id, "accepted", searching.version)).rejects.toMatchObject({ status: 400 });
    await expect(setStatus(db, sourcer, request.id, "clarification", searching.version - 1)).rejects.toMatchObject({ status: 409, message: CONFLICT_MESSAGE });
    await expect(setStatus(db, sourcer, request.id, "bogus" as never, searching.version)).rejects.toMatchObject({ status: 400 });
    // "offered" needs something to choose from.
    await expect(setStatus(db, sourcer, request.id, "offered", searching.version)).rejects.toMatchObject({ code: "no_offers" });

    const asking = await setStatus(db, sourcer, request.id, "clarification", searching.version);
    expect(notified("request_clarification")).toBe(1);
    const back = await setStatus(db, sourcer, request.id, "searching", asking.version);
    expect(back.status).toBe("searching");
    const cancelled = await setStatus(db, sourcer, request.id, "cancelled", back.version, { reason: "  Клиент купил деталь   на месте " });
    expect(cancelled.status).toBe("cancelled");
    const customer = await getRequestForCustomer(db, alice, request.id);
    expect(customer.messages.at(-1)?.body).toBe("Подборщик отменил заявку.\nПричина: Клиент купил деталь на месте");
    await expect(setStatus(db, sourcer, request.id, "searching", cancelled.version)).rejects.toMatchObject({ status: 400 });
  });

  it("closes an accepted request only once its order is finished, and re-opens offers after a search", async () => {
    const request = await takenRequest();
    await createOffer(db, sourcer, request.id, offerInput());
    const offered = await publishOffers(db, sourcer, request.id, request.version);
    const searching = await setStatus(db, sourcer, request.id, "searching", offered.version);
    const reopened = await setStatus(db, sourcer, request.id, "offered", searching.version);
    expect(reopened.status).toBe("offered");
    expect(notified("request_offered")).toBe(2);

    const [offer] = await db.select().from(offers).where(eq(offers.requestId, request.id));
    await acceptOffer(db, alice, offer.id);
    const accepted = await reload(request.id);
    expect(accepted.status).toBe("accepted");
    // The order is on its way: closing now would close the chat the customer uses during delivery.
    await expect(setStatus(db, sourcer, request.id, "closed", accepted.version)).rejects.toMatchObject({ status: 400, code: "order_active" });
    await db.update(orders).set({ status: "returned" }).where(eq(orders.requestId, request.id));
    expect(await setStatus(db, sourcer, request.id, "closed", accepted.version)).toMatchObject({ status: "closed" });
  });

  it("limits who may move a request", async () => {
    const request = await takenRequest();
    await expect(setStatus(db, alice, request.id, "cancelled", request.version)).rejects.toMatchObject({ status: 403 });
    await expect(setStatus(db, other, request.id, "cancelled", request.version)).rejects.toMatchObject({ status: 403, message: "Заявку ведёт другой подборщик" });
    expect(await setStatus(db, admin, request.id, "clarification", request.version)).toMatchObject({ status: "clarification", assignedTo: sourcer.id });
  });
});

describe("conversation", () => {
  it("asks the customer, notifies them, and their answer returns the request to the search", async () => {
    const request = await newRequest();
    // Asking straight from the new queue takes the request.
    const asked = await askClarification(db, sourcer, request.id, "  Пришлите фото таблички на двери  ", request.version);
    expect(asked).toMatchObject({ status: "clarification", assignedTo: sourcer.id, version: request.version + 1 });
    expect(notified("request_clarification")).toBe(1);
    expect(info.mock.calls.some(([line]) => String(line).includes("Пришлите фото таблички на двери"))).toBe(true);

    const customer = await getRequestForCustomer(db, alice, request.id);
    expect(customer.messages.at(-1)).toMatchObject({ from: "staff", body: "Пришлите фото таблички на двери" });
    await postCustomerMessage(db, alice, request.id, { body: "Отправил фото" });
    const answered = await reload(request.id);
    expect(answered.status).toBe("searching");

    await expect(askClarification(db, sourcer, request.id, "Ещё вопрос", asked.version)).rejects.toMatchObject({ status: 409, message: CONFLICT_MESSAGE });
    await expect(askClarification(db, sourcer, request.id, "   ", answered.version)).rejects.toMatchObject({ status: 400 });
    await expect(askClarification(db, other, request.id, "Вопрос", answered.version)).rejects.toMatchObject({ status: 403 });
    await expect(askClarification(db, alice, request.id, "Вопрос", answered.version)).rejects.toMatchObject({ status: 403 });
  });

  it("does not ask while the customer is choosing", async () => {
    const request = await takenRequest();
    await createOffer(db, sourcer, request.id, offerInput());
    const offered = await publishOffers(db, sourcer, request.id, request.version);
    await expect(askClarification(db, sourcer, request.id, "Вопрос", offered.version)).rejects.toMatchObject({ status: 400, code: "invalid_transition" });
  });

  it("keeps internal notes away from the customer and sends plain messages", async () => {
    const request = await takenRequest();
    await addInternalNote(db, sourcer, request.id, "Поставщик просит предоплату 30%");
    info.mockClear();
    await sendCustomerMessage(db, sourcer, request.id, "Нашли два варианта, считаем доставку");
    // The customer hears about it; the internal note before it sent nothing.
    expect(info.mock.calls.map((c) => String(c[0])).filter((line) => line.includes("notification request_message"))).toHaveLength(1);
    const customer = await getRequestForCustomer(db, alice, request.id);
    expect(JSON.stringify(customer)).not.toContain("предоплату");
    expect(customer.messages.at(-1)).toMatchObject({ from: "staff", body: "Нашли два варианта, считаем доставку" });
    expect((await reload(request.id)).version).toBe(request.version);

    const staff = await getRequestForStaff(db, other, request.id);
    expect(staff.messages.find((m) => m.internal && m.from === "staff")).toMatchObject({ body: "Поставщик просит предоплату 30%", authorName: "Айгерим" });

    await expect(addInternalNote(db, other, request.id, "Чужая заметка")).rejects.toMatchObject({ status: 403 });
    await expect(sendCustomerMessage(db, alice, request.id, "Привет")).rejects.toMatchObject({ status: 403 });
    await expect(addInternalNote(db, sourcer, request.id, "x".repeat(3001))).rejects.toMatchObject({ status: 400 });
    expect(await addInternalNote(db, admin, request.id, "Админ проверил")).toMatchObject({ id: expect.any(String) });

    const closed = await setStatus(db, sourcer, request.id, "cancelled", request.version);
    await expect(sendCustomerMessage(db, sourcer, request.id, "Ещё раз")).rejects.toMatchObject({ status: 400 });
    expect(await addInternalNote(db, sourcer, request.id, "Клиент купил в другом месте")).toBeTruthy();
    expect(closed.status).toBe("cancelled");
  });
});

describe("offers", () => {
  it("prices a draft from the yuan price, weight and pricing settings", async () => {
    const request = await takenRequest();
    const now = new Date("2026-10-20T10:00:00Z");
    const { offer, quote } = await createOffer(db, sourcer, request.id, offerInput({ priceCny: "1 234,5", weightKg: "0,75", qty: 2 }), { now });
    const expected = computeQuote({ ...DEFAULT_PRICING, priceCny: "1234.50", qty: 2, weightKg: 0.75 });
    expect(quote).toEqual(expected);
    expect(offer).toMatchObject({
      status: "draft",
      priceCny: "1234.50",
      costKzt: expected.costKzt,
      priceKzt: expected.priceKzt,
      qty: 2,
      oe: "10273368-00",
      supplierUrl: "https://example.com/item/1",
      validUntil: "2026-10-22T10:00:00.000Z",
    });
    const [row] = await db.select().from(offers).where(eq(offers.id, offer.id));
    expect(row).toMatchObject({ createdBy: sourcer.id, priceCny: "1234.50", costKzt: expected.costKzt });

    // Admin-set pricing is used; validDays is honoured.
    await savePricingSettings(db, { ...DEFAULT_PRICING, cnyRate: 70, markupPct: 30 });
    const second = await createOffer(db, sourcer, request.id, offerInput({ validDays: 5 }), { now });
    expect(second.offer.priceKzt).toBe(computeQuote({ ...DEFAULT_PRICING, cnyRate: 70, markupPct: 30, priceCny: "120", qty: 1, weightKg: 1.5 }).priceKzt);
    expect(second.offer.validUntil).toBe("2026-10-25T10:00:00.000Z");

    // Drafts stay invisible to the customer.
    expect((await getRequestForCustomer(db, alice, request.id)).offers).toEqual([]);
  });

  it("takes the sourcer's own price but never below cost unless forced", async () => {
    const request = await takenRequest();
    const cost = computeQuote({ ...DEFAULT_PRICING, priceCny: "120", qty: 1, weightKg: 1.5 }).costKzt;
    const own = await createOffer(db, sourcer, request.id, offerInput({ priceKzt: cost + 5000 }));
    expect(own.offer).toMatchObject({ priceKzt: cost + 5000, costKzt: cost });
    await expect(createOffer(db, sourcer, request.id, offerInput({ priceKzt: cost - 1 }))).rejects.toMatchObject({ status: 400, code: "below_cost" });
    const forced = await createOffer(db, sourcer, request.id, offerInput({ priceKzt: cost - 1, forceBelowCost: true }));
    expect(forced.offer.priceKzt).toBe(cost - 1);

    // Without a yuan price the tenge price is required and the cost stays unknown, never 0.
    const direct = await createOffer(db, sourcer, request.id, offerInput({ priceCny: null, weightKg: null, priceKzt: 45000 }));
    expect(direct.offer).toMatchObject({ priceCny: null, costKzt: null, priceKzt: 45000 });
    await expect(createOffer(db, sourcer, request.id, offerInput({ priceCny: "", priceKzt: null }))).rejects.toMatchObject({ code: "price_required" });
    await expect(createOffer(db, sourcer, request.id, offerInput({ weightKg: null }))).rejects.toMatchObject({ code: "weight_required" });
  });

  it("validates the form with Russian messages", async () => {
    const request = await takenRequest();
    const bad = async (extra: Partial<OfferInput>, message?: string) => {
      const attempt = createOffer(db, sourcer, request.id, offerInput(extra));
      await expect(attempt).rejects.toMatchObject({ status: 400, ...(message ? { message: expect.stringContaining(message) } : {}) });
    };
    await bad({ title: "x" }, "Название");
    await bad({ kind: "fake" as never }, "Выберите тип");
    await bad({ fitment: "maybe" as never }, "совместимость");
    await bad({ qty: 0 }, "Количество");
    await bad({ priceCny: "12.345" }, "Цена в юанях");
    await bad({ priceCny: "-5" }, "Цена в юанях");
    await bad({ weightKg: "тяжёлая" }, "Вес");
    await bad({ priceKzt: 1.5 }, "Цена для клиента");
    await bad({ leadDaysMin: 20, leadDaysMax: 10 }, "Минимальный срок");
    await bad({ leadDaysMin: 0 }, "Срок поставки");
    await bad({ supplierUrl: "javascript:alert(1)" }, "http");
    await bad({ supplierUrl: "ftp://example.com/x" }, "http");
    await bad({ supplierUrl: "https://user:pass@example.com/" }, "http");
    await bad({ validDays: 30 }, "Цена действует");
    await bad({ oe: FIXTURE_VINS.bydSongPlus }, "похоже на VIN");
    await bad({ note: "x".repeat(1001) }, "Комментарий");
    expect(await db.select().from(offers)).toHaveLength(0);
  });

  it("checks fitment against the request's car", async () => {
    const decoded = await takenRequest();
    expect((await createOffer(db, sourcer, decoded.id, offerInput({ fitment: "vin_confirmed" }))).offer.fitment).toBe("vin_confirmed");

    const ambiguous = await takenRequest(bob, { vehicle: { decodeStatus: "ambiguous", trim: null } });
    await expect(createOffer(db, sourcer, ambiguous.id, offerInput({ fitment: "vin_confirmed" }))).rejects.toMatchObject({
      status: 400,
      code: "fitment_not_confirmable",
    });
    expect((await createOffer(db, sourcer, ambiguous.id, offerInput({ fitment: "manual" }))).offer.fitment).toBe("manual");

    const noCar = await takenRequest(bob, { vehicle: null });
    await expect(createOffer(db, sourcer, noCar.id, offerInput({ fitment: "vin_confirmed" }))).rejects.toMatchObject({ code: "fitment_not_confirmable" });
  });

  it("limits who may draft offers and when", async () => {
    const request = await takenRequest();
    await expect(createOffer(db, alice, request.id, offerInput())).rejects.toMatchObject({ status: 403 });
    await expect(createOffer(db, other, request.id, offerInput())).rejects.toMatchObject({ status: 403 });
    await expect(createOffer(db, sourcer, OTHER_UUID, offerInput())).rejects.toMatchObject({ status: 404 });
    expect((await createOffer(db, admin, request.id, offerInput())).offer.status).toBe("draft");
    // Unassigned requests are open to every sourcer.
    const fresh = await newRequest(bob);
    expect((await createOffer(db, other, fresh.id, offerInput())).offer.status).toBe("draft");

    await setStatus(db, sourcer, request.id, "cancelled", request.version);
    await expect(createOffer(db, sourcer, request.id, offerInput())).rejects.toMatchObject({ status: 400, code: "request_closed" });
  });

  it("edits and deletes drafts only", async () => {
    const request = await takenRequest();
    const { offer } = await createOffer(db, sourcer, request.id, offerInput({ priceKzt: 30000 }));
    const later = new Date(Date.now() + 3600 * 1000);

    // Same yuan price and quantity without a weight: the computed cost is kept.
    const renamed = await updateOffer(db, sourcer, offer.id, offerInput({ title: "Колодки передние, оригинал", weightKg: null, priceKzt: null }), { now: later });
    expect(renamed.offer).toMatchObject({ title: "Колодки передние, оригинал", costKzt: offer.costKzt, priceKzt: 30000 });
    expect(new Date(renamed.offer.validUntil!).getTime()).toBe(later.getTime() + 2 * 24 * 3600 * 1000);
    // A new yuan price needs the weight again.
    await expect(updateOffer(db, sourcer, offer.id, offerInput({ priceCny: "150", weightKg: null }))).rejects.toMatchObject({ code: "weight_required" });
    const repriced = await updateOffer(db, sourcer, offer.id, offerInput({ priceCny: "150", weightKg: 2 }));
    expect(repriced.offer).toMatchObject({ priceCny: "150.00", priceKzt: computeQuote({ ...DEFAULT_PRICING, priceCny: "150", qty: 1, weightKg: 2 }).priceKzt });

    await expect(updateOffer(db, other, offer.id, offerInput())).rejects.toMatchObject({ status: 403 });
    await expect(updateOffer(db, alice, offer.id, offerInput())).rejects.toMatchObject({ status: 403 });
    await expect(deleteOffer(db, other, offer.id)).rejects.toMatchObject({ status: 403 });
    await expect(updateOffer(db, sourcer, OTHER_UUID, offerInput())).rejects.toMatchObject({ status: 404 });

    await publishOffers(db, sourcer, request.id, request.version);
    await expect(updateOffer(db, sourcer, offer.id, offerInput())).rejects.toMatchObject({ status: 409 });
    await expect(deleteOffer(db, sourcer, offer.id)).rejects.toMatchObject({ status: 409 });

    const { offer: draft } = await createOffer(db, sourcer, request.id, offerInput());
    expect(await deleteOffer(db, sourcer, draft.id)).toEqual({ id: draft.id });
    expect(await db.select().from(offers).where(eq(offers.id, draft.id))).toHaveLength(0);
  });

  it("previews a quote for the editor", async () => {
    const preview = await previewQuote(db, sourcer, { priceCny: "120,00", qty: 2, weightKg: "1.5" });
    expect(preview).toEqual({
      ...computeQuote({ ...DEFAULT_PRICING, priceCny: "120", qty: 2, weightKg: 1.5 }),
      cnyRate: DEFAULT_PRICING.cnyRate,
      cnyRateDate: DEFAULT_PRICING.cnyRateDate,
    });
    await expect(previewQuote(db, sourcer, { priceCny: "", qty: 1, weightKg: 1 })).rejects.toMatchObject({ status: 400 });
    await expect(previewQuote(db, sourcer, { priceCny: "10", qty: 1, weightKg: null })).rejects.toMatchObject({ code: "weight_required" });
    await expect(previewQuote(db, alice, { priceCny: "10", qty: 1, weightKg: 1 })).rejects.toMatchObject({ status: 403 });
  });
});

describe("publishing and withdrawing", () => {
  it("publishes all drafts, moves the request to offered and tells the customer without internal fields", async () => {
    const request = await takenRequest();
    await createOffer(db, sourcer, request.id, offerInput());
    await createOffer(db, sourcer, request.id, offerInput({ title: "Колодки аналог", kind: "aftermarket", priceCny: "60" }));
    const result = await publishOffers(db, sourcer, request.id, request.version);
    expect(result).toMatchObject({ status: "offered", published: 2, version: request.version + 1 });
    expect(notified("request_offered")).toBe(1);
    expect(info.mock.calls.some(([line]) => String(line).includes("Мы нашли 2 варианта"))).toBe(true);

    const customer = await getRequestForCustomer(db, alice, request.id);
    expect(customer.request.status).toBe("offered");
    expect(customer.offers.map((o) => o.title)).toEqual(["Колодки передние BYD", "Колодки аналог"]);
    expect(customer.messages.at(-1)?.body).toBe("Подборщик прислал варианты: 2");
    const payload = JSON.stringify(customer);
    for (const value of INTERNAL_VALUES) expect(payload).not.toContain(value);
    for (const key of ["priceCny", "costKzt", "supplierName", "supplierUrl", "internalNote"]) expect(payload).not.toContain(key);

    // More offers later keep the request offered.
    await createOffer(db, sourcer, request.id, offerInput({ title: "Колодки б/у", kind: "used", condition: "Хорошее" }));
    expect(await publishOffers(db, sourcer, request.id, result.version)).toMatchObject({ status: "offered", published: 1 });
    expect(info.mock.calls.some(([line]) => String(line).includes("Мы нашли 3 варианта"))).toBe(true);
  });

  it("refuses without drafts, with a stale version or an expired draft, and before the request is taken", async () => {
    const request = await takenRequest();
    await expect(publishOffers(db, sourcer, request.id, request.version)).rejects.toMatchObject({ status: 400, code: "no_drafts" });
    await createOffer(db, sourcer, request.id, offerInput(), { now: new Date(Date.now() - 3 * 24 * 3600 * 1000) });
    await expect(publishOffers(db, sourcer, request.id, request.version)).rejects.toMatchObject({ status: 400, code: "draft_expired" });
    await expect(publishOffers(db, sourcer, request.id, request.version - 1)).rejects.toMatchObject({ status: 409, message: CONFLICT_MESSAGE });
    expect((await reload(request.id)).status).toBe("searching");
    await expect(publishOffers(db, other, request.id, request.version)).rejects.toMatchObject({ status: 403 });
    await expect(publishOffers(db, alice, request.id, request.version)).rejects.toMatchObject({ status: 403 });

    const fresh = await newRequest(bob);
    await createOffer(db, sourcer, fresh.id, offerInput());
    await expect(publishOffers(db, sourcer, fresh.id, fresh.version)).rejects.toMatchObject({ status: 400, code: "invalid_transition" });
    expect(notified("request_offered")).toBe(0);
  });

  it("withdraws a published offer; the last one sends the request back to the search", async () => {
    const request = await takenRequest();
    const { offer: a } = await createOffer(db, sourcer, request.id, offerInput());
    const { offer: b } = await createOffer(db, sourcer, request.id, offerInput({ title: "Аналог", kind: "aftermarket" }));
    const offered = await publishOffers(db, sourcer, request.id, request.version);

    await expect(withdrawOffer(db, other, a.id)).rejects.toMatchObject({ status: 403 });
    await expect(withdrawOffer(db, alice, a.id)).rejects.toMatchObject({ status: 403 });
    const first = await withdrawOffer(db, sourcer, a.id);
    expect(first).toMatchObject({ offerStatus: "withdrawn", request: { status: "offered", version: offered.version } });
    await expect(withdrawOffer(db, sourcer, a.id)).rejects.toMatchObject({ status: 409 });
    const customer = await getRequestForCustomer(db, alice, request.id);
    expect(customer.offers.map((o) => o.id)).toEqual([b.id]);

    const last = await withdrawOffer(db, sourcer, b.id);
    expect(last.request).toMatchObject({ status: "searching", version: offered.version + 1 });
    expect((await getRequestForCustomer(db, alice, request.id)).messages.at(-1)?.body).toContain("Подборщик ищет другие варианты");
  });

  it("cannot withdraw what the customer has accepted", async () => {
    const request = await takenRequest();
    const { offer } = await createOffer(db, sourcer, request.id, offerInput());
    await expect(withdrawOffer(db, sourcer, offer.id)).rejects.toMatchObject({ status: 409 });
    await publishOffers(db, sourcer, request.id, request.version);
    await acceptOffer(db, alice, offer.id);
    await expect(withdrawOffer(db, sourcer, offer.id)).rejects.toMatchObject({ status: 409, message: expect.stringContaining("уже выбрал") });
  });
});

describe("sourcer API routes", () => {
  afterEach(() => {
    routeState.db = null;
    routeState.actor = null;
  });

  const call = async (handler: (request: Request, context: never) => Promise<Response>, url: string, init: RequestInit = {}, id?: string) => {
    const request = new Request(`http://localhost${url}`, { ...init, headers: init.body ? { "content-type": "application/json" } : undefined });
    const response = await handler(request, (id ? { params: Promise.resolve({ id }) } : undefined) as never);
    return { status: response.status, body: await response.json() };
  };
  const patch = (body: unknown): RequestInit => ({ method: "PATCH", body: JSON.stringify(body) });
  const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

  it("runs a request from the queue to published offers", async () => {
    routeState.db = db;
    routeState.actor = sourcer;
    const queue = await import("@/app/api/sourcer/queue/route");
    const one = await import("@/app/api/sourcer/requests/[id]/route");
    const newOffer = await import("@/app/api/sourcer/requests/[id]/offers/route");
    const offer = await import("@/app/api/sourcer/offers/[id]/route");
    const quote = await import("@/app/api/sourcer/quote/route");
    const request = await newRequest();

    const listed = await call(queue.GET, "/api/sourcer/queue?view=new");
    expect(listed).toMatchObject({ status: 200, body: { view: "new", counts: { new: 1 } } });
    expect(listed.body.items.map((i: { id: string }) => i.id)).toEqual([request.id]);
    expect((await call(queue.GET, "/api/sourcer/queue?view=zzz")).status).toBe(400);

    const taken = await call(one.PATCH, "", patch({ action: "take", version: 1 }), request.id);
    expect(taken).toMatchObject({ status: 200, body: { request: { status: "searching", version: 2 } } });
    expect(await call(one.PATCH, "", patch({ action: "status", status: "closed", version: 1 }), request.id)).toMatchObject({
      status: 409,
      body: { error: CONFLICT_MESSAGE, code: "conflict" },
    });
    expect(await call(one.PATCH, "", patch({ action: "note", body: "Внутреннее" }), request.id)).toMatchObject({ status: 200 });
    expect(await call(one.PATCH, "", patch({ action: "message", body: "Ищем" }), request.id)).toMatchObject({ status: 200 });
    expect(await call(one.PATCH, "", patch({ action: "dance" }), request.id)).toMatchObject({ status: 400, body: { error: "Неизвестное действие" } });

    const preview = await call(quote.POST, "/api/sourcer/quote", post({ priceCny: "120", qty: 1, weightKg: 1.5 }));
    expect(preview).toMatchObject({ status: 200, body: { quote: { priceKzt: expect.any(Number), cnyRate: DEFAULT_PRICING.cnyRate } } });

    const created = await call(newOffer.POST, "", post(offerInput()), request.id);
    expect(created).toMatchObject({ status: 201, body: { offer: { status: "draft", priceCny: "120.00" } } });
    const offerId = created.body.offer.id as string;
    expect(await call(newOffer.POST, "", post({ ...offerInput(), supplierUrl: "javascript:x" }), request.id)).toMatchObject({ status: 400 });
    const edited = await call(offer.PATCH, "", patch({ ...offerInput(), title: "Колодки оригинал" }), offerId);
    expect(edited).toMatchObject({ status: 200, body: { offer: { title: "Колодки оригинал" } } });

    const read = await call(one.GET, "", {}, request.id);
    expect(read).toMatchObject({ status: 200, body: { request: { version: 2 }, vehicle: { vin: FIXTURE_VINS.bydSongPlus } } });
    expect(read.body.messages.some((m: { internal: boolean }) => m.internal)).toBe(true);

    const published = await call(one.PATCH, "", patch({ action: "publish", version: 2 }), request.id);
    expect(published).toMatchObject({ status: 200, body: { request: { status: "offered", published: 1 } } });
    expect(await call(offer.PATCH, "", patch({ action: "withdraw" }), offerId)).toMatchObject({ status: 200, body: { request: { status: "searching" } } });
    const { offer: draft } = await createOffer(db, sourcer, request.id, offerInput());
    expect(await call(offer.DELETE, "", { method: "DELETE" }, draft.id)).toMatchObject({ status: 200, body: { ok: true } });
  });

  it("refuses customers and anonymous visitors", async () => {
    routeState.db = db;
    const queue = await import("@/app/api/sourcer/queue/route");
    const one = await import("@/app/api/sourcer/requests/[id]/route");
    const newOffer = await import("@/app/api/sourcer/requests/[id]/offers/route");
    const quote = await import("@/app/api/sourcer/quote/route");
    const request = await newRequest();

    routeState.actor = alice;
    expect((await call(queue.GET, "/api/sourcer/queue")).status).toBe(403);
    expect((await call(one.GET, "", {}, request.id)).status).toBe(403);
    expect((await call(one.PATCH, "", patch({ action: "take" }), request.id)).status).toBe(403);
    expect((await call(newOffer.POST, "", post(offerInput()), request.id)).status).toBe(403);
    expect((await call(quote.POST, "/api/sourcer/quote", post({ priceCny: "1", qty: 1, weightKg: 1 }))).status).toBe(403);

    routeState.actor = null;
    expect(await call(queue.GET, "/api/sourcer/queue")).toMatchObject({ status: 401, body: { code: "unauthorized" } });
    expect((await call(one.GET, "", {}, request.id)).status).toBe(401);
    expect((await reload(request.id)).assignedTo).toBeNull();
    expect(await db.select().from(requestMessages).where(eq(requestMessages.internal, true))).toHaveLength(0);
    expect((await db.select().from(users)).length).toBeGreaterThan(0);
  });
});

const CANDIDATES = [
  { id: "c1", brand: "BYD", model: "Song Plus", year: "2023", version: "110 km", description: "", engine: "", fuel: "", drive: "", epcId: "1", image: null },
  { id: "c2", brand: "BYD", model: "Song Plus", year: "2023", version: "150 km", description: "", engine: "", fuel: "", drive: "", epcId: "1", image: null },
];
const DAY = 24 * 3600 * 1000;

describe("stale prices", () => {
  it("re-saving an expired draft after a rate change recomputes the cost instead of only moving the date", async () => {
    const t0 = new Date("2026-10-01T10:00:00Z");
    const request = await takenRequest();
    const { offer } = await createOffer(db, sourcer, request.id, offerInput({ priceCny: "120", weightKg: 1.5 }), { now: t0 });
    const doubled = { ...DEFAULT_PRICING, cnyRate: DEFAULT_PRICING.cnyRate * 2 };
    await savePricingSettings(db, doubled, new Date(t0.getTime() + DAY));
    const t1 = new Date(t0.getTime() + 7 * DAY);
    await expect(publishOffers(db, sourcer, request.id, request.version, { now: t1 })).rejects.toMatchObject({ code: "draft_expired" });

    // The editor shows that the saved cost cannot be reused.
    expect((await getRequestForStaff(db, sourcer, request.id, { now: t1 })).offers[0].costReusable).toBe(false);
    // Without a weight there is nothing to recompute from: refused, not saved at the old rate.
    await expect(updateOffer(db, sourcer, offer.id, offerInput({ weightKg: null, priceKzt: offer.priceKzt }), { now: t1 })).rejects.toMatchObject({
      code: "weight_required",
    });
    // The old price is below the cost at the new rate.
    await expect(updateOffer(db, sourcer, offer.id, offerInput({ weightKg: 1.5, priceKzt: offer.priceKzt }), { now: t1 })).rejects.toMatchObject({
      code: "below_cost",
    });
    const fresh = computeQuote({ ...doubled, priceCny: "120", qty: 1, weightKg: 1.5 });
    const saved = await updateOffer(db, sourcer, offer.id, offerInput({ weightKg: 1.5 }), { now: t1 });
    expect(saved.offer).toMatchObject({ costKzt: fresh.costKzt, priceKzt: fresh.priceKzt, costReusable: true });
    expect(fresh.costKzt).toBeGreaterThan(offer.costKzt!);
    expect(await publishOffers(db, sourcer, request.id, request.version, { now: t1 })).toMatchObject({ published: 1 });
  });

  it("asks for the weight again when the pricing settings changed after a still valid draft was saved", async () => {
    const t0 = new Date(Date.now() - 3600 * 1000);
    const request = await takenRequest();
    const { offer } = await createOffer(db, sourcer, request.id, offerInput(), { now: t0 });
    await savePricingSettings(db, { ...DEFAULT_PRICING, perKgKzt: 2500 }, new Date(t0.getTime() + 60_000));
    await expect(updateOffer(db, sourcer, offer.id, offerInput({ weightKg: null }))).rejects.toMatchObject({ code: "weight_required" });
  });

  it("does not count expired offers as something to choose from", async () => {
    const t0 = new Date(Date.now() - 3 * DAY);
    const request = await takenRequest();
    await createOffer(db, sourcer, request.id, offerInput({ validDays: 1 }), { now: t0 });
    const offered = await publishOffers(db, sourcer, request.id, request.version, { now: t0 });
    // Two days later the price is no longer binding.
    const [item] = await listQueue(db, sourcer, { view: "offered" });
    expect(item).toMatchObject({ id: request.id, offerCount: 1, expiredCount: 1 });
    expect((await listMyRequests(db, alice))[0].offerCount).toBe(0);
    const searching = await setStatus(db, sourcer, request.id, "searching", offered.version);
    info.mockClear();
    await expect(setStatus(db, sourcer, request.id, "offered", searching.version)).rejects.toMatchObject({ code: "no_offers" });
    expect(notified("request_offered")).toBe(0);
  });
});

describe("«Подходит по VIN»", () => {
  it("needs an OE number", async () => {
    const request = await takenRequest();
    for (const oe of [null, "", "   "])
      await expect(createOffer(db, sourcer, request.id, offerInput({ oe, fitment: "vin_confirmed" }))).rejects.toMatchObject({
        status: 400,
        code: "fitment_needs_oe",
      });
  });

  it("is refused when the VIN catalog does not open for the car", async () => {
    for (const vehicle of [
      { vin: FIXTURE_VINS.liAutoL6, brand: "Li Auto", epc: "lixiang", epcId: "0" },
      { vin: FIXTURE_VINS.zeekr001, brand: "Zeekr", decodeStatus: "unsupported" as const, epc: null },
      { epc: null },
    ]) {
      const request = await takenRequest(bob, { vehicle });
      expect((await getRequestForStaff(db, sourcer, request.id)).vinConfirmable).toBe(false);
      await expect(createOffer(db, sourcer, request.id, offerInput({ fitment: "vin_confirmed" }))).rejects.toMatchObject({
        code: "fitment_not_confirmable",
      });
    }
  });

  it("is checked again when publishing: the owner may have cleared their trim", async () => {
    const request = await takenRequest(alice, { vehicle: { decodeStatus: "ambiguous", trim: null, candidates: CANDIDATES, selectedCandidateId: "c2" } });
    await createOffer(db, sourcer, request.id, offerInput({ fitment: "vin_confirmed" }));
    await db.update(vehicles).set({ selectedCandidateId: null }).where(eq(vehicles.id, request.vehicleId!));
    await expect(publishOffers(db, sourcer, request.id, request.version)).rejects.toMatchObject({ code: "fitment_not_confirmable" });
    expect((await reload(request.id)).status).toBe("searching");
    await db.update(vehicles).set({ selectedCandidateId: "c1" }).where(eq(vehicles.id, request.vehicleId!));
    expect(await publishOffers(db, sourcer, request.id, request.version)).toMatchObject({ published: 1 });
  });
});

describe("requests nobody leads", () => {
  it("an answer to a released clarification goes to the new queue and reaches every staff member", async () => {
    const request = await takenRequest();
    const asked = await askClarification(db, sourcer, request.id, "Левая или правая?", request.version);
    const released = await releaseRequest(db, sourcer, request.id, asked.version);
    expect(released).toMatchObject({ status: "clarification", assignedTo: null });
    info.mockClear();
    expect((await postCustomerMessage(db, alice, request.id, { body: "Левая" })).status).toBe("new");
    expect(await reload(request.id)).toMatchObject({ status: "new", assignedTo: null });
    expect((await listQueue(db, other, { view: "new" })).map((r) => r.id)).toEqual([request.id]);
    expect((await queueCounts(db, other)).new).toBe(1);
    // sourcer, other and admin: nobody leads it, so everyone hears.
    expect(notified("staff_customer_reply")).toBe(3);
  });

  it("keeps a search without a sourcer in the new queue, and starting the search takes it", async () => {
    const request = await newRequest();
    await db.update(partRequests).set({ status: "clarification" }).where(eq(partRequests.id, request.id));
    const searching = await setStatus(db, sourcer, request.id, "searching", request.version);
    expect(searching).toMatchObject({ status: "searching", assignedTo: sourcer.id });
    await db.update(partRequests).set({ assignedTo: null }).where(eq(partRequests.id, request.id));
    expect((await listQueue(db, other, { view: "new" })).map((r) => r.id)).toEqual([request.id]);
    expect((await queueCounts(db, other)).new).toBe(1);
  });

  it("a demoted sourcer's open requests go back to the queue, and their notifications stop", async () => {
    const searching = await takenRequest();
    const offered = await takenRequest(bob);
    await createOffer(db, sourcer, offered.id, offerInput());
    await publishOffers(db, sourcer, offered.id, offered.version);
    await setUserRole(db, admin, sourcer.id, "customer");

    expect(await reload(searching.id)).toMatchObject({ status: "new", assignedTo: null, version: searching.version + 1 });
    expect(await reload(offered.id)).toMatchObject({ status: "offered", assignedTo: null });
    expect((await listQueue(db, other, { view: "new" })).map((r) => r.id)).toEqual([searching.id]);
    const staffView = await getRequestForStaff(db, other, searching.id);
    expect(staffView.messages.at(-1)).toMatchObject({ internal: true, body: expect.stringContaining("больше не в команде") });
    expect((await getRequestForCustomer(db, alice, searching.id)).messages.some((m) => m.body.includes("больше не в команде"))).toBe(false);
    // Another sourcer can take it now.
    expect(await takeRequest(db, other, searching.id)).toMatchObject({ assignedTo: other.id });

    // A message on a request still pointing at the former sourcer goes to the team, not to them.
    await db.update(partRequests).set({ assignedTo: sourcer.id }).where(eq(partRequests.id, offered.id));
    info.mockClear();
    await postCustomerMessage(db, bob, offered.id, { body: "Мой адрес: ул. Абая 1" });
    const lines = info.mock.calls.map((c) => String(c[0])).filter((l) => l.includes("notification staff_customer_reply"));
    expect(lines).toHaveLength(2);
    expect(lines.some((l) => l.includes(sourcer.phone.slice(-4)))).toBe(false);
  });
});

describe("staff cancel and close", () => {
  it("takes the offers off the table and tells the customer why", async () => {
    const request = await takenRequest();
    await createOffer(db, sourcer, request.id, offerInput());
    const offered = await publishOffers(db, sourcer, request.id, request.version);
    const searching = await setStatus(db, sourcer, request.id, "searching", offered.version);
    info.mockClear();
    await setStatus(db, sourcer, request.id, "cancelled", searching.version, { reason: "Детали нет в наличии" });
    expect((await db.select().from(offers).where(eq(offers.requestId, request.id))).map((o) => o.status)).toEqual(["rejected"]);
    const customer = await getRequestForCustomer(db, alice, request.id);
    expect(customer.offers.map((o) => o.status)).toEqual(["rejected"]);
    expect((await listMyRequests(db, alice))[0].offerCount).toBe(0);
    expect(notified("request_cancelled")).toBe(1);
    expect(info.mock.calls.some(([line]) => String(line).includes("Причина: Детали нет в наличии"))).toBe(true);

    const other = await takenRequest(bob);
    await createOffer(db, sourcer, other.id, offerInput());
    const shown = await publishOffers(db, sourcer, other.id, other.version);
    await setStatus(db, sourcer, other.id, "closed", shown.version);
    expect((await db.select().from(offers).where(eq(offers.requestId, other.id))).map((o) => o.status)).toEqual(["rejected"]);
    expect(notified("request_closed")).toBe(1);
  });

  it("tells the sourcer when the customer cancels", async () => {
    const request = await takenRequest();
    info.mockClear();
    await cancelRequest(db, alice, request.id, request.version);
    const lines = info.mock.calls.map((c) => String(c[0])).filter((l) => l.includes("notification staff_request_cancelled"));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(sourcer.phone.slice(-4));
  });
});
