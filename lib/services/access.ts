import { eq } from "drizzle-orm";
import type { Actor } from "@/lib/auth/session";
import { isAdmin, isStaff } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import { partRequests, vehicles } from "@/lib/db/schema";
import { forbidden, notFound } from "@/lib/server/errors";

// Not-found and forbidden look the same to customers so request ids cannot be probed.
export async function loadVehicleForOwner(db: Db, actor: Actor, vehicleId: string) {
  if (!isUuid(vehicleId)) throw notFound("Машина не найдена");
  const [row] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1);
  if (!row || row.ownerId !== actor.id || row.archivedAt) throw notFound("Машина не найдена");
  return row;
}

export async function loadRequestForActor(db: Db, actor: Actor, requestId: string) {
  if (!isUuid(requestId)) throw notFound("Заявка не найдена");
  const [row] = await db.select().from(partRequests).where(eq(partRequests.id, requestId)).limit(1);
  if (!row) throw notFound("Заявка не найдена");
  if (row.customerId === actor.id) return { request: row, asStaff: false };
  if (isStaff(actor)) return { request: row, asStaff: true };
  throw notFound("Заявка не найдена");
}

// Staff may change a request that is unassigned or assigned to them; admins may change any.
export function assertStaffCanEdit(actor: Actor, request: { assignedTo: string | null }) {
  if (!isStaff(actor)) throw forbidden("Раздел доступен подборщикам");
  if (isAdmin(actor)) return;
  if (request.assignedTo && request.assignedTo !== actor.id) throw forbidden("Заявку ведёт другой подборщик");
}

export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
