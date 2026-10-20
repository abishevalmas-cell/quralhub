import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, route } from "@/lib/server/http";
import { dashboard } from "@/lib/services/admin";

export const GET = route(async () => {
  const actor = await requireActor();
  return json(await dashboard(await getDb(), actor));
});
