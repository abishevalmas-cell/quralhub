import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
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

export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_JSON_BYTES) throw new AppError(413, "Слишком большой запрос");
  const text = await request.text();
  if (text.length > MAX_JSON_BYTES) throw new AppError(413, "Слишком большой запрос");
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

type Handler<C> = (request: Request, context: C) => Promise<Response>;

// Wraps a route handler: same-origin check for writes, AppError → JSON, unexpected errors → 500 without details.
export function route<C>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      assertSameOrigin(request);
      return await handler(request, context);
    } catch (error) {
      if (error instanceof AppError) return json({ error: error.message, code: error.code }, error.status);
      console.error("tetix route error", request.method, new URL(request.url).pathname, (error as Error)?.message);
      return json({ error: "Не удалось выполнить операцию. Попробуйте ещё раз" }, 500);
    }
  };
}
