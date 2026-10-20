export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
export type TelegramResult = { ok: true; error?: undefined } | { ok: false; error: string };
export type TelegramOptions = { token?: string; fetcher?: Fetcher; timeoutMs?: number };

const DEFAULT_TIMEOUT_MS = 8000;
const MAX_TEXT_LENGTH = 4096;
const TOKEN_RE = /^\d{1,20}:[A-Za-z0-9_-]{20,100}$/;
const CHAT_ID_RE = /^(-?\d{1,20}|@[A-Za-z][A-Za-z0-9_]{3,31})$/;

// Telegram's HTML mode only needs <, > and &; quotes are escaped too so the same helper is safe inside href="".
export const escapeHtml = (value: string) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

class TimeoutError extends Error {
  name = "TimeoutError";
}

const describe = (error: unknown) => {
  if (!(error instanceof Error)) return String(error);
  if (error.name === "TimeoutError" || error.name === "AbortError") return "timeout";
  // Node's fetch reports every network failure as "fetch failed"; the cause code is what tells them apart.
  const code = (error as { cause?: { code?: unknown } }).cause?.code;
  return typeof code === "string" && !error.message.includes(code) ? `${error.message} (${code})` : error.message;
};

// The deadline covers the request and reading the body, and holds even for a fetcher that ignores the signal.
async function withDeadline<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      const error = new TimeoutError("timeout");
      controller.abort(error);
      reject(error);
    }, ms);
  });
  try {
    return await Promise.race([run(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

// `text` is HTML: callers escape user content with escapeHtml (renderEvent does this for every event).
export async function sendTelegram(chatId: string, text: string, options: TelegramOptions = {}): Promise<TelegramResult> {
  const token = String(options.token ?? process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  // The token is part of the URL, so it must never leak into returned errors (they end up in logs).
  // Redacting the secret half also covers a percent-encoded URL ("123%3Asecret").
  const secretPart = token.slice(token.indexOf(":") + 1);
  const redact = (message: string) => (secretPart.length >= 8 ? message.split(secretPart).join("***") : message);
  try {
    if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN is not set" };
    if (!TOKEN_RE.test(token)) return { ok: false, error: "TELEGRAM_BOT_TOKEN has an invalid format" };
    const chat = String(chatId ?? "").trim();
    if (!CHAT_ID_RE.test(chat)) return { ok: false, error: "invalid chat id" };
    if (typeof text !== "string" || !text.trim() || text.length > MAX_TEXT_LENGTH)
      return { ok: false, error: "message is empty or too long" };

    const fetcher: Fetcher = options.fetcher ?? ((url, init) => fetch(url, init));
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const { status, httpOk, body } = await withDeadline(timeoutMs, async (signal) => {
      const response = await fetcher(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
        signal,
      });
      const parsed = (await response.json().catch(() => null)) as { ok?: boolean; description?: unknown } | null;
      return { status: response.status, httpOk: response.ok, body: parsed };
    });
    if (httpOk && body?.ok === true) return { ok: true };
    const description = typeof body?.description === "string" ? body.description.slice(0, 200) : "no description";
    return { ok: false, error: redact(`telegram ${status}: ${description}`) };
  } catch (error) {
    return { ok: false, error: redact(describe(error)) };
  }
}
