import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, readJson, route } from "@/lib/server/http";
import { MessageSchema, postCustomerMessage } from "@/lib/services/requests";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request, { params }: Ctx) => {
  const actor = await requireActor();
  const { id } = await params;
  const body = await readJson(request, MessageSchema);
  const message = await postCustomerMessage(await getDb(), actor, id, body);
  return json({ message }, 201);
});
