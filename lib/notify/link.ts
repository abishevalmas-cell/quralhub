import { createHmac, timingSafeEqual } from "node:crypto";
import { authSecret } from "@/lib/server/demo";

// A signed token that links a Telegram chat to a user: the site shows t.me/<bot>?start=<token>,
// the bot receives "/start <token>" and stores the chat id for the user it names.
//
// Telegram limits the start parameter to 64 characters from [A-Za-z0-9_-], so the token is binary-packed:
// base64url(16-byte user uuid + uint32 issued-at minutes) followed by base64url(HMAC-SHA256 truncated to 128 bits).
// Both parts have a fixed length (27 + 22 = 49 characters), so no separator is needed.

export const TELEGRAM_LINK_TTL_MINUTES = 30;
const PAYLOAD_CHARS = 27;
const SIGNATURE_BYTES = 16;
const TOKEN_RE = /^[A-Za-z0-9_-]{49}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


// The domain prefix keeps these signatures distinct from anything else signed with AUTH_SECRET.
const sign = (payload: string) =>
  createHmac("sha256", authSecret())
    .update(`tetix:telegram-link:${payload}`)
    .digest()
    .subarray(0, SIGNATURE_BYTES)
    .toString("base64url");

const toMinutes = (date: Date) => Math.floor(date.getTime() / 60000);

export function telegramLinkToken(userId: string, now = new Date()): string {
  if (typeof userId !== "string" || !UUID_RE.test(userId)) throw new Error("telegramLinkToken expects a user uuid");
  const minutes = toMinutes(now);
  if (!Number.isSafeInteger(minutes) || minutes < 0 || minutes > 0xffffffff)
    throw new Error("telegramLinkToken expects a valid date");
  const raw = Buffer.alloc(20);
  Buffer.from(userId.replace(/-/g, ""), "hex").copy(raw, 0);
  raw.writeUInt32BE(minutes, 16);
  const payload = raw.toString("base64url");
  return payload + sign(payload);
}

export function verifyTelegramLinkToken(token: string, now = new Date()): string | null {
  if (typeof token !== "string" || !TOKEN_RE.test(token)) return null;
  const payload = token.slice(0, PAYLOAD_CHARS);
  // Comparing the canonical base64url text (not decoded bytes) rejects alternative encodings of the same signature.
  const actual = Buffer.from(token.slice(PAYLOAD_CHARS));
  const expected = Buffer.from(sign(payload));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  const raw = Buffer.from(payload, "base64url");
  if (raw.length !== 20) return null;
  const issuedMs = raw.readUInt32BE(16) * 60000;
  const ageMs = now.getTime() - issuedMs;
  // Issued-at is rounded down to the minute, so a token is never accepted for longer than the TTL.
  // One minute of clock skew is tolerated for tokens that look issued in the future.
  // An invalid `now` gives NaN, which would slip through both comparisons, so it is rejected explicitly.
  if (!Number.isFinite(ageMs) || ageMs < -60000 || ageMs > TELEGRAM_LINK_TTL_MINUTES * 60000) return null;
  const hex = raw.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Deep link for the "Подключить Telegram" button; null until TELEGRAM_BOT_USERNAME is configured.
export function telegramLinkUrl(userId: string, now = new Date(), botUsername = process.env.TELEGRAM_BOT_USERNAME): string | null {
  const bot = String(botUsername ?? "").trim().replace(/^@/, "");
  if (!/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(bot)) return null;
  return `https://t.me/${bot}?start=${telegramLinkToken(userId, now)}`;
}

// Extracts the token from the bot's "/start <token>" message (also "/start@TetixBot <token>").
export function linkTokenFromStart(text: string | null | undefined): string | null {
  const match = /^\/start(?:@[A-Za-z0-9_]+)?\s+([A-Za-z0-9_-]{1,64})\s*$/.exec(String(text ?? "").trim());
  return match ? match[1] : null;
}
