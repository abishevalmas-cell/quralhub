import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, readJson, route } from "@/lib/server/http";
import { createRequest, CreateRequestSchema, listMyRequests } from "@/lib/services/requests";

export const GET = route(async () => {
  const actor = await requireActor();
  return json({ requests: await listMyRequests(await getDb(), actor) });
});

export const POST = route(async (request) => {
  const actor = await requireActor();
  const body = await readJson(request, CreateRequestSchema);
  const created = await createRequest(await getDb(), actor, body);
  return json({ request: created }, 201);
});
