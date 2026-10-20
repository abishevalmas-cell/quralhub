import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, readJson, route } from "@/lib/server/http";
import { AdvanceOrderSchema, advanceOrder, getOrderForStaff } from "@/lib/services/orders";

type Ctx = { params: Promise<{ id: string }> };

// Staff only: the answer includes the INTERNAL purchase fields of the offer.
export const GET = route(async (_request, { params }: Ctx) => {
  const actor = await requireActor();
  const { id } = await params;
  return json(await getOrderForStaff(await getDb(), actor, id));
});

// Body: { status, note?, version }. 409 when someone moved the order first.
export const PATCH = route(async (request, { params }: Ctx) => {
  const actor = await requireActor();
  const { id } = await params;
  const input = await readJson(request, AdvanceOrderSchema);
  return json({ order: await advanceOrder(await getDb(), actor, id, input) });
});
