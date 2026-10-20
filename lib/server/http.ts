import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { maskVins } from "@/lib/notify/mask";
import { AppError, badRequest, forbidden } from "./errors";

const MAX_JSON_BYTES = 256 * 1024;

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "cache-control": "no-store" } });
}

export function assertSameOrigin(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return;
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw forbidden("Запрос с другого сайта отклонён");
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw forbidden("Запрос с другого сайта отклонён");
  }
}

// The body is read chunk by chunk and dropped as soon as it passes the cap: a chunked upload has no Content-Length,
// and reading it whole first would let one anonymous client fill the server's memory.
export async function readBody(request: Request, maxBytes: number): Promise<Uint8Array> {
  const declared = request.headers.get("content-length");
  if (declared !== null && Number(declared) > maxBytes) throw new AppError(413, "Слишком большой запрос");
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new AppError(413, "Слишком большой запрос");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const text = new TextDecoder().decode(await readBody(request, MAX_JSON_BYTES));
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw badRequest("Некорректные данные");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw badRequest(firstIssue(parsed.error));
  return parsed.data;
}

function firstIssue(error: ZodError) {
  const issue = error.issues[0];
  return issue?.message && !issue.message.startsWith("Expected") && !issue.message.startsWith("Required")
    ? issue.message
    : "Проверьте заполнение формы";
}

// A failed database query carries the SQL and every bound value (phones, VINs, names, messages) in its message, and
// Postgres messages can quote the offending value, so database errors are logged by class and Postgres code only.
// Other errors keep a short message with VINs and long digit runs (phones) masked: "AUTH_SECRET is required" helps.
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error";
  const cause = (error as { cause?: unknown }).cause;
  const code = (cause as { code?: unknown } | undefined)?.code ?? (error as { code?: unknown }).code;
  const pgCode = typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? code : null;
  const causeName = cause instanceof Error && cause.name !== error.name ? ` caused by ${cause.name}` : "";
  const database = Boolean(pgCode) || /query|postgres|pglite|drizzle/i.test(`${error.name} ${causeName}`) || /^Failed query/.test(error.message);
  if (database) return `${error.name}${causeName}${pgCode ? ` (code ${pgCode})` : ""}`;
  const message = maskVins(error.message)
    .replace(/\d{7,}/g, (digits) => `•••${digits.slice(-4)}`)
    .replace(/\s+/g, " ")
    .slice(0, 200);
  return message ? `${error.name}: ${message}` : error.name;
}

type Handler<C> = (request: Request, context: C) => Promise<Response>;

// Wraps a route handler: same-origin check for writes, AppError → JSON, unexpected errors → 500 without details.
export function route<C>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      assertSameOrigin(request);
      return await handler(request, context);
    } catch (error) {
      if (error instanceof AppError) return json({ error: error.message, code: error.code }, error.status);
      console.error("tetix route error", request.method, new URL(request.url).pathname, describeError(error));
      return json({ error: "Не удалось выполнить операцию. Попробуйте ещё раз" }, 500);
    }
  };
}
