import { catalogFailureText } from "@/components/garage/labels";
import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, route } from "@/lib/server/http";
import { getParts } from "@/lib/services/catalog";

type Context = { params: Promise<{ id: string }> };

// GET ?code=<last-level group>&level=1..4. Every part carries fitment: vin_confirmed or needs_check.
export const GET = route(async (request, { params }: Context) => {
  const actor = await requireActor();
  const { id } = await params;
  const query = new URL(request.url).searchParams;
  const answer = await getParts(await getDb(), actor, id, {
    categoryCode: query.get("code") ?? "",
    level: Number(query.get("level") ?? ""),
  });
  const { ok, status, message, source, availability, parts } = answer;
  return json({ ok, status, message: ok ? message : catalogFailureText(status, "group"), source, availability, parts });
});
