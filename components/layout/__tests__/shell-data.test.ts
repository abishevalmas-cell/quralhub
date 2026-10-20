import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { Actor } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import { offers, orders, partRequests, users, type OrderStatus, type RequestStatus } from "@/lib/db/schema";
import { makeUser, testDb } from "@/tests/helpers/db";
import { shellSummary } from "../shell-data";

let seq = 0;
async function addRequest(db: Db, customer: Actor, status: RequestStatus) {
  const [row] = await db.insert(partRequests).values({ customerId: customer.id, title: `Деталь ${++seq}`, status }).returning();
  return row;
}

async function addOrder(db: Db, customer: Actor, status: OrderStatus) {
  const request = await addRequest(db, customer, "accepted");
  const [offer] = await db
    .insert(offers)
    .values({ requestId: request.id, title: "Колодки передние", kind: "original", status: "accepted", priceKzt: 30000, leadDaysMin: 8, leadDaysMax: 20 })
    .returning();
  await db.insert(orders).values({ customerId: customer.id, requestId: request.id, offerId: offer.id, status, totalKzt: 30000 });
}

describe("shellSummary", () => {
  it("counts only the person's own open requests and active orders", async () => {
    const db = await testDb();
    const me = await makeUser(db, "customer", { city: "Астана" });
    const other = await makeUser(db, "customer");
    for (const status of ["new", "clarification", "searching", "offered", "accepted", "closed", "cancelled"] as const)
      await addRequest(db, me, status);
    await addRequest(db, other, "new");
    await addRequest(db, other, "offered");
    await addOrder(db, me, "in_transit");
    await addOrder(db, me, "delivered");
    await addOrder(db, me, "cancelled");
    await addOrder(db, other, "paid");

    expect(await shellSummary(db, me)).toEqual({ city: "Астана", openRequests: 4, activeOrders: 1, queueNew: null });
    // The other customer sees their own numbers, never mine.
    expect(await shellSummary(db, other)).toEqual({ city: null, openRequests: 2, activeOrders: 1, queueNew: null });
  });

  it("gives staff their personal numbers and the count of new requests nobody has taken", async () => {
    const db = await testDb();
    const customer = await makeUser(db, "customer");
    const sourcer = await makeUser(db, "sourcer");
    await addRequest(db, customer, "new");
    await addRequest(db, customer, "searching");
    const taken = await addRequest(db, customer, "searching");
    await db.update(partRequests).set({ assignedTo: sourcer.id }).where(eq(partRequests.id, taken.id));
    await addRequest(db, customer, "offered");
    expect(await shellSummary(db, sourcer)).toEqual({ city: null, openRequests: 0, activeOrders: 0, queueNew: 2 });
    // A customer never gets the queue number.
    expect((await shellSummary(db, customer)).queueNew).toBeNull();
  });

  it("treats a blank city as not set", async () => {
    const db = await testDb();
    const me = await makeUser(db, "master");
    await db.update(users).set({ city: "   " }).where(eq(users.id, me.id));
    expect((await shellSummary(db, me)).city).toBeNull();
  });
});
