import { z } from "zod";
import { setSessionCookie } from "@/lib/auth/current";
import { verifyOtp } from "@/lib/auth/otp";
import { createSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { json, readJson, route } from "@/lib/server/http";

const Body = z.object({ phone: z.string().max(40), code: z.string().max(10) });

export const POST = route(async (request) => {
  const { phone, code } = await readJson(request, Body);
  const db = await getDb();
  const user = await verifyOtp(db, phone, code);
  const session = await createSession(db, user.id);
  await setSessionCookie(session.token, session.expiresAt);
  return json({ ok: true, user: { id: user.id, role: user.role, name: user.name } });
});
