import { z } from "zod";
import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, readJson, route } from "@/lib/server/http";
import { getPricing, savePricing } from "@/lib/services/admin";

// Field rules live in lib/pricing; the service checks the admin role before it validates the values.
const Body = z.record(z.unknown());

export const GET = route(async () => {
  const actor = await requireActor();
  return json({ pricing: await getPricing(await getDb(), actor) });
});

export const PUT = route(async (request) => {
  const actor = await requireActor();
  const body = await readJson(request, Body);
  return json({ pricing: await savePricing(await getDb(), actor, body) });
});
