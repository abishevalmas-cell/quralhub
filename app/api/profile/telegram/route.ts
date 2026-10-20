import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, route } from "@/lib/server/http";
import { telegramStatus, unlinkTelegram } from "@/lib/services/telegram";

// {linked, url}: url is the t.me deep link with a fresh 30-minute token, or null when the bot is not configured.
export const GET = route(async () => {
  const actor = await requireActor();
  return json(await telegramStatus(await getDb(), actor));
});

export const DELETE = route(async () => {
  const actor = await requireActor();
  return json(await unlinkTelegram(await getDb(), actor));
});
