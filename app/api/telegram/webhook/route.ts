import { z } from "zod";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/server/errors";
import { json, readJson, route } from "@/lib/server/http";
import { handleTelegramUpdate, webhookSecretValid } from "@/lib/services/telegram";

// Telegram bot webhook. Register it with setWebhook(url, secret_token = TELEGRAM_WEBHOOK_SECRET).
// Everything except a wrong secret answers 200: any other status makes Telegram redeliver the update.
export const POST = route(async (request) => {
  if (!webhookSecretValid(request.headers.get("x-telegram-bot-api-secret-token")))
    throw new AppError(401, "Неверный секрет вебхука", "unauthorized");
  let update: unknown;
  try {
    update = await readJson(request, z.unknown());
  } catch {
    return json({ ok: true });
  }
  await handleTelegramUpdate(await getDb(), update);
  return json({ ok: true });
});
