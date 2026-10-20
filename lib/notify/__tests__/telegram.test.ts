import { afterEach, describe, expect, it } from "vitest";
import { escapeHtml, sendTelegram, type Fetcher } from "@/lib/notify/telegram";

const TOKEN = "123456789:TEST_token_for_unit_tests_only";

type Call = { url: string; init: RequestInit };

function fakeFetcher(respond: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetcher: Fetcher = async (url, init) => {
    calls.push({ url, init });
    return respond({ url, init });
  };
  return { fetcher, calls };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const previousToken = process.env.TELEGRAM_BOT_TOKEN;
afterEach(() => {
  if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
  else process.env.TELEGRAM_BOT_TOKEN = previousToken;
});

describe("sendTelegram", () => {
  it("posts sendMessage with HTML parse mode", async () => {
    const { fetcher, calls } = fakeFetcher(() => json({ ok: true, result: { message_id: 1 } }));
    const result = await sendTelegram("123456", "<b>Заявка №7</b>", { token: TOKEN, fetcher });
    expect(result).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`https://api.telegram.org/bot${TOKEN}/sendMessage`);
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      chat_id: "123456",
      text: "<b>Заявка №7</b>",
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
  });

  it("uses TELEGRAM_BOT_TOKEN from the environment by default", async () => {
    process.env.TELEGRAM_BOT_TOKEN = TOKEN;
    const { fetcher, calls } = fakeFetcher(() => json({ ok: true }));
    expect((await sendTelegram("-1001234567890", "hi", { fetcher })).ok).toBe(true);
    expect(calls[0].url).toContain(`/bot${TOKEN}/`);
  });

  it("reports Telegram errors", async () => {
    const { fetcher } = fakeFetcher(() => json({ ok: false, error_code: 403, description: "Forbidden: bot was blocked by the user" }, 403));
    expect(await sendTelegram("123", "hi", { token: TOKEN, fetcher })).toEqual({
      ok: false,
      error: "telegram 403: Forbidden: bot was blocked by the user",
    });
  });

  it("handles a non-JSON response", async () => {
    const { fetcher } = fakeFetcher(() => new Response("<html>Bad gateway</html>", { status: 502 }));
    expect(await sendTelegram("123", "hi", { token: TOKEN, fetcher })).toEqual({ ok: false, error: "telegram 502: no description" });
  });

  it("never throws and never leaks the token", async () => {
    const fetcher: Fetcher = async (url) => {
      throw new Error(`connect ECONNREFUSED ${url}`);
    };
    const result = await sendTelegram("123", "hi", { token: TOKEN, fetcher });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("ECONNREFUSED");
    expect(result.error).not.toContain(TOKEN);
  });

  it("times out", async () => {
    const fetcher: Fetcher = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
    expect(await sendTelegram("123", "hi", { token: TOKEN, fetcher, timeoutMs: 20 })).toEqual({ ok: false, error: "timeout" });
  });

  it("times out even when the fetcher ignores the abort signal", async () => {
    const fetcher: Fetcher = () => new Promise(() => {});
    const started = Date.now();
    expect(await sendTelegram("123", "hi", { token: TOKEN, fetcher, timeoutMs: 30 })).toEqual({ ok: false, error: "timeout" });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("times out while reading a slow response body", async () => {
    const fetcher: Fetcher = async () =>
      ({ ok: true, status: 200, json: () => new Promise(() => {}) }) as unknown as Response;
    expect(await sendTelegram("123", "hi", { token: TOKEN, fetcher, timeoutMs: 30 })).toEqual({ ok: false, error: "timeout" });
  });

  it("redacts the token in any form an error message may carry", async () => {
    const secret = TOKEN.split(":")[1];
    for (const message of [`GET ${TOKEN}`, `GET ${encodeURIComponent(TOKEN)}`, `bad key ${secret}`]) {
      const fetcher: Fetcher = async () => {
        throw new Error(message);
      };
      const result = await sendTelegram("123", "hi", { token: TOKEN, fetcher });
      expect(result.ok).toBe(false);
      expect(result.error).toContain("***");
      expect(result.error).not.toContain(secret);
    }
  });

  it("reports the network error code from fetch", async () => {
    const fetcher: Fetcher = async () => {
      throw Object.assign(new TypeError("fetch failed"), { cause: Object.assign(new Error("x"), { code: "ECONNRESET" }) });
    };
    expect(await sendTelegram("123", "hi", { token: TOKEN, fetcher })).toEqual({ ok: false, error: "fetch failed (ECONNRESET)" });
  });

  it("treats HTTP 200 without ok: true as a failure", async () => {
    const { fetcher } = fakeFetcher(() => json({ ok: false, description: "Bad Request: chat not found" }));
    expect(await sendTelegram("123", "hi", { token: TOKEN, fetcher })).toEqual({
      ok: false,
      error: "telegram 200: Bad Request: chat not found",
    });
    const empty = fakeFetcher(() => new Response("", { status: 200 }));
    expect((await sendTelegram("123", "hi", { token: TOKEN, fetcher: empty.fetcher })).ok).toBe(false);
  });

  it("accepts channel usernames and trims the chat id and token", async () => {
    const { fetcher, calls } = fakeFetcher(() => json({ ok: true }));
    expect((await sendTelegram(" @tetix_staff ", "hi", { token: ` ${TOKEN}\n`, fetcher })).ok).toBe(true);
    expect(JSON.parse(String(calls[0].init.body)).chat_id).toBe("@tetix_staff");
    expect(calls[0].url).toBe(`https://api.telegram.org/bot${TOKEN}/sendMessage`);
  });

  it("validates input before calling Telegram", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const { fetcher, calls } = fakeFetcher(() => json({ ok: true }));
    expect(await sendTelegram("123", "hi", { fetcher })).toEqual({ ok: false, error: "TELEGRAM_BOT_TOKEN is not set" });
    expect((await sendTelegram("123", "hi", { token: "../../evil", fetcher })).ok).toBe(false);
    expect((await sendTelegram("12/../3", "hi", { token: TOKEN, fetcher })).error).toBe("invalid chat id");
    expect((await sendTelegram("", "hi", { token: TOKEN, fetcher })).error).toBe("invalid chat id");
    expect((await sendTelegram("123", "", { token: TOKEN, fetcher })).ok).toBe(false);
    expect((await sendTelegram("123", "  \n ", { token: TOKEN, fetcher })).ok).toBe(false);
    expect((await sendTelegram("@ab", "hi", { token: TOKEN, fetcher })).error).toBe("invalid chat id");
    expect((await sendTelegram("123", "x".repeat(4096), { token: TOKEN, fetcher })).ok).toBe(true);
    expect((await sendTelegram("123", "x".repeat(4097), { token: TOKEN, fetcher })).ok).toBe(false);
    expect(calls).toHaveLength(1);
  });
});

describe("escapeHtml", () => {
  it("escapes Telegram HTML special characters", () => {
    expect(escapeHtml(`<b>"Tom" & 'Jerry'</b>`)).toBe("&lt;b&gt;&quot;Tom&quot; &amp; 'Jerry'&lt;/b&gt;");
  });
});
