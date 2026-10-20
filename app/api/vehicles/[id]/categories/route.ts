import { catalogFailureText } from "@/components/garage/labels";
import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, route } from "@/lib/server/http";
import { getCategories } from "@/lib/services/catalog";

type Context = { params: Promise<{ id: string }> };

// GET ?level=1..4&parent=<code of the group above>; level 1 needs no parent.
export const GET = route(async (request, { params }: Context) => {
  const actor = await requireActor();
  const { id } = await params;
  const query = new URL(request.url).searchParams;
  const answer = await getCategories(await getDb(), actor, id, {
    level: Number(query.get("level") ?? "1"),
    parentCode: query.get("parent"),
  });
  const { ok, status, message, source, availability, categories } = answer;
  return json({ ok, status, message: ok ? message : catalogFailureText(status, "catalog"), source, availability, categories });
});
