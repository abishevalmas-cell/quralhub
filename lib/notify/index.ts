import { eq, inArray } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { appBaseUrl, htmlToPlain, renderEvent, type NotificationEvent } from "./events";
import { maskPhoneForLog, maskVins } from "./mask";
import { sendTelegram, type Fetcher } from "./telegram";

export type { NotificationEvent } from "./events";

export type NotifyDeps = { token?: string; fetcher?: Fetcher; appUrl?: string };
export type NotifyResult = { channel: "telegram" | "console" | "none"; ok: boolean; error?: string };
export type NotifyStaffResult = { telegram: number; console: number; failed: number };

type Recipient = { id: string; phone: string; telegramChatId: string | null };

const STAFF_ROLES = ["sourcer", "admin"] as const;
const STAFF_BATCH = 10;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function deliver(recipient: Recipient, event: NotificationEvent, text: string, deps: NotifyDeps): Promise<NotifyResult> {
  const who = maskPhoneForLog(recipient.phone);
  const token = String(deps.token ?? process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  if (recipient.telegramChatId && token) {
    const result = await sendTelegram(recipient.telegramChatId, text, { token, fetcher: deps.fetcher });
    if (result.ok) return { channel: "telegram", ok: true };
    console.error(`[tetix] telegram ${event.type} to ${who} failed: ${result.error}`);
    return { channel: "telegram", ok: false, error: result.error };
  }
  // Without a bot the console is the dev channel; production logs keep only who and what, not the message body.
  // renderEvent already masks VINs; masking again covers anything that reached the text another way.
  const body = process.env.NODE_ENV === "production" ? "" : `:\n${maskVins(htmlToPlain(text))}`;
  console.info(`[tetix] notification ${event.type} for ${who} (no telegram)${body}`);
  return { channel: "console", ok: true };
}

// Fire-and-forget friendly: a failed notification must never break the action that caused it, so this never throws.
export async function notifyUser(db: Db, userId: string, event: NotificationEvent, deps: NotifyDeps = {}): Promise<NotifyResult> {
  try {
    if (!UUID_RE.test(String(userId))) {
      console.error(`[tetix] notification ${event.type}: invalid user id`);
      return { channel: "none", ok: false, error: "user not found" };
    }
    const [recipient] = await db
      .select({ id: users.id, phone: users.phone, telegramChatId: users.telegramChatId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!recipient) {
      console.error(`[tetix] notification ${event.type}: user ${userId} not found`);
      return { channel: "none", ok: false, error: "user not found" };
    }
    return await deliver(recipient, event, renderEvent(event, deps.appUrl ?? appBaseUrl()), deps);
  } catch (error) {
    console.error(`[tetix] notification ${event?.type} for user ${userId} failed: ${errorText(error)}`);
    return { channel: "none", ok: false, error: errorText(error) };
  }
}

export async function notifyStaff(db: Db, event: NotificationEvent, deps: NotifyDeps = {}): Promise<NotifyStaffResult> {
  const summary: NotifyStaffResult = { telegram: 0, console: 0, failed: 0 };
  try {
    const staff = await db
      .select({ id: users.id, phone: users.phone, telegramChatId: users.telegramChatId })
      .from(users)
      .where(inArray(users.role, [...STAFF_ROLES]));
    const text = renderEvent(event, deps.appUrl ?? appBaseUrl());
    // Small batches stay well under Telegram's per-bot rate limit (about 30 messages per second).
    for (let i = 0; i < staff.length; i += STAFF_BATCH) {
      const results = await Promise.all(
        staff.slice(i, i + STAFF_BATCH).map((recipient) =>
          deliver(recipient, event, text, deps).catch((error): NotifyResult => {
            console.error(`[tetix] notification ${event.type} to staff failed: ${errorText(error)}`);
            return { channel: "none", ok: false, error: errorText(error) };
          }),
        ),
      );
      for (const result of results) {
        if (!result.ok) summary.failed++;
        else if (result.channel === "telegram") summary.telegram++;
        else summary.console++;
      }
    }
  } catch (error) {
    console.error(`[tetix] staff notification ${event?.type} failed: ${errorText(error)}`);
  }
  return summary;
}
