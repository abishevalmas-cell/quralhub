import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDb } from "@/lib/db";
import { forbidden, unauthorized } from "@/lib/server/errors";
import { actorFromToken, isStaff, SESSION_COOKIE, type Actor } from "./session";

export const getActor = cache(async (): Promise<Actor | null> => {
  const store = await cookies();
  return actorFromToken(await getDb(), store.get(SESSION_COOKIE)?.value);
});

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw unauthorized();
  return actor;
}

export async function requireStaff(): Promise<Actor> {
  const actor = await requireActor();
  if (!isStaff(actor)) throw forbidden("Раздел доступен подборщикам");
  return actor;
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
