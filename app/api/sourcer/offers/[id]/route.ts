import { z } from "zod";
import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, readJson, route } from "@/lib/server/http";
import { deleteOffer, updateOffer, withdrawOffer, type OfferInput } from "@/lib/services/sourcing";

type Ctx = { params: Promise<{ id: string }> };

// { action: "withdraw" } withdraws a published offer; anything else is the full draft form, validated by updateOffer.
const Patch = z
  .object({ action: z.enum(["update", "withdraw"], { errorMap: () => ({ message: "Неизвестное действие" }) }).optional() })
  .passthrough();

export const PATCH = route(async (request, { params }: Ctx) => {
  const actor = await requireActor();
  const { id } = await params;
  const body = await readJson(request, Patch);
  const db = await getDb();
  if (body.action === "withdraw") return json(await withdrawOffer(db, actor, id));
  return json(await updateOffer(db, actor, id, body as OfferInput));
});

export const DELETE = route(async (_request, { params }: Ctx) => {
  const actor = await requireActor();
  const { id } = await params;
  return json({ ok: true, ...(await deleteOffer(await getDb(), actor, id)) });
});
