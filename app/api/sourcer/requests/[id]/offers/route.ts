import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, readJson, route } from "@/lib/server/http";
import { createOffer, OfferInputSchema } from "@/lib/services/sourcing";

type Ctx = { params: Promise<{ id: string }> };

// Creates a draft offer; drafts reach the customer only through publish.
export const POST = route(async (request, { params }: Ctx) => {
  const actor = await requireActor();
  const { id } = await params;
  const body = await readJson(request, OfferInputSchema);
  return json(await createOffer(await getDb(), actor, id, body), 201);
});
