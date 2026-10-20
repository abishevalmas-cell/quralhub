import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, route } from "@/lib/server/http";
import { listQueue, queueCounts } from "@/lib/services/sourcing";

// GET /api/sourcer/queue?view=new|mine|clarification|offered|all&q=
export const GET = route(async (request) => {
  const actor = await requireActor();
  const params = new URL(request.url).searchParams;
  const view = params.get("view") || "new";
  const db = await getDb();
  const items = await listQueue(db, actor, { view, q: params.get("q") });
  return json({ view, items, counts: await queueCounts(db, actor) });
});
