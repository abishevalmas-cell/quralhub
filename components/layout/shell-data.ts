import "server-only";
import { and, count, eq, inArray, isNull } from "drizzle-orm";
import type { Actor } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import { orders, partRequests, users, type OrderStatus, type RequestStatus } from "@/lib/db/schema";

// Requests still waiting for something (an answer, a search, the customer's choice) and orders still on their way.
export const OPEN_REQUEST_STATUSES = ["new", "clarification", "searching", "offered"] as const satisfies readonly RequestStatus[];
export const ACTIVE_ORDER_STATUSES = [
  "awaiting_payment",
  "paid",
  "purchased",
  "consolidation",
  "in_transit",
  "customs",
  "in_city",
] as const satisfies readonly OrderStatus[];

export type ShellSummary = { city: string | null; openRequests: number; activeOrders: number; queueNew: number | null };

const isStaff = (role: Actor["role"] | undefined) => role === "sourcer" || role === "admin";

// What the header and sidebar show about the signed-in person: their own city and their own counts. Staff see their
// personal requests and orders in the sidebar too, and the header counts the new requests nobody has taken yet
// (as the "Новые" tab of the queue); for customers that number is null.
export async function shellSummary(db: Db, actor: Pick<Actor, "id"> & { role?: Actor["role"] }): Promise<ShellSummary> {
  const queue = isStaff(actor.role)
    ? db
        .select({ n: count() })
        .from(partRequests)
        .where(and(inArray(partRequests.status, ["new", "searching"]), isNull(partRequests.assignedTo)))
    : Promise.resolve([{ n: null }]);
  const [[user], [requests], [active], [fresh]] = await Promise.all([
    db.select({ city: users.city }).from(users).where(eq(users.id, actor.id)).limit(1),
    db
      .select({ n: count() })
      .from(partRequests)
      .where(and(eq(partRequests.customerId, actor.id), inArray(partRequests.status, [...OPEN_REQUEST_STATUSES]))),
    db
      .select({ n: count() })
      .from(orders)
      .where(and(eq(orders.customerId, actor.id), inArray(orders.status, [...ACTIVE_ORDER_STATUSES]))),
    queue,
  ]);
  return {
    city: user?.city?.trim() || null,
    openRequests: Number(requests?.n ?? 0),
    activeOrders: Number(active?.n ?? 0),
    queueNew: fresh?.n == null ? null : Number(fresh.n),
  };
}
