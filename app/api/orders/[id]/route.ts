import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, route } from "@/lib/server/http";
import { getOrderForCustomer } from "@/lib/services/orders";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_request, { params }: Ctx) => {
  const actor = await requireActor();
  const { id } = await params;
  return json(await getOrderForCustomer(await getDb(), actor, id));
});
