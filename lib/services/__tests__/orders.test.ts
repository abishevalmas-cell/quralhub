import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import { offers, orderEvents, orders, partRequests, requestMessages, vehicles } from "@/lib/db/schema";
import { FIXTURE_VINS } from "@/lib/providers";
import { makeUser, testDb } from "@/tests/helpers/db";
import { acceptOffer, getOrderForCustomer, listMyOrders } from "../orders";
import { createRequest, getRequestForCustomer } from "../requests";

const OTHER_UUID = "00000000-0000-4000-8000-000000000000";

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

const offerValues = (requestId: string, extra: Partial<typeof offers.$inferInsert> = {}): typeof offers.$inferInsert => ({
  requestId,
  createdBy: sourcer.id,
  status: "published",
  title: "Колодки передние",
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
  ...extra,
});

// A request of Alice's in "offered" with two published offers and one draft.
async function offeredRequest(owner: Actor = alice) {
  const [car] = await db
    .insert(vehicles)
    .values({ ownerId: owner.id, vin: FIXTURE_VINS.bydSongPlus, brand: "BYD", model: "Song Plus", year: 2023, decodeStatus: "decoded" })
    .returning();
  const { id } = await createRequest(db, owner, { vehicleId: car.id, title: "Колодки передние", partTypeId: "brake-pads", axis: "front" });
  await db.update(partRequests).set({ status: "offered", assignedTo: sourcer.id, version: 2 }).where(eq(partRequests.id, id));
  const [a, b, draft] = await db
    .insert(offers)
    .values([offerValues(id), offerValues(id, { title: "Колодки аналог", kind: "aftermarket", priceKzt: 64000 }), offerValues(id, { status: "draft" })])
    .returning();
  return { requestId: id, a, b, draft };
}

describe("acceptOffer", () => {
  it("creates an order and closes the other offers", async () => {
    const { requestId, a, b, draft } = await offeredRequest();
    const order = await acceptOffer(db, alice, a.id);
    expect(order.number).toBeGreaterThan(0);

    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row).toMatchObject({ customerId: alice.id, requestId, offerId: a.id, totalKzt: 186000, status: "awaiting_payment", version: 1 });
    const statuses = Object.fromEntries((await db.select().from(offers)).map((o) => [o.id, o.status]));
    expect(statuses).toEqual({ [a.id]: "accepted", [b.id]: "rejected", [draft.id]: "draft" });
    const [request] = await db.select().from(partRequests).where(eq(partRequests.id, requestId));
    expect(request).toMatchObject({ status: "accepted", version: 3 });
    const events = await db.select().from(orderEvents).where(eq(orderEvents.orderId, order.id));
    expect(events).toMatchObject([{ status: "awaiting_payment", actorId: alice.id }]);
    const messages = await db.select().from(requestMessages).where(eq(requestMessages.requestId, requestId));
    expect(messages.some((m) => m.kind === "system" && m.body.includes(`заказ №${order.number}`))).toBe(true);

    const view = await getRequestForCustomer(db, alice, requestId);
    expect(view.order).toMatchObject({ id: order.id, number: order.number, status: "awaiting_payment" });
    expect(view.offers.map((o) => o.status)).toEqual(["accepted", "rejected"]);
  });

  it("lets only one of two concurrent accepts win", async () => {
    const { a, b } = await offeredRequest();
    const results = await Promise.allSettled([acceptOffer(db, alice, a.id), acceptOffer(db, alice, b.id)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(failed.reason).toMatchObject({ status: 409 });
    expect(await db.select().from(orders)).toHaveLength(1);
    await expect(acceptOffer(db, alice, a.id)).rejects.toMatchObject({ status: 409 });
  });

  it("hides other customers' offers and is not a staff shortcut", async () => {
    const { a } = await offeredRequest();
    await expect(acceptOffer(db, bob, a.id)).rejects.toMatchObject({ status: 404 });
    await expect(acceptOffer(db, sourcer, a.id)).rejects.toMatchObject({ status: 404 });
    await expect(acceptOffer(db, alice, OTHER_UUID)).rejects.toMatchObject({ status: 404 });
    await expect(acceptOffer(db, alice, "nope")).rejects.toMatchObject({ status: 404 });
    expect(await db.select().from(orders)).toHaveLength(0);
  });

  it("refuses drafts, withdrawn and expired offers and requests that are not waiting for a choice", async () => {
    const { requestId, a, b, draft } = await offeredRequest();
    await expect(acceptOffer(db, alice, draft.id)).rejects.toMatchObject({ status: 409 });
    await db.update(offers).set({ status: "withdrawn" }).where(eq(offers.id, b.id));
    await expect(acceptOffer(db, alice, b.id)).rejects.toMatchObject({ status: 409 });

    await db.update(offers).set({ validUntil: new Date("2026-01-01T00:00:00Z") }).where(eq(offers.id, a.id));
    await expect(acceptOffer(db, alice, a.id, { now: new Date("2026-01-02T00:00:00Z") })).rejects.toMatchObject({ status: 400 });

    await db.update(offers).set({ validUntil: null }).where(eq(offers.id, a.id));
    await db.update(partRequests).set({ status: "searching" }).where(eq(partRequests.id, requestId));
    await expect(acceptOffer(db, alice, a.id)).rejects.toMatchObject({ status: 409 });
    await db.update(partRequests).set({ status: "cancelled" }).where(eq(partRequests.id, requestId));
    await expect(acceptOffer(db, alice, a.id)).rejects.toMatchObject({ status: 409 });
    expect(await db.select().from(orders)).toHaveLength(0);
    expect((await db.select().from(offers).where(eq(offers.id, a.id)))[0].status).toBe("published");
  });
});

describe("customer orders", () => {
  it("lists and shows only the owner's orders without internal fields", async () => {
    const { a } = await offeredRequest();
    const order = await acceptOffer(db, alice, a.id);
    const bobs = await offeredRequest(bob);
    await acceptOffer(db, bob, bobs.a.id);

    const list = await listMyOrders(db, alice);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: order.id,
      number: order.number,
      status: "awaiting_payment",
      totalKzt: 186000,
      offerTitle: "Колодки передние",
      requestTitle: "Колодки передние",
      vehicleLabel: "BYD Song Plus 2023",
    });
    expect(list[0]).not.toHaveProperty("vehicleSnapshot");

    const view = await getOrderForCustomer(db, alice, order.id);
    expect(view.order).toMatchObject({ id: order.id, status: "awaiting_payment", totalKzt: 186000 });
    expect(view.offer).toMatchObject({ id: a.id, title: "Колодки передние", kind: "original", priceKzt: 186000 });
    expect(view.request.title).toBe("Колодки передние");
    expect(view.vehicleLabel).toBe("BYD Song Plus 2023");
    expect(view.events.map((e) => e.status)).toEqual(["awaiting_payment"]);
    const serialized = JSON.stringify(view);
    for (const secret of ["priceCny", "costKzt", "supplierName", "supplierUrl", "internalNote", "Shenzhen", "do not show", "actorId"])
      expect(serialized).not.toContain(secret);

    await expect(getOrderForCustomer(db, bob, order.id)).rejects.toMatchObject({ status: 404 });
    await expect(getOrderForCustomer(db, sourcer, order.id)).rejects.toMatchObject({ status: 404 });
    await expect(getOrderForCustomer(db, alice, OTHER_UUID)).rejects.toMatchObject({ status: 404 });
    expect(await listMyOrders(db, sourcer)).toEqual([]);
  });
});
