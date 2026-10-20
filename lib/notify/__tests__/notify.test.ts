import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/db";
import { notifyStaff, notifyUser } from "@/lib/notify";
import type { Fetcher } from "@/lib/notify/telegram";
import { makeUser, testDb } from "@/tests/helpers/db";

const TOKEN = "123456789:TEST_token_for_unit_tests_only";
// Synthetic VIN with a valid ISO 3779 check digit; never a real customer's.
const VIN = "LTXSYN000R0012345";

function fakeTelegram(respond: (chatId: string) => Response = () => Response.json({ ok: true })) {
  const sent: { chatId: string; text: string }[] = [];
  const fetcher: Fetcher = async (_url, init) => {
    const body = JSON.parse(String(init.body)) as { chat_id: string; text: string };
    sent.push({ chatId: body.chat_id, text: body.text });
    return respond(body.chat_id);
  };
  return { fetcher, sent };
}

let info: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;
const previousToken = process.env.TELEGRAM_BOT_TOKEN;

beforeEach(() => {
  delete process.env.TELEGRAM_BOT_TOKEN;
  info = vi.spyOn(console, "info").mockImplementation(() => {});
  error = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
  else process.env.TELEGRAM_BOT_TOKEN = previousToken;
});

const logged = (spy: ReturnType<typeof vi.spyOn>) => spy.mock.calls.map((args: unknown[]) => args.join(" ")).join("\n");

describe("notifyUser", () => {
  it("sends Telegram to a linked user", async () => {
    const db = await testDb();
    const user = await makeUser(db, "customer", { telegramChatId: "555001" });
    const { fetcher, sent } = fakeTelegram();
    const result = await notifyUser(db, user.id, { type: "request_received", requestNumber: 42 }, {
      token: TOKEN,
      fetcher,
      appUrl: "https://tetix.example",
    });
    expect(result).toEqual({ channel: "telegram", ok: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].chatId).toBe("555001");
    expect(sent[0].text).toContain("<b>Мы приняли заявку №42</b>");
    expect(sent[0].text).toContain("https://tetix.example/requests/42");
  });

  it("logs to the console with a masked phone when Telegram is not linked", async () => {
    const db = await testDb();
    const user = await makeUser(db, "customer");
    const { fetcher, sent } = fakeTelegram();
    const result = await notifyUser(
      db,
      user.id,
      { type: "request_clarification", requestNumber: 7, question: `Это ваш VIN ${VIN}?` },
      { token: TOKEN, fetcher },
    );
    expect(result).toEqual({ channel: "console", ok: true });
    expect(sent).toHaveLength(0);
    const output = logged(info);
    expect(output).toContain("request_clarification");
    expect(output).toContain("Вопрос по заявке №7");
    expect(output).toContain(`•••${user.phone.slice(-4)}`);
    // Only the last four digits: the subscriber part of the number must not be readable.
    expect(output).not.toContain(user.phone.slice(-5));
    expect(output).toContain("LTX…2345");
    expect(output).not.toContain(VIN);
  });

  it("logs to the console when there is no bot token", async () => {
    const db = await testDb();
    const user = await makeUser(db, "customer", { telegramChatId: "555002" });
    const { fetcher, sent } = fakeTelegram();
    const result = await notifyUser(db, user.id, { type: "order_status", orderNumber: 3, statusLabel: "Оплачен" }, { fetcher });
    expect(result.channel).toBe("console");
    expect(sent).toHaveLength(0);
  });

  it("does not throw when Telegram fails", async () => {
    const db = await testDb();
    const user = await makeUser(db, "customer", { telegramChatId: "555003" });
    const fetcher: Fetcher = async () => {
      throw new Error("network down");
    };
    const result = await notifyUser(db, user.id, { type: "request_received", requestNumber: 1 }, { token: TOKEN, fetcher });
    expect(result).toEqual({ channel: "telegram", ok: false, error: "network down" });
    expect(logged(error)).toContain("network down");
    expect(logged(error)).not.toContain(user.phone.slice(-5));
    expect(logged(error)).not.toContain(TOKEN.split(":")[1]);
  });

  it("does not throw for unknown users or a broken database", async () => {
    const db = await testDb();
    const event = { type: "request_received", requestNumber: 1 } as const;
    expect(await notifyUser(db, "00000000-0000-4000-8000-000000000000", event)).toMatchObject({ ok: false, channel: "none" });
    expect(await notifyUser(db, "not-a-uuid", event)).toMatchObject({ ok: false, channel: "none" });
    const broken = {
      select() {
        throw new Error("db down");
      },
    } as unknown as Db;
    expect(await notifyUser(broken, "00000000-0000-4000-8000-000000000000", event)).toEqual({
      channel: "none",
      ok: false,
      error: "db down",
    });
    expect(logged(error)).toContain("db down");
  });
});

describe("notifyStaff", () => {
  it("notifies sourcers and admins only", async () => {
    const db = await testDb();
    await makeUser(db, "sourcer", { telegramChatId: "700001" });
    await makeUser(db, "admin", { telegramChatId: "700002" });
    const unlinked = await makeUser(db, "sourcer");
    await makeUser(db, "customer", { telegramChatId: "700003" });
    await makeUser(db, "master", { telegramChatId: "700004" });
    const { fetcher, sent } = fakeTelegram();

    const result = await notifyStaff(
      db,
      { type: "staff_new_request", requestNumber: 15, vehicleLabel: "Geely Monjaro 2024", title: "Фара левая" },
      { token: TOKEN, fetcher },
    );
    expect(result).toEqual({ telegram: 2, console: 1, failed: 0 });
    expect(sent.map((m) => m.chatId).sort()).toEqual(["700001", "700002"]);
    expect(sent[0].text).toContain("Geely Monjaro 2024");
    expect(logged(info)).toContain(unlinked.phone.slice(-4));
  });

  it("counts failures without stopping other deliveries", async () => {
    const db = await testDb();
    await makeUser(db, "sourcer", { telegramChatId: "700010" });
    await makeUser(db, "sourcer", { telegramChatId: "700011" });
    const { fetcher, sent } = fakeTelegram((chatId) =>
      chatId === "700010" ? Response.json({ ok: false, description: "Forbidden: bot was blocked by the user" }, { status: 403 }) : Response.json({ ok: true }),
    );
    const result = await notifyStaff(db, { type: "staff_new_request", requestNumber: 16, vehicleLabel: null, title: "Фильтр" }, {
      token: TOKEN,
      fetcher,
    });
    expect(result).toEqual({ telegram: 1, console: 0, failed: 1 });
    expect(sent).toHaveLength(2);
    expect(logged(error)).toContain("bot was blocked");
  });

  it("does not throw on a broken database", async () => {
    const broken = {
      select() {
        throw new Error("db down");
      },
    } as unknown as Db;
    expect(await notifyStaff(broken, { type: "staff_new_request", requestNumber: 1, vehicleLabel: null, title: "x" })).toEqual({
      telegram: 0,
      console: 0,
      failed: 0,
    });
  });
});

describe("notification privacy", () => {
  it("leaves the message body out of production logs", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const db = await testDb();
      const user = await makeUser(db, "customer");
      const result = await notifyUser(db, user.id, {
        type: "request_clarification",
        requestNumber: 8,
        question: "Секретный вопрос",
      });
      expect(result).toEqual({ channel: "console", ok: true });
      const output = logged(info);
      expect(output).toContain("request_clarification");
      expect(output).toContain(`•••${user.phone.slice(-4)}`);
      expect(output).not.toContain("Секретный вопрос");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("masks VINs in the Telegram message itself", async () => {
    const db = await testDb();
    await makeUser(db, "sourcer", { telegramChatId: "700020" });
    const { fetcher, sent } = fakeTelegram();
    await notifyStaff(
      db,
      { type: "staff_new_request", requestNumber: 21, vehicleLabel: `Chery Tiggo 7 Pro · ${VIN}`, title: "Фара" },
      { token: TOKEN, fetcher },
    );
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain("LTX…2345");
    expect(sent[0].text).not.toContain(VIN);
  });

  it("does not log the bot token when Telegram reports an error", async () => {
    const db = await testDb();
    const user = await makeUser(db, "customer", { telegramChatId: "555004" });
    const fetcher: Fetcher = async (url) => {
      throw new Error(`request to ${encodeURI(url)} failed`);
    };
    const result = await notifyUser(db, user.id, { type: "request_received", requestNumber: 2 }, { token: TOKEN, fetcher });
    expect(result.ok).toBe(false);
    expect(result.error).not.toContain(TOKEN.split(":")[1]);
    expect(logged(error)).not.toContain(TOKEN.split(":")[1]);
  });
});

describe("notifyStaff batching", () => {
  it("reaches every staff member when there are more than one batch", async () => {
    const db = await testDb();
    const chats: string[] = [];
    for (let i = 0; i < 23; i++) {
      const chatId = String(800000 + i);
      chats.push(chatId);
      await makeUser(db, i % 2 ? "admin" : "sourcer", { telegramChatId: chatId });
    }
    let inFlight = 0;
    let maxInFlight = 0;
    const sent: string[] = [];
    const fetcher: Fetcher = async (_url, init) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      sent.push(JSON.parse(String(init.body)).chat_id);
      inFlight--;
      return Response.json({ ok: true });
    };
    const result = await notifyStaff(
      db,
      { type: "staff_new_request", requestNumber: 30, vehicleLabel: null, title: "Фильтр" },
      { token: TOKEN, fetcher },
    );
    expect(result).toEqual({ telegram: 23, console: 0, failed: 0 });
    expect(sent.sort()).toEqual(chats.sort());
    expect(maxInFlight).toBeLessThanOrEqual(10);
  });

  it("reports nothing sent when there is no staff", async () => {
    const db = await testDb();
    await makeUser(db, "customer", { telegramChatId: "700030" });
    const { fetcher, sent } = fakeTelegram();
    expect(
      await notifyStaff(db, { type: "staff_new_request", requestNumber: 31, vehicleLabel: null, title: "x" }, { token: TOKEN, fetcher }),
    ).toEqual({ telegram: 0, console: 0, failed: 0 });
    expect(sent).toHaveLength(0);
  });
});
