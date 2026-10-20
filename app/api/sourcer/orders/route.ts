import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, route } from "@/lib/server/http";
import { listOrdersForStaff, staffOrderCounts } from "@/lib/services/orders";

// ?status=<order status>|active|all (default: all). Staff only; the services check the role.
export const GET = route(async (request) => {
  const actor = await requireActor();
  const status = new URL(request.url).searchParams.get("status");
  const db = await getDb();
  const orders = await listOrdersForStaff(db, actor, { status });
  return json({ orders, counts: await staffOrderCounts(db, actor) });
});
