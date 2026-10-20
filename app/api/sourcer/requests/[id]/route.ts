import { z } from "zod";
import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { REQUEST_STATUSES } from "@/lib/db/schema";
import { json, readJson, route } from "@/lib/server/http";
import {
  addInternalNote,
  askClarification,
  getRequestForStaff,
  publishOffers,
  releaseRequest,
  sendCustomerMessage,
  setStatus,
  takeRequest,
} from "@/lib/services/sourcing";

type Ctx = { params: Promise<{ id: string }> };

const REFRESH = "Обновите страницу и попробуйте ещё раз";
const MESSAGE = "Сообщение — от 1 до 3000 символов";
const version = z.number({ invalid_type_error: REFRESH, required_error: REFRESH }).int(REFRESH).positive(REFRESH);
const text = z.string({ invalid_type_error: MESSAGE, required_error: MESSAGE });

const Patch = z.discriminatedUnion(
  "action",
  [
    z.object({ action: z.literal("take"), version: version.nullish() }),
    z.object({ action: z.literal("release"), version }),
    z.object({
      action: z.literal("status"),
      status: z.enum(REQUEST_STATUSES, { errorMap: () => ({ message: "Неизвестный статус заявки" }) }),
      version,
      reason: z.string({ invalid_type_error: "Причина — строка" }).nullish(),
    }),
    z.object({ action: z.literal("clarify"), question: text, version }),
    z.object({ action: z.literal("note"), body: text }),
    z.object({ action: z.literal("message"), body: text }),
    z.object({ action: z.literal("publish"), version }),
  ],
  { errorMap: () => ({ message: "Неизвестное действие" }) },
);

export const GET = route(async (_request, { params }: Ctx) => {
  const actor = await requireActor();
  const { id } = await params;
  return json(await getRequestForStaff(await getDb(), actor, id));
});

export const PATCH = route(async (request, { params }: Ctx) => {
  const actor = await requireActor();
  const { id } = await params;
  const body = await readJson(request, Patch);
  const db = await getDb();
  switch (body.action) {
    case "take":
      return json({ request: await takeRequest(db, actor, id, body.version) });
    case "release":
      return json({ request: await releaseRequest(db, actor, id, body.version) });
    case "status":
      return json({ request: await setStatus(db, actor, id, body.status, body.version, { reason: body.reason }) });
    case "clarify":
      return json({ request: await askClarification(db, actor, id, body.question, body.version) });
    case "publish":
      return json({ request: await publishOffers(db, actor, id, body.version) });
    case "note":
      return json({ message: await addInternalNote(db, actor, id, body.body) });
    case "message":
      return json({ message: await sendCustomerMessage(db, actor, id, body.body) });
  }
});
