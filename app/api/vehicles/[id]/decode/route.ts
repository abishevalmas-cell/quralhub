import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, route } from "@/lib/server/http";
import { catalogAvailability } from "@/lib/services/catalog";
import { redecode } from "@/lib/services/vehicles";

type Context = { params: Promise<{ id: string }> };

// Decodes again a car whose first decode failed (timeout, limit, account error). Never retried automatically.
export const POST = route(async (_request, { params }: Context) => {
  const actor = await requireActor();
  const { id } = await params;
  const result = await redecode(await getDb(), actor, id);
  return json({ ...result, availability: catalogAvailability(result.vehicle) });
});
