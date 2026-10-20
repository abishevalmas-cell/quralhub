import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, readJson, route } from "@/lib/server/http";
import { previewQuote, QuotePreviewSchema } from "@/lib/services/sourcing";

// Live price preview for the offer editor. The answer is INTERNAL (purchase, cost, margin): staff only.
export const POST = route(async (request) => {
  const actor = await requireActor();
  const body = await readJson(request, QuotePreviewSchema);
  return json({ quote: await previewQuote(await getDb(), actor, body) });
});
