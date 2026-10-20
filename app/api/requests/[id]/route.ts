import { z } from "zod";
import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, readJson, route } from "@/lib/server/http";
import { cancelRequest, getRequestForCustomer } from "@/lib/services/requests";

type Ctx = { params: Promise<{ id: string }> };

const Patch = z.object({
  action: z.literal("cancel", { errorMap: () => ({ message: "Неизвестное действие" }) }),
  version: z.number({ invalid_type_error: "Обновите страницу и попробуйте ещё раз" }).int().positive(),
});

export const GET = route(async (_request, { params }: Ctx) => {
  const actor = await requireActor();
  const { id } = await params;
  return json(await getRequestForCustomer(await getDb(), actor, id));
});

export const PATCH = route(async (request, { params }: Ctx) => {
  const actor = await requireActor();
  const { id } = await params;
  const body = await readJson(request, Patch);
  const result = await cancelRequest(await getDb(), actor, id, body.version);
  return json({ request: result });
});
