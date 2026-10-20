import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { TELEGRAM_LINK_TTL_MINUTES, telegramLinkToken, verifyTelegramLinkToken } from "@/lib/notify/link";
import { makeUser, testDb } from "@/tests/helpers/db";
import {
  EXPIRED_REPLY,
  LINKED_REPLY,
  handleTelegramUpdate,
  telegramStatus,
  unlinkTelegram,
  webhookSecretValid,
  type TelegramSend,
} from "../telegram";

// Route handlers read the actor from the session cookie and the database from getDb(); both are swapped here.
const routeState = vi.hoisted(() => ({ db: null as Db | null, actor: null as Actor | null }));

vi.mock("@/lib/auth/current", async () => {
  const { unauthorized } = await import("@/lib/server/errors");
  return {
    getActor: async () => routeState.actor,
    requireActor: async () => {
      if (!routeState.actor) throw unauthorized();
      return routeState.actor;
    },
  };
});
vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  getDb: async () => routeState.db,
}));

const NOW = new Date("2026-10-20T08:00:00Z");
const CHAT = 523456789;
const BOT = "TetixTestBot";
const SECRET = "test-webhook-secret_123";

const ENV_KEYS = ["TELEGRAM_BOT_USERNAME", "TELEGRAM_WEBHOOK_SECRET", "TELEGRAM_BOT_TOKEN"] as const;
const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  routeState.db = null;
  routeState.actor = null;
  vi.restoreAllMocks();
});

function startUpdate(text: string, chat: { id: number | string; type: string } = { id: CHAT, type: "private" }) {
  return {
    update_id: 10001,
    message: { message_id: 7, date: 1_790_000_000, text, chat, from: { id: 42, is_bot: false, first_name: "Алмас" } },
  };
}

function recorder() {
  const sent: { chatId: string; text: string }[] = [];
  const send: TelegramSend = async (chatId, text) => {
    sent.push({ chatId, text });
    return { ok: true };
  };
  return { sent, send };
}

const chatOf = async (db: Db, id: string) =>
  (await db.select({ chatId: users.telegramChatId }).from(users).where(eq(users.id, id)).limit(1))[0]?.chatId ?? null;

describe("webhookSecretValid", () => {
  it("accepts only the configured secret", () => {
    expect(webhookSecretValid(SECRET, SECRET)).toBe(true);
    expect(webhookSecretValid("wrong", SECRET)).toBe(false);
    expect(webhookSecretValid(SECRET + "x", SECRET)).toBe(false);
    expect(webhookSecretValid("", SECRET)).toBe(false);
    expect(webhookSecretValid(null, SECRET)).toBe(false);
    expect(webhookSecretValid(undefined, SECRET)).toBe(false);
  });

  it("rejects everything while no secret is configured", () => {
    expect(webhookSecretValid("", "")).toBe(false);
    expect(webhookSecretValid("anything", undefined)).toBe(false);
    expect(webhookSecretValid(" ", " ")).toBe(false);
    process.env.TELEGRAM_WEBHOOK_SECRET = SECRET;
    expect(webhookSecretValid(SECRET)).toBe(true);
  });
});

describe("handleTelegramUpdate", () => {
  it("links the chat from /start <token> and replies", async () => {
    const db = await testDb();
    const user = await makeUser(db);
    const other = await makeUser(db);
    const { sent, send } = recorder();
    const token = telegramLinkToken(user.id, NOW);

    const result = await handleTelegramUpdate(db, startUpdate(`/start ${token}`), { now: NOW, send });
    expect(result).toEqual({ outcome: "linked", userId: user.id });
    expect(await chatOf(db, user.id)).toBe(String(CHAT));
    expect(await chatOf(db, other.id)).toBeNull();
    expect(sent).toEqual([{ chatId: String(CHAT), text: LINKED_REPLY }]);

    // "/start@Bot <token>" from the bot menu and a token used again within its TTL both work; a new chat replaces the old one.
    const again = await handleTelegramUpdate(db, startUpdate(`/start@${BOT} ${token}`, { id: 777, type: "private" }), { now: NOW, send });
    expect(again.outcome).toBe("linked");
    expect(await chatOf(db, user.id)).toBe("777");
  });

  it("does not link with an expired or forged token", async () => {
    const db = await testDb();
    const user = await makeUser(db);
    const { sent, send } = recorder();
    const token = telegramLinkToken(user.id, NOW);
    const later = new Date(NOW.getTime() + (TELEGRAM_LINK_TTL_MINUTES + 1) * 60_000);

    expect(await handleTelegramUpdate(db, startUpdate(`/start ${token}`), { now: later, send })).toEqual({ outcome: "expired" });
    const forged = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    expect(verifyTelegramLinkToken(forged, NOW)).toBeNull();
    expect(await handleTelegramUpdate(db, startUpdate(`/start ${forged}`), { now: NOW, send })).toEqual({ outcome: "expired" });
    expect(await chatOf(db, user.id)).toBeNull();
    expect(sent.map((s) => s.text)).toEqual([EXPIRED_REPLY, EXPIRED_REPLY]);
  });

  it("ignores group chats, other messages and malformed updates without replying", async () => {
    const db = await testDb();
    const user = await makeUser(db);
    const { sent, send } = recorder();
    const token = telegramLinkToken(user.id, NOW);
    const deps = { now: NOW, send };

    for (const update of [
      startUpdate(`/start ${token}`, { id: -100123, type: "group" }),
      startUpdate(`/start ${token}`, { id: -100124, type: "supergroup" }),
      startUpdate("/start"),
      startUpdate("Здравствуйте, когда придёт заказ?"),
      startUpdate(`/help ${token}`),
      startUpdate(`/start ${token}`, { id: "12; drop table users", type: "private" }),
      { update_id: 1, edited_message: { text: `/start ${token}`, chat: { id: CHAT, type: "private" } } },
      { update_id: 2, message: { text: `/start ${token}` } },
      { update_id: 3, message: { chat: { id: CHAT, type: "private" }, photo: [] } },
      null,
      "garbage",
      [],
    ]) {
      expect(await handleTelegramUpdate(db, update, deps)).toEqual({ outcome: "ignored" });
    }
    expect(await chatOf(db, user.id)).toBeNull();
    expect(sent).toEqual([]);
  });

  it("ignores a valid token for a user that no longer exists", async () => {
    const db = await testDb();
    const user = await makeUser(db);
    const token = telegramLinkToken(user.id, NOW);
    await db.delete(users).where(eq(users.id, user.id));
    const { sent, send } = recorder();
    expect(await handleTelegramUpdate(db, startUpdate(`/start ${token}`), { now: NOW, send })).toEqual({ outcome: "ignored" });
    expect(sent).toEqual([]);
  });

  it("links even when the reply cannot be delivered", async () => {
    const db = await testDb();
    const user = await makeUser(db);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failing: TelegramSend = async () => {
      throw new Error("network down");
    };
    const result = await handleTelegramUpdate(db, startUpdate(`/start ${telegramLinkToken(user.id, NOW)}`), { now: NOW, send: failing });
    expect(result.outcome).toBe("linked");
    expect(await chatOf(db, user.id)).toBe(String(CHAT));
  });
});

describe("telegramStatus and unlinkTelegram", () => {
  it("gives a deep link with a token for this user only", async () => {
    const db = await testDb();
    const user = await makeUser(db);
    const status = await telegramStatus(db, user, { now: NOW, botUsername: BOT });
    expect(status.linked).toBe(false);
    expect(status.url).toMatch(new RegExp(`^https://t\\.me/${BOT}\\?start=[A-Za-z0-9_-]{49}$`));
    const token = new URL(status.url as string).searchParams.get("start") as string;
    expect(verifyTelegramLinkToken(token, NOW)).toBe(user.id);
  });

  it("has no link while the bot is not configured", async () => {
    const db = await testDb();
    const user = await makeUser(db, "customer", { telegramChatId: String(CHAT) });
    expect(await telegramStatus(db, user, { now: NOW })).toEqual({ linked: true, url: null });
  });

  it("unlinks only the caller's own chat", async () => {
    const db = await testDb();
    const user = await makeUser(db, "customer", { telegramChatId: "111" });
    const other = await makeUser(db, "master", { telegramChatId: "222" });
    expect(await unlinkTelegram(db, user, { now: NOW })).toEqual({ linked: false, url: null });
    expect(await chatOf(db, user.id)).toBeNull();
    expect(await chatOf(db, other.id)).toBe("222");
    expect((await telegramStatus(db, other)).linked).toBe(true);
  });
});

describe("telegram routes", () => {
  const call = async (handler: (request: Request, context: never) => Promise<Response>, url: string, init: RequestInit = {}) => {
    const response = await handler(new Request(`http://localhost${url}`, init), undefined as never);
    return { status: response.status, body: await response.json() };
  };

  it("webhook requires the secret header and links on /start", async () => {
    const db = await testDb();
    routeState.db = db;
    const user = await makeUser(db);
    const webhook = await import("@/app/api/telegram/webhook/route");
    const body = JSON.stringify(startUpdate(`/start ${telegramLinkToken(user.id)}`));
    const post = (headers: Record<string, string> = {}, payload = body) =>
      call(webhook.POST, "/api/telegram/webhook", { method: "POST", body: payload, headers: { "content-type": "application/json", ...headers } });

    // Not configured: nothing is accepted, not even an empty header.
    expect((await post()).status).toBe(401);
    expect((await post({ "x-telegram-bot-api-secret-token": "" })).status).toBe(401);
    process.env.TELEGRAM_WEBHOOK_SECRET = SECRET;
    expect((await post()).status).toBe(401);
    expect((await post({ "x-telegram-bot-api-secret-token": "nope" })).status).toBe(401);
    expect(await chatOf(db, user.id)).toBeNull();

    // No bot token in tests, so the reply fails quietly and never reaches the network.
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await post({ "x-telegram-bot-api-secret-token": SECRET })).toEqual({ status: 200, body: { ok: true } });
    expect(await chatOf(db, user.id)).toBe(String(CHAT));
    expect(fetchSpy).not.toHaveBeenCalled();

    // Anything else is acknowledged with 200 so Telegram does not redeliver it.
    expect((await post({ "x-telegram-bot-api-secret-token": SECRET }, "{not json")).status).toBe(200);
    expect((await post({ "x-telegram-bot-api-secret-token": SECRET }, JSON.stringify({ update_id: 5 }))).status).toBe(200);
  });

  it("profile route shows, refreshes and removes the link for the signed-in user", async () => {
    const db = await testDb();
    routeState.db = db;
    const profile = await import("@/app/api/profile/telegram/route");

    expect(await call(profile.GET, "/api/profile/telegram")).toMatchObject({ status: 401, body: { code: "unauthorized" } });
    expect((await call(profile.DELETE, "/api/profile/telegram", { method: "DELETE" })).status).toBe(401);

    const user = await makeUser(db, "customer", { telegramChatId: String(CHAT) });
    routeState.actor = user;
    expect(await call(profile.GET, "/api/profile/telegram")).toEqual({ status: 200, body: { linked: true, url: null } });

    process.env.TELEGRAM_BOT_USERNAME = `@${BOT}`;
    const linked = await call(profile.GET, "/api/profile/telegram");
    expect(linked.body.linked).toBe(true);
    expect(linked.body.url).toMatch(new RegExp(`^https://t\\.me/${BOT}\\?start=`));

    expect(await call(profile.DELETE, "/api/profile/telegram", { method: "DELETE" })).toMatchObject({
      status: 200,
      body: { linked: false },
    });
    expect(await chatOf(db, user.id)).toBeNull();
  });
});
