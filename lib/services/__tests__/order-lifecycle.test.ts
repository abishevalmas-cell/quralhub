import { desc, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { ORDER_STATUS } from "@/components/orders/labels";
import type { Actor } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import { fitments, offers, orderEvents, orders, ORDER_STATUSES, partRequests, requestMessages, vehicles, type OrderStatus } from "@/lib/db/schema";
import { FIXTURE_VINS } from "@/lib/providers";
import { makeUser, testDb } from "@/tests/helpers/db";
import {
  acceptOffer,
  advanceOrder,
  confirmFit,
  getOrderForCustomer,
  getOrderForStaff,
  listOrdersForStaff,
  ORDER_STATUS_LABEL,
  ORDER_TRANSITIONS,
  staffOrderCounts,
} from "../orders";
import { createRequest, getRequestForCustomer, postCustomerMessage } from "../requests";
import { getRequestForStaff, sendCustomerMessage } from "../sourcing";

// Route handlers read the actor from the session cookie and the database from getDb(); both are swapped here.
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
const SECRETS = ["priceCny", "costKzt", "supplierName", "supplierUrl", "internalNote", "Shenzhen", "do not show", "actorId"];

let db: Db;
let alice: Actor;
let bob: Actor;
let sourcer: Actor;
let sourcer2: Actor;
let admin: Actor;
let info: MockInstance;

beforeEach(async () => {
  info = vi.spyOn(console, "info").mockImplementation(() => {});
  db = await testDb();
  alice = await makeUser(db, "customer", { name: "Алия" });
  bob = await makeUser(db, "customer");
  sourcer = await makeUser(db, "sourcer", { name: "Ли" });
  sourcer2 = await makeUser(db, "sourcer");
  admin = await makeUser(db, "admin");
});

afterEach(() => {
  vi.restoreAllMocks();
  routeState.db = null;
  routeState.actor = null;
});

// A clock that only moves forward and runs ahead of real time, so history order never depends on two writes
// landing in the same millisecond.
let clock = 0;
const tick = () => new Date(Date.now() + 60_000 + ++clock * 1000);
const advance = (actor: Actor, orderId: string, input: Parameters<typeof advanceOrder>[3]) =>
  advanceOrder(db, actor, orderId, input, { now: tick() });
const fitAnswer = (actor: Actor, orderId: string, result: "fits" | "not_fits", comment?: string) =>
  confirmFit(db, actor, orderId, result, comment, { now: tick() });
const lastMessage = async (requestId: string) =>
  (await db.select().from(requestMessages).where(eq(requestMessages.requestId, requestId)).orderBy(desc(requestMessages.createdAt)).limit(1))[0];

const logged = () => info.mock.calls.map((c) => String(c[0])).join("\n---\n");

// An order of `owner` for brake pads on a BYD Song Plus, request assigned to `sourcer`.
async function placedOrder(owner: Actor = alice, offerExtra: Partial<typeof offers.$inferInsert> = {}, assignedTo: string | null = sourcer.id) {
  const [car] = await db
    .insert(vehicles)
    .values({
      ownerId: owner.id,
      vin: FIXTURE_VINS.bydSongPlus,
      brand: "BYD",
      model: "Song Plus",
      year: 2023,
      trim: "DM-i Flagship",
      decodeStatus: "decoded",
    })
    .returning();
  const { id: requestId } = await createRequest(db, owner, { vehicleId: car.id, title: "Колодки передние", partTypeId: "brake-pads", axis: "front" });
  await db.update(partRequests).set({ status: "offered", assignedTo, version: 2 }).where(eq(partRequests.id, requestId));
  const [offer] = await db
    .insert(offers)
    .values({
      requestId,
      createdBy: sourcer.id,
      status: "published",
      title: "Колодки передние BYD",
      oe: "10086115-00",
      manufacturer: "BYD",
      kind: "original",
      priceKzt: 186000,
      leadDaysMin: 12,
      leadDaysMax: 18,
      fitment: "vin_confirmed",
      priceCny: "980.00",
      costKzt: 140000,
      supplierName: "Shenzhen Supplier",
      supplierUrl: "https://example.com/item/2",
      internalNote: "do not show",
      ...offerExtra,
    })
    .returning();
  const order = await acceptOffer(db, owner, offer.id);
  return { requestId, offerId: offer.id, orderId: order.id, number: order.number };
}

const versionOf = async (orderId: string) => (await db.select().from(orders).where(eq(orders.id, orderId)))[0].version;

async function moveTo(actor: Actor, orderId: string, path: OrderStatus[], note?: string) {
  for (const status of path) await advance(actor, orderId, { status, version: await versionOf(orderId), note });
}

const TO_CITY: OrderStatus[] = ["paid", "purchased", "consolidation", "in_transit", "customs", "in_city"];
const TO_DELIVERED: OrderStatus[] = [...TO_CITY, "delivered"];

describe("order status labels", () => {
  it("match the labels customers see", () => {
    for (const status of ORDER_STATUSES) expect(ORDER_STATUS_LABEL[status]).toBe(ORDER_STATUS[status].label);
  });
});

describe("advanceOrder", () => {
  it("moves an order through every stage, notifies the customer and closes the request on delivery", async () => {
    const { orderId, requestId, number } = await placedOrder();
    const first = await advance(sourcer, orderId, { status: "paid", version: 1, note: "  Оплата получена\u0007, спасибо  " });
    expect(first).toMatchObject({ id: orderId, number, status: "paid", version: 2 });
    await moveTo(sourcer, orderId, ["purchased", "consolidation", "in_transit"]);
    await advance(sourcer, orderId, { status: "customs", version: 5, note: "Трек CN123456789" });
    await moveTo(sourcer, orderId, ["in_city", "delivered"]);

    const [row] = await db.select().from(orders).where(eq(orders.id, orderId));
    expect(row).toMatchObject({ status: "delivered", version: 8, fitFeedback: null });
    const events = await db.select().from(orderEvents).where(eq(orderEvents.orderId, orderId));
    expect(events.map((e) => e.status).sort()).toEqual(["awaiting_payment", ...TO_DELIVERED].sort());
    expect(events.find((e) => e.status === "paid")).toMatchObject({ actorId: sourcer.id, note: "Оплата получена, спасибо" });

    const [request] = await db.select().from(partRequests).where(eq(partRequests.id, requestId));
    expect(request.status).toBe("closed");
    const messages = await db.select().from(requestMessages).where(eq(requestMessages.requestId, requestId));
    expect(messages.some((m) => m.kind === "system" && m.body === `Заказ №${number} выдан. Заявка закрыта.`)).toBe(true);

    const log = logged();
    expect(log).toContain("notification order_status");
    for (const status of TO_DELIVERED) expect(log).toContain(`Статус: ${ORDER_STATUS_LABEL[status]}`);

    // The customer sees the notes in the history, but not who on the team wrote them.
    const view = await getOrderForCustomer(db, alice, orderId);
    expect(view.order.status).toBe("delivered");
    expect(view.events.map((e) => e.status)).toEqual(["awaiting_payment", ...TO_DELIVERED]);
    expect(view.events.find((e) => e.status === "customs")?.note).toBe("Трек CN123456789");
    const serialized = JSON.stringify(view);
    for (const secret of SECRETS) expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain(sourcer.id);
  });

  it("takes the shortcut past customs", async () => {
    const { orderId } = await placedOrder();
    await moveTo(sourcer, orderId, ["paid", "purchased", "consolidation", "in_transit", "in_city"]);
    expect((await db.select().from(orders).where(eq(orders.id, orderId)))[0].status).toBe("in_city");
  });

  it("allows only the listed transitions", async () => {
    expect(ORDER_TRANSITIONS).toEqual({
      awaiting_payment: ["paid", "cancelled"],
      paid: ["purchased", "cancelled"],
      purchased: ["consolidation"],
      consolidation: ["in_transit"],
      in_transit: ["customs", "in_city"],
      customs: ["in_city"],
      in_city: ["delivered"],
      delivered: ["returned"],
      cancelled: [],
      returned: [],
    });
    const { orderId } = await placedOrder();
    for (const status of ["purchased", "delivered", "awaiting_payment", "returned", "in_city"] as const)
      await expect(advance(sourcer, orderId, { status, version: 1 })).rejects.toMatchObject({ status: 400 });
    await expect(advance(sourcer, orderId, { status: "lost" as never, version: 1 })).rejects.toMatchObject({ status: 400 });
    await expect(advance(sourcer, orderId, { status: "paid", version: "1" as never })).rejects.toMatchObject({ status: 400 });
    await expect(advance(sourcer, orderId, { status: "paid", version: 1, note: "x".repeat(501) })).rejects.toMatchObject({
      status: 400,
      message: "Комментарий — до 500 символов",
    });

    await moveTo(sourcer, orderId, ["paid", "purchased"]);
    await expect(advance(sourcer, orderId, { status: "cancelled", version: 3, note: "Поздно" })).rejects.toMatchObject({ status: 400 });
    await moveTo(sourcer, orderId, ["consolidation", "in_transit", "in_city", "delivered"]);
    await expect(advance(sourcer, orderId, { status: "returned", version: 7 })).rejects.toMatchObject({
      status: 400,
      message: "Укажите причину возврата: клиент увидит её в истории заказа",
    });
    await advance(sourcer, orderId, { status: "returned", version: 7, note: "Клиент вернул деталь" });
    for (const status of ORDER_STATUSES)
      await expect(advance(sourcer, orderId, { status, version: 8, note: "x" })).rejects.toMatchObject({ status: 400 });
    expect((await db.select().from(orderEvents).where(eq(orderEvents.orderId, orderId))).length).toBe(8);
  });

  it("checks the version and lets one of two concurrent moves win", async () => {
    const { orderId } = await placedOrder();
    await expect(advance(sourcer, orderId, { status: "paid", version: 2 })).rejects.toMatchObject({ status: 409 });
    const results = await Promise.allSettled([
      advance(sourcer, orderId, { status: "paid", version: 1 }),
      advance(sourcer, orderId, { status: "cancelled", version: 1, note: "Клиент передумал" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((results.find((r) => r.status === "rejected") as PromiseRejectedResult).reason).toMatchObject({ status: 409 });
    const [row] = await db.select().from(orders).where(eq(orders.id, orderId));
    expect(row.version).toBe(2);
    expect(await db.select().from(orderEvents).where(eq(orderEvents.orderId, orderId))).toHaveLength(2);
  });

  it("cancels: the offer is withdrawn and the request goes back to the queue for a new offer", async () => {
    const { orderId, offerId, requestId, number } = await placedOrder();
    await expect(advance(sourcer, orderId, { status: "cancelled", version: 1, note: "   " })).rejects.toMatchObject({
      status: 400,
      message: "Укажите причину отмены: клиент увидит её в истории заказа",
    });
    await advance(sourcer, orderId, { status: "paid", version: 1 });
    await advance(sourcer, orderId, { status: "cancelled", version: 2, note: "Поставщик снял деталь с продажи" });

    expect((await db.select().from(orders).where(eq(orders.id, orderId)))[0]).toMatchObject({ status: "cancelled", version: 3 });
    expect((await db.select().from(offers).where(eq(offers.id, offerId)))[0].status).toBe("withdrawn");
    const [request] = await db.select().from(partRequests).where(eq(partRequests.id, requestId));
    expect(request.status).toBe("searching");
    const view = await getRequestForCustomer(db, alice, requestId);
    expect(view.messages.at(-1)?.body).toBe(
      `Заказ №${number} отменён.\nПричина: Поставщик снял деталь с продажи\nПодборщик продолжит поиск и пришлёт новые варианты.`,
    );
    expect(logged()).toContain("Статус: Отменён");

    // The sourcer offers something else and the customer can order again.
    await db.update(partRequests).set({ status: "offered" }).where(eq(partRequests.id, requestId));
    const [again] = await db
      .insert(offers)
      .values({ requestId, createdBy: sourcer.id, status: "published", title: "Колодки аналог", kind: "aftermarket", priceKzt: 64000, leadDaysMin: 10, leadDaysMax: 14 })
      .returning();
    const second = await acceptOffer(db, alice, again.id);
    expect(second.number).toBeGreaterThan(number);
    expect((await getRequestForCustomer(db, alice, requestId)).order).toMatchObject({ id: second.id, status: "awaiting_payment" });
  });

  it("is for staff only, and a sourcer can move only orders of requests they lead", async () => {
    const { orderId } = await placedOrder();
    for (const who of [alice, bob])
      await expect(advance(who, orderId, { status: "paid", version: 1 })).rejects.toMatchObject({ status: 403 });
    await expect(advance(sourcer2, orderId, { status: "paid", version: 1 })).rejects.toMatchObject({
      status: 403,
      message: "Заявку ведёт другой подборщик",
    });
    await expect(advance(sourcer, OTHER_UUID, { status: "paid", version: 1 })).rejects.toMatchObject({ status: 404 });
    await expect(advance(sourcer, "nope", { status: "paid", version: 1 })).rejects.toMatchObject({ status: 404 });
    expect((await db.select().from(orders).where(eq(orders.id, orderId)))[0]).toMatchObject({ status: "awaiting_payment", version: 1 });

    await advance(admin, orderId, { status: "paid", version: 1 });
    await advance(sourcer, orderId, { status: "purchased", version: 2 });

    // Nobody leads this one: any sourcer may move it.
    const free = await placedOrder(bob, {}, null);
    await advance(sourcer2, free.orderId, { status: "paid", version: 1 });
  });
});

describe("staff order views", () => {
  it("lists with filters and counts, for staff only", async () => {
    const a = await placedOrder(alice);
    const b = await placedOrder(bob);
    await moveTo(sourcer, b.orderId, TO_DELIVERED);

    const all = await listOrdersForStaff(db, sourcer);
    expect(all.map((o) => o.id).sort()).toEqual([a.orderId, b.orderId].sort());
    expect(all.find((o) => o.id === a.orderId)).toMatchObject({
      number: a.number,
      status: "awaiting_payment",
      totalKzt: 186000,
      offerTitle: "Колодки передние BYD",
      oe: "10086115-00",
      requestId: a.requestId,
      requestTitle: "Колодки передние",
      vehicleLabel: "BYD Song Plus 2023",
      customerName: "Алия",
      customerPhone: `+7••••••${alice.phone.slice(-4)}`,
      phoneMasked: true,
      assignedTo: sourcer.id,
      assignedToMe: true,
    });
    const serialized = JSON.stringify(all);
    expect(serialized).not.toContain(FIXTURE_VINS.bydSongPlus);
    expect(serialized).not.toContain("vehicleSnapshot");

    expect((await listOrdersForStaff(db, sourcer, { status: "active" })).map((o) => o.id)).toEqual([a.orderId]);
    expect((await listOrdersForStaff(db, sourcer, { status: "delivered" })).map((o) => o.id)).toEqual([b.orderId]);
    expect(await listOrdersForStaff(db, sourcer, { status: "customs" })).toEqual([]);
    expect(await listOrdersForStaff(db, sourcer, { status: "all" })).toHaveLength(2);
    expect((await listOrdersForStaff(db, sourcer2))[0].assignedToMe).toBe(false);
    expect(await listOrdersForStaff(db, admin)).toHaveLength(2);
    await expect(listOrdersForStaff(db, sourcer, { status: "lost" })).rejects.toMatchObject({ status: 400 });

    const counts = await staffOrderCounts(db, sourcer);
    expect(counts).toMatchObject({ all: 2, active: 1 });
    expect(counts.byStatus).toMatchObject({ awaiting_payment: 1, delivered: 1, paid: 0 });

    for (const who of [alice, bob]) {
      await expect(listOrdersForStaff(db, who)).rejects.toMatchObject({ status: 403 });
      await expect(staffOrderCounts(db, who)).rejects.toMatchObject({ status: 403 });
    }
  });

  it("shows staff the purchase data, what the customer sees, the history and the fitment base", async () => {
    const { orderId, requestId } = await placedOrder();
    await advance(sourcer, orderId, { status: "paid", version: 1, note: "Оплата по Kaspi" });

    const view = await getOrderForStaff(db, sourcer2, orderId);
    expect(view.order).toMatchObject({ id: orderId, status: "paid", version: 2, fitFeedback: null });
    expect(view.offer).toMatchObject({ priceCny: "980.00", costKzt: 140000, supplierName: "Shenzhen Supplier", internalNote: "do not show" });
    const shown = JSON.stringify(view.customerOffer);
    for (const secret of SECRETS) expect(shown).not.toContain(secret);
    expect(view.request).toMatchObject({ id: requestId, partName: "Тормозные колодки", assignedTo: sourcer.id });
    expect(view.vehicle).toMatchObject({ vin: FIXTURE_VINS.bydSongPlus, label: "BYD Song Plus 2023", trim: "DM-i Flagship" });
    // Sourcers see the masked number, as on the request page; admins the full one and a number to dial.
    expect(view.customer).toMatchObject({ id: alice.id, name: "Алия", phone: `+7••••••${alice.phone.slice(-4)}`, phoneMasked: true, phoneDial: null });
    expect(JSON.stringify(view)).not.toContain(alice.phone);
    expect(JSON.stringify(await listOrdersForStaff(db, sourcer2))).not.toContain(alice.phone);
    expect((await getOrderForStaff(db, admin, orderId)).customer).toMatchObject({ phoneMasked: false, phoneDial: alice.phone });
    expect((await listOrdersForStaff(db, admin))[0]).toMatchObject({ phoneMasked: false, customerPhone: expect.stringContaining(alice.phone.slice(-2)) });
    expect(view.assignee).toEqual({ id: sourcer.id, name: "Ли" });
    expect(view.events.map((e) => [e.status, e.by, e.actorName])).toEqual([
      ["awaiting_payment", "customer", "Алия"],
      ["paid", "staff", "Ли"],
    ]);
    expect(view.next).toEqual(["purchased", "cancelled"]);
    expect(view.canEdit).toBe(false);
    expect((await getOrderForStaff(db, sourcer, orderId)).canEdit).toBe(true);
    expect((await getOrderForStaff(db, admin, orderId)).canEdit).toBe(true);
    expect(view.fitments).toEqual({ oe: { oe: "1008611500", fits: 0, notFits: 0, vehicles: [] }, vin: [] });

    for (const who of [alice, bob]) await expect(getOrderForStaff(db, who, orderId)).rejects.toMatchObject({ status: 403 });
    await expect(getOrderForStaff(db, sourcer, OTHER_UUID)).rejects.toMatchObject({ status: 404 });
    await expect(getOrderForStaff(db, sourcer, "nope")).rejects.toMatchObject({ status: 404 });
  });
});

describe("order links by number", () => {
  it("opens /orders/<number> from a notification for the owner only", async () => {
    const { orderId, number } = await placedOrder();
    expect((await getOrderForCustomer(db, alice, String(number))).order.id).toBe(orderId);
    expect((await getOrderForStaff(db, sourcer, String(number))).order.id).toBe(orderId);
    await expect(getOrderForCustomer(db, bob, String(number))).rejects.toMatchObject({ status: 404 });
    await expect(getOrderForCustomer(db, sourcer, String(number))).rejects.toMatchObject({ status: 404 });
    await expect(getOrderForStaff(db, alice, String(number))).rejects.toMatchObject({ status: 403 });
    for (const ref of ["0", "-1", "1.5", "99999999999", "2147483648", String(number + 1), ""])
      await expect(getOrderForCustomer(db, alice, ref)).rejects.toMatchObject({ status: 404 });
  });
});

describe("confirmFit", () => {
  it("records that the part fits once, after delivery, into the fitment base", async () => {
    const { orderId, requestId, number } = await placedOrder();
    await expect(confirmFit(db, alice, orderId, "fits")).rejects.toMatchObject({ status: 400 });
    await moveTo(sourcer, orderId, TO_DELIVERED);

    await expect(confirmFit(db, bob, orderId, "fits")).rejects.toMatchObject({ status: 404 });
    await expect(confirmFit(db, sourcer, orderId, "fits")).rejects.toMatchObject({ status: 404 });
    await expect(confirmFit(db, alice, OTHER_UUID, "fits")).rejects.toMatchObject({ status: 404 });
    await expect(confirmFit(db, alice, orderId, "maybe" as never)).rejects.toMatchObject({ status: 400 });
    await expect(confirmFit(db, alice, orderId, "fits", "x".repeat(1001))).rejects.toMatchObject({ status: 400 });
    expect(await db.select().from(fitments)).toHaveLength(0);

    const result = await fitAnswer(alice, orderId, "fits", "Встала без доработок");
    expect(result).toMatchObject({ fitFeedback: "fits" });
    expect(result.fitmentId).toBeTruthy();
    const [row] = await db.select().from(orders).where(eq(orders.id, orderId));
    expect(row).toMatchObject({ fitFeedback: "fits", version: 9, status: "delivered" });
    const rows = await db.select().from(fitments);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: result.fitmentId,
      vin: FIXTURE_VINS.bydSongPlus,
      brand: "BYD",
      model: "Song Plus",
      year: 2023,
      trim: "DM-i Flagship",
      oe: "1008611500",
      partTypeId: "brake-pads",
      source: "install_feedback",
      result: "fits",
      orderId,
      createdBy: alice.id,
    });
    expect(await lastMessage(requestId)).toMatchObject({
      kind: "system",
      internal: false,
      body: `Клиент подтвердил: деталь по заказу №${number} подошла.\nКомментарий: Встала без доработок`,
    });

    await expect(confirmFit(db, alice, orderId, "not_fits")).rejects.toMatchObject({ status: 409 });
    expect(await db.select().from(fitments)).toHaveLength(1);
    expect((await getOrderForCustomer(db, alice, orderId)).order.fitFeedback).toBe("fits");
    const staffView = await getOrderForStaff(db, sourcer, orderId);
    expect(staffView.fitments.oe).toEqual({ oe: "1008611500", fits: 1, notFits: 0, vehicles: [{ brand: "BYD", model: "Song Plus", year: 2023 }] });
    expect(staffView.fitments.vin).toMatchObject([{ oe: "1008611500", result: "fits", source: "install_feedback", orderId }]);
    expect(logged()).not.toContain("staff_order_issue");
    // The part fitted, so the closed request stays closed for messages.
    expect((await getRequestForCustomer(db, alice, requestId)).chatOpen).toBe(false);
    await expect(postCustomerMessage(db, alice, requestId, { body: "Спасибо" })).rejects.toMatchObject({ status: 400 });
  });

  it("turns a part that did not fit into a task for the team", async () => {
    const { orderId, requestId, number } = await placedOrder();
    await moveTo(sourcer, orderId, TO_DELIVERED);
    const staleVersion = await versionOf(orderId);
    info.mockClear();

    await fitAnswer(alice, orderId, "not_fits", "  Другой разъём\u0000  ");
    const [fit] = await db.select().from(fitments);
    expect(fit).toMatchObject({ result: "not_fits", oe: "1008611500", orderId });
    const view = await getRequestForCustomer(db, alice, requestId);
    // The return is arranged in the chat of the closed request.
    expect(view.request.status).toBe("closed");
    expect(view.chatOpen).toBe(true);
    expect((await getRequestForStaff(db, sourcer, requestId)).chatOpen).toBe(true);
    expect(view.messages.at(-1)?.body).toBe(
      `Клиент сообщил: деталь по заказу №${number} не подошла.\nКомментарий: Другой разъём\nПодборщик свяжется с клиентом и оформит возврат или замену.`,
    );
    const log = logged();
    expect(log).toContain("notification staff_order_issue");
    expect(log).toContain(`Не подошла деталь, заказ №${number}`);
    expect(log).toContain("Комментарий клиента: Другой разъём");
    // All staff get it, not only the sourcer who led the request.
    expect(info.mock.calls.filter((c) => String(c[0]).includes("staff_order_issue")).length).toBe(3);

    await postCustomerMessage(db, alice, requestId, { body: "Когда можно вернуть?" });
    await sendCustomerMessage(db, sourcer, requestId, "Завтра с 10 до 18");
    const bodies = (await getRequestForCustomer(db, alice, requestId)).messages.map((m) => [m.from, m.body]);
    expect(bodies).toEqual(expect.arrayContaining([["customer", "Когда можно вернуть?"], ["staff", "Завтра с 10 до 18"]]));
    await expect(postCustomerMessage(db, bob, requestId, { body: "Чужое" })).rejects.toMatchObject({ status: 404 });

    // The answer moved the version: a sourcer acting on an older page sees it first.
    await expect(advance(sourcer, orderId, { status: "returned", version: staleVersion, note: "Возврат" })).rejects.toMatchObject({ status: 409 });
    await advance(sourcer, orderId, { status: "returned", version: staleVersion + 1, note: "Возврат" });
    expect((await getOrderForStaff(db, sourcer, orderId)).order).toMatchObject({ status: "returned", fitFeedback: "not_fits" });
  });

  it("keeps the answer without a fitment row when the offer has no OE number, and not after a return", async () => {
    const noOe = await placedOrder(alice, { oe: null });
    await moveTo(sourcer, noOe.orderId, TO_DELIVERED);
    expect(await confirmFit(db, alice, noOe.orderId, "fits")).toEqual({ fitFeedback: "fits", fitmentId: null });
    expect(await db.select().from(fitments)).toHaveLength(0);
    expect((await db.select().from(orders).where(eq(orders.id, noOe.orderId)))[0].fitFeedback).toBe("fits");

    const returned = await placedOrder(bob);
    await moveTo(sourcer, returned.orderId, TO_DELIVERED);
    await advance(sourcer, returned.orderId, { status: "returned", version: await versionOf(returned.orderId), note: "Брак" });
    await expect(confirmFit(db, bob, returned.orderId, "not_fits")).rejects.toMatchObject({ status: 400 });
  });
});

describe("order lifecycle API routes", () => {
  const call = async (handler: (request: Request, context: never) => Promise<Response>, url: string, init: RequestInit = {}, id?: string) => {
    const request = new Request(`http://localhost${url}`, {
      ...init,
      headers: init.body ? { "content-type": "application/json" } : undefined,
    });
    const response = await handler(request, (id ? { params: Promise.resolve({ id }) } : undefined) as never);
    return { status: response.status, body: await response.json() };
  };

  it("lists, shows and moves orders for staff and takes fit feedback from the owner", async () => {
    routeState.db = db;
    const list = await import("@/app/api/sourcer/orders/route");
    const one = await import("@/app/api/sourcer/orders/[id]/route");
    const fit = await import("@/app/api/orders/[id]/fit/route");
    const { orderId } = await placedOrder();
    const patch = (body: unknown) =>
      call(one.PATCH, `/api/sourcer/orders/${orderId}`, { method: "PATCH", body: JSON.stringify(body) }, orderId);

    expect((await call(list.GET, "/api/sourcer/orders")).status).toBe(401);
    routeState.actor = alice;
    expect((await call(list.GET, "/api/sourcer/orders")).status).toBe(403);
    expect((await call(one.GET, `/api/sourcer/orders/${orderId}`, {}, orderId)).status).toBe(403);
    expect((await patch({ status: "paid", version: 1 })).status).toBe(403);

    routeState.actor = sourcer;
    const listed = await call(list.GET, "/api/sourcer/orders?status=awaiting_payment");
    expect(listed).toMatchObject({ status: 200, body: { counts: { all: 1, active: 1 } } });
    expect(listed.body.orders.map((o: { id: string }) => o.id)).toEqual([orderId]);
    expect((await call(list.GET, "/api/sourcer/orders?status=paid")).body.orders).toEqual([]);
    expect(await call(list.GET, "/api/sourcer/orders?status=bogus")).toMatchObject({ status: 400, body: { error: "Неизвестный статус заказа" } });

    const shown = await call(one.GET, `/api/sourcer/orders/${orderId}`, {}, orderId);
    expect(shown).toMatchObject({ status: 200, body: { order: { id: orderId, version: 1 }, next: ["paid", "cancelled"] } });

    expect(await patch({ status: "teleported", version: 1 })).toMatchObject({ status: 400, body: { error: "Выберите следующий статус заказа" } });
    expect(await patch({ status: "paid" })).toMatchObject({ status: 400, body: { error: "Обновите страницу и попробуйте ещё раз" } });
    expect(await patch({ status: "paid", version: 1, note: "Оплата получена" })).toMatchObject({
      status: 200,
      body: { order: { id: orderId, status: "paid", version: 2 } },
    });
    expect(await patch({ status: "purchased", version: 1 })).toMatchObject({ status: 409, body: { error: "Заказ изменился. Обновите страницу" } });
    routeState.actor = sourcer2;
    expect(await patch({ status: "purchased", version: 2 })).toMatchObject({ status: 403 });

    routeState.actor = sourcer;
    await moveTo(sourcer, orderId, ["purchased", "consolidation", "in_transit", "in_city", "delivered"]);

    const post = (body: unknown) =>
      call(fit.POST, `/api/orders/${orderId}/fit`, { method: "POST", body: JSON.stringify(body) }, orderId);
    expect((await post({ result: "fits" })).status).toBe(404);
    routeState.actor = bob;
    expect((await post({ result: "fits" })).status).toBe(404);
    routeState.actor = alice;
    expect(await post({ result: "perhaps" })).toMatchObject({ status: 400, body: { error: "Ответьте, подошла ли деталь" } });
    expect(await post({ result: "fits", comment: 5 })).toMatchObject({ status: 400 });
    expect(await post({ result: "not_fits", comment: "Не тот разъём" })).toMatchObject({ status: 200, body: { fitFeedback: "not_fits" } });
    expect(await post({ result: "fits" })).toMatchObject({ status: 409 });
    expect(await db.select().from(fitments)).toHaveLength(1);
  });
});
