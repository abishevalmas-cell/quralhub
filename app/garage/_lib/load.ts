import "server-only";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/server/errors";

// Services answer 404 for cars of other owners; pages turn that into the standard not-found page.
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  let failure: unknown;
  try {
    return await promise;
  } catch (error) {
    failure = error;
  }
  if (failure instanceof AppError && failure.status === 404) notFound();
  throw failure;
}

export type Settled<T> = { ok: true; value: T } | { ok: false; error: AppError };

// Expected refusals (no catalog, a daily limit) are shown on the page as a notice, not as an error screen.
export async function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  let failure: unknown;
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    failure = error;
  }
  if (failure instanceof AppError && failure.status === 404) notFound();
  if (failure instanceof AppError) return { ok: false, error: failure };
  throw failure;
}

// Provider messages in fixture mode start with the fixture notice, which the page already shows on its own.
export function plainMessage(message: string, fixturePrefix: string): string {
  const text = message.startsWith(fixturePrefix) ? message.slice(fixturePrefix.length).replace(/^[.\s]+/, "") : message;
  return text.replace(/[.\s]+$/, "");
}
