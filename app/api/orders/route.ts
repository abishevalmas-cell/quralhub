import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, route } from "@/lib/server/http";
import { listMyOrders } from "@/lib/services/orders";

export const GET = route(async () => {
  const actor = await requireActor();
  return json({ orders: await listMyOrders(await getDb(), actor) });
});
