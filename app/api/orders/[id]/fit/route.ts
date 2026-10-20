import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, readJson, route } from "@/lib/server/http";
import { FitFeedbackSchema, confirmFit } from "@/lib/services/orders";

type Ctx = { params: Promise<{ id: string }> };

// Body: { result: "fits" | "not_fits", comment? }. Only the owner, only after delivery, only once.
export const POST = route(async (request, { params }: Ctx) => {
  const actor = await requireActor();
  const { id } = await params;
  const { result, comment } = await readJson(request, FitFeedbackSchema);
  return json(await confirmFit(await getDb(), actor, id, result, comment));
});
