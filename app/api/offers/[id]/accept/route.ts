import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, route } from "@/lib/server/http";
import { acceptOffer } from "@/lib/services/orders";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (_request, { params }: Ctx) => {
  const actor = await requireActor();
  const { id } = await params;
  const order = await acceptOffer(await getDb(), actor, id);
  return json({ order }, 201);
});
