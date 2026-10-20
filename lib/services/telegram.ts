import { createHash, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Actor } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { linkTokenFromStart, telegramLinkUrl, verifyTelegramLinkToken } from "@/lib/notify/link";
import { sendTelegram, type TelegramResult } from "@/lib/notify/telegram";

// Linking a Telegram chat to an account: the profile shows t.me/<bot>?start=<signed token>, the bot's webhook
// receives "/start <token>" and stores the chat id. lib/notify then delivers notifications to that chat.

export const LINKED_REPLY = "Готово: уведомления Tetix будут приходить сюда.";
export const EXPIRED_REPLY = "Ссылка устарела. Откройте профиль на сайте Tetix и нажмите «Подключить Telegram» ещё раз.";

export type TelegramStatus = { linked: boolean; url: string | null };
export type TelegramSend = (chatId: string, text: string) => Promise<TelegramResult>;
export type TelegramDeps = { now?: Date; botUsername?: string; send?: TelegramSend };
export type WebhookOutcome = { outcome: "linked"; userId: string } | { outcome: "expired" } | { outcome: "ignored" };

async function chatIdOf(db: Db, actor: Actor): Promise<string | null> {
  const [row] = await db.select({ chatId: users.telegramChatId }).from(users).where(eq(users.id, actor.id)).limit(1);
  return row?.chatId ?? null;
}

// The link is returned even when a chat is linked, so the owner can move notifications to another chat.
// null means the bot is not configured (TELEGRAM_BOT_USERNAME is not set).
export async function telegramStatus(db: Db, actor: Actor, deps: TelegramDeps = {}): Promise<TelegramStatus> {
  const chatId = await chatIdOf(db, actor);
  return { linked: Boolean(chatId), url: telegramLinkUrl(actor.id, deps.now ?? new Date(), deps.botUsername) };
}

export async function unlinkTelegram(db: Db, actor: Actor, deps: TelegramDeps = {}): Promise<TelegramStatus> {
  const now = deps.now ?? new Date();
  await db.update(users).set({ telegramChatId: null, updatedAt: now }).where(eq(users.id, actor.id));
  return telegramStatus(db, actor, { ...deps, now });
}

const digest = (value: string) => createHash("sha256").update(value).digest();

// Telegram repeats the secret from setWebhook in X-Telegram-Bot-Api-Secret-Token. Both sides are hashed first,
// so the comparison takes the same time whatever the length of the guess. Without a configured secret
// nothing is accepted: an open webhook would let anyone post fake updates.
export function webhookSecretValid(received: string | null | undefined, expected = process.env.TELEGRAM_WEBHOOK_SECRET): boolean {
  const secret = String(expected ?? "");
  if (!secret.trim() || typeof received !== "string" || !received) return false;
  return timingSafeEqual(digest(received), digest(secret));
}

const CHAT_ID_RE = /^-?\d{1,20}$/;

// Only the fields the bot needs; everything else in the update is ignored.
const UpdateSchema = z.object({
  message: z
    .object({
      text: z.string().max(4096).optional(),
      chat: z.object({ id: z.union([z.number().int(), z.string()]), type: z.string() }),
    })
    .optional(),
});

const defaultSend: TelegramSend = (chatId, text) => sendTelegram(chatId, text);

// A failed reply must not turn the update into an error: Telegram would redeliver it.
async function reply(send: TelegramSend, chatId: string, text: string) {
  try {
    const result = await send(chatId, text);
    if (!result.ok) console.error(`[tetix] telegram webhook reply failed: ${result.error}`);
  } catch (error) {
    console.error(`[tetix] telegram webhook reply failed: ${(error as Error)?.message ?? error}`);
  }
}

// Handles one update from the webhook. Never throws for bad input: anything that is not "/start <token>"
// in a private chat is ignored, so Telegram gets 200 and does not retry.
export async function handleTelegramUpdate(db: Db, update: unknown, deps: TelegramDeps = {}): Promise<WebhookOutcome> {
  const parsed = UpdateSchema.safeParse(update);
  const message = parsed.success ? parsed.data.message : undefined;
  if (!message?.text) return { outcome: "ignored" };
  const token = linkTokenFromStart(message.text);
  if (!token) return { outcome: "ignored" };
  // Notifications are personal: a link opened in a group would send them to everyone in it.
  if (message.chat.type !== "private") return { outcome: "ignored" };
  const chatId = String(message.chat.id);
  if (!CHAT_ID_RE.test(chatId)) return { outcome: "ignored" };

  const send = deps.send ?? defaultSend;
  const now = deps.now ?? new Date();
  const userId = verifyTelegramLinkToken(token, now);
  if (!userId) {
    await reply(send, chatId, EXPIRED_REPLY);
    return { outcome: "expired" };
  }
  const updated = await db
    .update(users)
    .set({ telegramChatId: chatId, updatedAt: now })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  if (!updated.length) return { outcome: "ignored" };
  await reply(send, chatId, LINKED_REPLY);
  return { outcome: "linked", userId };
}
