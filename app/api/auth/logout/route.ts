import { cookies } from "next/headers";
import { clearSessionCookie } from "@/lib/auth/current";
import { deleteSession, SESSION_COOKIE } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { json, route } from "@/lib/server/http";

export const POST = route(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(await getDb(), token);
  await clearSessionCookie();
  return json({ ok: true });
});
