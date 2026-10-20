import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import { attachments, offers, partRequests, requestMessages, users, vehicles } from "@/lib/db/schema";
import { FIXTURE_VINS } from "@/lib/providers";
import type { Storage, StoredObject } from "@/lib/storage";
import { makeUser, testDb } from "@/tests/helpers/db";
import {
  addAttachment,
  cancelRequest,
  createRequest,
  getAttachmentFile,
  getRequestForCustomer,
  listMyRequests,
  listVehicleOptions,
  DAILY_LIMITS,
  postCustomerMessage,
  RECEIVED_MESSAGE,
  requestDraftFromQuery,
} from "../requests";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 1, 2, 3, 4]);
const OTHER_UUID = "00000000-0000-4000-8000-000000000000";

function memoryStorage() {
  const objects = new Map<string, StoredObject>();
  const storage: Storage & { objects: Map<string, StoredObject> } = {
    objects,
    async put(key, bytes, mime) {
      objects.set(key, { bytes, mime });
    },
    async get(key) {
      return objects.get(key) ?? null;
    },
    async delete(key) {
      objects.delete(key);
    },
  };
  return storage;
}

async function addVehicle(db: Db, owner: Actor, extra: Partial<typeof vehicles.$inferInsert> = {}) {
  const [v] = await db
    .insert(vehicles)
    .values({
      ownerId: owner.id,
      vin: FIXTURE_VINS.bydSongPlus,
      brand: "BYD",
      model: "Song Plus",
      year: 2023,
      trim: "DM-i 110 km Flagship",
      epc: "byd",
      decodeStatus: "decoded",
      ...extra,
    })
    .returning();
  return v;
}

const offerValues = (requestId: string, extra: Partial<typeof offers.$inferInsert> = {}): typeof offers.$inferInsert => ({
  requestId,
  status: "published",
  title: "Колодки передние",
  kind: "oem",
  priceKzt: 24000,
  leadDaysMin: 12,
  leadDaysMax: 18,
  fitment: "vin_confirmed",
  priceCny: "120.00",
  costKzt: 15000,
  supplierName: "Guangzhou Parts Co",
  supplierUrl: "https://example.com/item/1",
  internalNote: "supplier margin note",
  ...extra,
});

let db: Db;
let alice: Actor;
let bob: Actor;
let sourcer: Actor;

beforeEach(async () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  db = await testDb();
  alice = await makeUser(db, "customer");
  bob = await makeUser(db, "customer");
  sourcer = await makeUser(db, "sourcer");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createRequest", () => {
  it("stores the request with a vehicle snapshot and a system message", async () => {
    const car = await addVehicle(db, alice);
    const created = await createRequest(db, alice, {
      vehicleId: car.id,
      title: "  Колодки   передние ",
      description: "Скрипят при торможении",
      partTypeId: "brake-pads",
      axis: "front",
      oe: " 10273368-00 a ",
      qty: 2,
    });
    expect(created.number).toBeGreaterThan(0);
    const [row] = await db.select().from(partRequests).where(eq(partRequests.id, created.id));
    expect(row).toMatchObject({
      customerId: alice.id,
      vehicleId: car.id,
      status: "new",
      title: "Колодки передние",
      oe: "10273368-00 A",
      qty: 2,
      axis: "front",
      side: null,
      partTypeId: "brake-pads",
      version: 1,
    });
    expect(row.vehicleSnapshot).toEqual({
      label: "BYD Song Plus 2023",
      vin: FIXTURE_VINS.bydSongPlus,
      brand: "BYD",
      model: "Song Plus",
      year: 2023,
      trim: "DM-i 110 km Flagship",
      decodeStatus: "decoded",
      epc: "byd",
    });
    const messages = await db.select().from(requestMessages).where(eq(requestMessages.requestId, created.id));
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ kind: "system", body: RECEIVED_MESSAGE, internal: false });
  });

  it("works without a vehicle and uses the custom vehicle label", async () => {
    const created = await createRequest(db, alice, { title: "Фара", qty: 1 });
    const [row] = await db.select().from(partRequests).where(eq(partRequests.id, created.id));
    expect(row.vehicleSnapshot).toBeNull();
    expect(row.description).toBe("");

    const car = await addVehicle(db, alice, { label: "Машина жены", vin: FIXTURE_VINS.geelyGalaxyE5 });
    const second = await createRequest(db, alice, { vehicleId: car.id, title: "Фара левая" });
    const list = await listMyRequests(db, alice);
    expect(list.find((r) => r.id === second.id)?.vehicleLabel).toBe("Машина жены");
  });

  it("refuses another customer's vehicle and an archived one", async () => {
    const bobsCar = await addVehicle(db, bob);
    await expect(createRequest(db, alice, { vehicleId: bobsCar.id, title: "Фара" })).rejects.toMatchObject({ status: 404 });
    const archived = await addVehicle(db, alice, { archivedAt: new Date() });
    await expect(createRequest(db, alice, { vehicleId: archived.id, title: "Фара" })).rejects.toMatchObject({ status: 404 });
    await expect(createRequest(db, alice, { vehicleId: "not-a-uuid", title: "Фара" })).rejects.toMatchObject({ status: 404 });
  });

  it("validates the input", async () => {
    const bad = (input: Parameters<typeof createRequest>[2]) => expect(createRequest(db, alice, input)).rejects.toMatchObject({ status: 400 });
    await bad({ title: "ф" });
    await bad({ title: "ф".repeat(161) });
    await bad({ title: "Фара", description: "x".repeat(4001) });
    await bad({ title: "Фара", qty: 0 });
    await bad({ title: "Фара", qty: 51 });
    await bad({ title: "Фара", qty: 1.5 });
    await bad({ title: "Фара", partTypeId: "no-such-part" });
    await bad({ title: "Фара", oe: "A".repeat(41) });
    await bad({ title: "Фара", oe: "фара-123" });
    // A VIN in the OE field is refused so it is not stored as a part number.
    await expect(createRequest(db, alice, { title: "Фара", oe: FIXTURE_VINS.bydSongPlus })).rejects.toThrow("похоже на VIN");
    expect(await db.select().from(partRequests)).toHaveLength(0);
  });

  it("caps new requests per account per day, but not for staff", async () => {
    const now = new Date();
    const rows = Array.from({ length: DAILY_LIMITS.requests.customer }, () => ({ customerId: alice.id, title: "Фара", createdAt: now }));
    await db.insert(partRequests).values(rows);
    await expect(createRequest(db, alice, { title: "Ещё фара" }, { now })).rejects.toMatchObject({ status: 429 });
    await createRequest(db, bob, { title: "Фара" }, { now });
    await db.insert(partRequests).values(rows.map((r) => ({ ...r, customerId: sourcer.id })));
    await createRequest(db, sourcer, { title: "Своя фара" }, { now });
    expect((await createRequest(db, alice, { title: "Фара завтра" }, { now: new Date(now.getTime() + 25 * 3600 * 1000) })).number).toBeGreaterThan(0);
  });

  it("does not fail when notifications fail", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = { token: "x", fetcher: async () => { throw new Error("network down"); } };
    await db.update(users).set({ telegramChatId: "123" });
    const created = await createRequest(db, alice, { title: "Фара" }, { notify: broken });
    expect(created.id).toBeTruthy();
  });
});

describe("listMyRequests", () => {
  it("lists only the actor's requests with published offer counts", async () => {
    const a = await createRequest(db, alice, { title: "Фара левая" });
    await createRequest(db, bob, { title: "Зеркало" });
    await db.insert(offers).values([
      offerValues(a.id),
      offerValues(a.id, { status: "published", priceKzt: 30000 }),
      offerValues(a.id, { status: "draft" }),
    ]);
    const list = await listMyRequests(db, alice);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: a.id, title: "Фара левая", status: "new", offerCount: 2, vehicleLabel: null });
    expect(await listMyRequests(db, sourcer)).toEqual([]);
  });

  it("lists the actor's vehicles for the form", async () => {
    await addVehicle(db, alice);
    await addVehicle(db, alice, { vin: FIXTURE_VINS.deepalS7, archivedAt: new Date() });
    await addVehicle(db, bob);
    const options = await listVehicleOptions(db, alice);
    expect(options).toEqual([
      {
        id: expect.any(String),
        label: "BYD Song Plus 2023",
        car: { modelId: null, color: null, brand: "BYD", model: "Song Plus", year: 2023 },
      },
    ]);
  });

  it("gives each listed request the picture of its own car, and none without a car", async () => {
    const car = await addVehicle(db, alice, { modelId: "byd-song-plus-dmi", color: "blue" });
    const withCar = await createRequest(db, alice, { title: "Фара левая", vehicleId: car.id });
    const without = await createRequest(db, alice, { title: "Зеркало" });
    await createRequest(db, bob, { title: "Чужая заявка" });
    const list = await listMyRequests(db, alice);
    expect(list.map((r) => r.id).sort()).toEqual([withCar.id, without.id].sort());
    expect(list.find((r) => r.id === withCar.id)?.car).toEqual({
      modelId: "byd-song-plus-dmi",
      color: "blue",
      brand: "BYD",
      model: "Song Plus",
      year: 2023,
    });
    expect(list.find((r) => r.id === without.id)?.car).toBeNull();
    expect((await getRequestForCustomer(db, alice, withCar.id)).car).toMatchObject({ modelId: "byd-song-plus-dmi", color: "blue" });
    expect((await getRequestForCustomer(db, alice, without.id)).car).toBeNull();
    await expect(getRequestForCustomer(db, bob, withCar.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe("getRequestForCustomer", () => {
  it("returns only customer-safe data to the owner", async () => {
    const car = await addVehicle(db, alice);
    const { id } = await createRequest(db, alice, { vehicleId: car.id, title: "Колодки передние", partTypeId: "brake-pads" });
    await db.update(partRequests).set({ assignedTo: sourcer.id, status: "offered" }).where(eq(partRequests.id, id));
    await db.insert(requestMessages).values([
      { requestId: id, authorId: sourcer.id, body: "Нашли два варианта" },
      { requestId: id, authorId: sourcer.id, body: "Поставщик дорогой, ищу дешевле", internal: true },
    ]);
    await postCustomerMessage(db, alice, id, { body: "Спасибо" });
    await db.insert(offers).values([
      offerValues(id),
      offerValues(id, { status: "draft", title: "Черновик" }),
      offerValues(id, { status: "withdrawn", title: "Отозвано" }),
      offerValues(id, { status: "rejected", title: "Отклонено" }),
    ]);

    const view = await getRequestForCustomer(db, alice, id);
    expect(view.request).toMatchObject({ id, status: "offered", title: "Колодки передние", partName: expect.any(String), version: 1 });
    expect(view.request).not.toHaveProperty("assignedTo");
    expect(view.request).not.toHaveProperty("customerId");
    expect(view.vehicle).toMatchObject({ label: "BYD Song Plus 2023", vin: FIXTURE_VINS.bydSongPlus });
    expect(view.messages.map((m) => [m.from, m.body])).toEqual([
      ["system", RECEIVED_MESSAGE],
      ["staff", "Нашли два варианта"],
      ["customer", "Спасибо"],
    ]);
    expect(view.offers.map((o) => o.title)).toEqual(["Колодки передние", "Отклонено"]);
    const serialized = JSON.stringify(view);
    for (const secret of ["priceCny", "costKzt", "supplierName", "supplierUrl", "internalNote", "Guangzhou", "supplier margin", "дешевле", sourcer.id])
      expect(serialized).not.toContain(secret);
    expect(view.order).toBeNull();
  });

  it("hides the request from other customers and from staff", async () => {
    const { id } = await createRequest(db, alice, { title: "Фара" });
    await expect(getRequestForCustomer(db, bob, id)).rejects.toMatchObject({ status: 404 });
    await expect(getRequestForCustomer(db, sourcer, id)).rejects.toMatchObject({ status: 404 });
    await expect(getRequestForCustomer(db, alice, OTHER_UUID)).rejects.toMatchObject({ status: 404 });
    await expect(getRequestForCustomer(db, alice, "1 or 1=1")).rejects.toMatchObject({ status: 404 });
  });

  it("opens by the number from notification links, for the owner only", async () => {
    const { id, number } = await createRequest(db, alice, { title: "Фара" });
    expect((await getRequestForCustomer(db, alice, String(number))).request.id).toBe(id);
    await expect(getRequestForCustomer(db, bob, String(number))).rejects.toMatchObject({ status: 404 });
    await expect(getRequestForCustomer(db, sourcer, String(number))).rejects.toMatchObject({ status: 404 });
    await expect(getRequestForCustomer(db, alice, "0")).rejects.toMatchObject({ status: 404 });
    await expect(getRequestForCustomer(db, alice, "99999999999")).rejects.toMatchObject({ status: 404 });
  });
});

describe("postCustomerMessage", () => {
  it("adds the message and returns a clarification to the queue", async () => {
    const { id } = await createRequest(db, alice, { title: "Фара" });
    await db.update(partRequests).set({ status: "clarification", assignedTo: sourcer.id, version: 3 }).where(eq(partRequests.id, id));
    const info = vi.mocked(console.info);
    info.mockClear();
    const result = await postCustomerMessage(db, alice, id, { body: "  Левая, с линзой  " });
    expect(result.status).toBe("searching");
    // Only the sourcer who leads the request hears about the answer, under its own heading.
    const notes = info.mock.calls.map((c) => String(c[0])).filter((line) => line.includes("notification staff_customer_reply"));
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain("Клиент ответил на вопрос по заявке");
    const [row] = await db.select().from(partRequests).where(eq(partRequests.id, id));
    expect(row).toMatchObject({ status: "searching", version: 4 });
    const messages = await db.select().from(requestMessages).where(eq(requestMessages.requestId, id));
    expect(messages.find((m) => m.kind === "message")).toMatchObject({ body: "Левая, с линзой", authorId: alice.id, internal: false });
  });

  it("keeps the status otherwise and refuses closed requests", async () => {
    const { id } = await createRequest(db, alice, { title: "Фара" });
    expect((await postCustomerMessage(db, alice, id, { body: "Есть фото" })).status).toBe("new");
    const [row] = await db.select().from(partRequests).where(eq(partRequests.id, id));
    expect(row.version).toBe(1);
    await expect(postCustomerMessage(db, alice, id, { body: "" })).rejects.toMatchObject({ status: 400 });
    await expect(postCustomerMessage(db, alice, id, { body: "x".repeat(3001) })).rejects.toMatchObject({ status: 400 });
    await db.update(partRequests).set({ status: "cancelled" }).where(eq(partRequests.id, id));
    await expect(postCustomerMessage(db, alice, id, { body: "Ещё вопрос" })).rejects.toMatchObject({ status: 400 });
  });

  it("is only for the owner", async () => {
    const { id } = await createRequest(db, alice, { title: "Фара" });
    await expect(postCustomerMessage(db, bob, id, { body: "Привет" })).rejects.toMatchObject({ status: 404 });
    await expect(postCustomerMessage(db, sourcer, id, { body: "Привет" })).rejects.toMatchObject({ status: 404 });
  });
});

describe("cancelRequest", () => {
  it("cancels with the current version only", async () => {
    const { id } = await createRequest(db, alice, { title: "Фара" });
    await db.update(partRequests).set({ status: "offered" }).where(eq(partRequests.id, id));
    await db.insert(offers).values([offerValues(id), offerValues(id, { status: "draft" })]);
    await expect(cancelRequest(db, alice, id, 7)).rejects.toMatchObject({ status: 409 });
    const result = await cancelRequest(db, alice, id, 1);
    expect(result).toMatchObject({ status: "cancelled", version: 2 });
    expect((await db.select().from(offers)).map((o) => o.status).sort()).toEqual(["draft", "rejected"]);
    await expect(cancelRequest(db, alice, id, 2)).rejects.toMatchObject({ status: 409 });
    const messages = await db.select().from(requestMessages).where(eq(requestMessages.requestId, id));
    expect(messages.map((m) => m.body)).toContain("Клиент отменил заявку.");
  });

  it("refuses accepted requests, other customers and staff", async () => {
    const { id } = await createRequest(db, alice, { title: "Фара" });
    await expect(cancelRequest(db, bob, id, 1)).rejects.toMatchObject({ status: 404 });
    await expect(cancelRequest(db, sourcer, id, 1)).rejects.toMatchObject({ status: 404 });
    await db.update(partRequests).set({ status: "accepted" }).where(eq(partRequests.id, id));
    await expect(cancelRequest(db, alice, id, 1)).rejects.toMatchObject({ status: 409 });
  });
});

describe("attachments", () => {
  it("stores a photo for the owner and serves it back", async () => {
    const storage = memoryStorage();
    const { id } = await createRequest(db, alice, { title: "Фара" });
    const saved = await addAttachment(db, alice, id, { bytes: PNG, name: "фото фары.jpeg", declaredMime: "image/jpeg", size: PNG.byteLength }, { storage });
    // The real type wins over the declared one, and the name gets a matching extension.
    expect(saved).toMatchObject({ mime: "image/png", name: "фото фары.png", size: PNG.byteLength });
    expect(storage.objects.size).toBe(1);

    const file = await getAttachmentFile(db, alice, saved.id, { storage });
    expect(file.mime).toBe("image/png");
    expect(Array.from(file.bytes)).toEqual(Array.from(PNG));
    expect((await getRequestForCustomer(db, alice, id)).attachments).toEqual([
      { id: saved.id, name: "фото фары.png", mime: "image/png", size: PNG.byteLength, createdAt: expect.any(Date) },
    ]);

    // Staff can open it; another customer cannot tell it exists.
    expect((await getAttachmentFile(db, sourcer, saved.id, { storage })).mime).toBe("image/png");
    await expect(getAttachmentFile(db, bob, saved.id, { storage })).rejects.toMatchObject({ status: 404 });
    await expect(getAttachmentFile(db, alice, OTHER_UUID, { storage })).rejects.toMatchObject({ status: 404 });
  });

  it("lets staff add photos but not other customers", async () => {
    const storage = memoryStorage();
    const { id } = await createRequest(db, alice, { title: "Фара" });
    const upload = { bytes: PNG, name: "a.png", declaredMime: "image/png", size: PNG.byteLength };
    await expect(addAttachment(db, bob, id, upload, { storage })).rejects.toMatchObject({ status: 404 });
    expect(storage.objects.size).toBe(0);
    await addAttachment(db, sourcer, id, upload, { storage });
    const rows = await db.select().from(attachments);
    expect(rows[0].uploaderId).toBe(sourcer.id);
  });

  it("lets a sourcer add photos only to requests they may edit", async () => {
    const storage = memoryStorage();
    const other = await makeUser(db, "sourcer");
    const admin = await makeUser(db, "admin");
    const { id } = await createRequest(db, alice, { title: "Фара" });
    await db.update(partRequests).set({ assignedTo: sourcer.id, status: "searching" }).where(eq(partRequests.id, id));
    const upload = { bytes: PNG, name: "a.png", declaredMime: "image/png", size: PNG.byteLength };
    await expect(addAttachment(db, other, id, upload, { storage })).rejects.toMatchObject({ status: 403 });
    expect(storage.objects.size).toBe(0);
    expect((await getRequestForCustomer(db, alice, id)).attachments).toEqual([]);
    await addAttachment(db, sourcer, id, upload, { storage });
    await addAttachment(db, admin, id, upload, { storage });
    expect((await getRequestForCustomer(db, alice, id)).attachments).toHaveLength(2);
  });

  it("caps the photo bytes one account uploads in a day", async () => {
    const storage = memoryStorage();
    const { id } = await createRequest(db, alice, { title: "Фара" });
    const now = new Date();
    // Earlier uploads today already used the budget (rows only, to keep the test fast).
    await db.insert(attachments).values({
      requestId: id,
      uploaderId: alice.id,
      storageKey: crypto.randomUUID(),
      name: "big.jpg",
      mime: "image/jpeg",
      size: DAILY_LIMITS.uploadBytes.customer,
      createdAt: now,
    });
    const upload = { bytes: PNG, name: "a.png", declaredMime: "image/png", size: PNG.byteLength };
    await expect(addAttachment(db, alice, id, upload, { storage, now })).rejects.toMatchObject({ status: 429 });
    expect(storage.objects.size).toBe(0);
    // Staff are not limited, and the next day the budget is back.
    await addAttachment(db, sourcer, id, upload, { storage, now });
    await addAttachment(db, alice, id, upload, { storage, now: new Date(now.getTime() + 25 * 3600 * 1000) });
  });

  it("refuses files that are not photos", async () => {
    const storage = memoryStorage();
    const { id } = await createRequest(db, alice, { title: "Фара" });
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    await expect(
      addAttachment(db, alice, id, { bytes: html, name: "x.png", declaredMime: "image/png", size: html.byteLength }, { storage }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      addAttachment(db, alice, id, { bytes: PNG, name: "x.png", declaredMime: "text/html", size: PNG.byteLength }, { storage }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      addAttachment(db, alice, id, { bytes: PNG, name: "x.png", declaredMime: "image/png", size: PNG.byteLength + 5 }, { storage }),
    ).rejects.toMatchObject({ status: 400 });
    expect(storage.objects.size).toBe(0);
  });

  it("allows at most 10 photos and cleans up the stored file when the row is refused", async () => {
    const storage = memoryStorage();
    const { id } = await createRequest(db, alice, { title: "Фара" });
    const upload = { bytes: PNG, name: "a.png", declaredMime: "image/png", size: PNG.byteLength };
    for (let i = 0; i < 9; i++) await addAttachment(db, alice, id, upload, { storage });
    expect(storage.objects.size).toBe(9);

    // Another upload lands while this one is being stored: the row is refused and the file is removed.
    const racing: Storage = {
      ...storage,
      async put(key, bytes, mime) {
        await storage.put(key, bytes, mime);
        await db.insert(attachments).values({ requestId: id, storageKey: crypto.randomUUID(), name: "b.png", mime: "image/png", size: 1 });
      },
    };
    await expect(addAttachment(db, alice, id, upload, { storage: racing })).rejects.toThrow("не больше 10 фото");
    expect(storage.objects.size).toBe(9);
    await expect(addAttachment(db, alice, id, upload, { storage })).rejects.toMatchObject({ status: 400 });
    expect(storage.objects.size).toBe(9);
  });

  it("refuses photos on cancelled requests", async () => {
    const storage = memoryStorage();
    const { id } = await createRequest(db, alice, { title: "Фара" });
    await cancelRequest(db, alice, id, 1);
    await expect(
      addAttachment(db, alice, id, { bytes: PNG, name: "a.png", declaredMime: "image/png", size: PNG.byteLength }, { storage }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("requestDraftFromQuery", () => {
  it("prefills from links and keeps VINs out of the title", async () => {
    const car = await addVehicle(db, alice);
    const draft = requestDraftFromQuery({ q: `передняя левая фара ${FIXTURE_VINS.bydSongPlus}`, vehicle: car.id }, [car.id]);
    expect(draft).toMatchObject({ vehicleId: car.id, axis: "front", side: "left", oe: "" });
    expect(draft.title).not.toContain(FIXTURE_VINS.bydSongPlus.toLowerCase());
    expect(draft.title.toLowerCase()).toContain("фара");

    expect(requestDraftFromQuery({ part: "brake-pads", axis: "rear", side: "up", vehicle: OTHER_UUID }, [car.id])).toEqual({
      vehicleId: null,
      title: expect.stringMatching(/.+/),
      partTypeId: "brake-pads",
      axis: "rear",
      side: null,
      oe: "",
      description: "",
      withPhotos: false,
    });
    expect(requestDraftFromQuery({ oe: "10273368-00", title: "Колодки" })).toMatchObject({ oe: "10273368-00", title: "Колодки" });
    // The customer's own words survive a picked part name, without a VIN in them.
    const worded = requestDraftFromQuery({ title: "Тормозные колодки", q: `колодки передние на сонг плюс ${FIXTURE_VINS.bydSongPlus}` });
    expect(worded).toMatchObject({ title: "Тормозные колодки", description: "колодки передние на сонг плюс", axis: "front" });
    expect(requestDraftFromQuery({ title: "Фара", q: "фара" }).description).toBe("");
    expect(requestDraftFromQuery({ photo: "1" }).withPhotos).toBe(true);
    expect(requestDraftFromQuery({ photo: "yes" }).withPhotos).toBe(false);
    expect(requestDraftFromQuery({ oe: FIXTURE_VINS.bydSongPlus }).oe).toBe("");
    expect(requestDraftFromQuery({ part: "nope" }).partTypeId).toBeNull();
  });
});
