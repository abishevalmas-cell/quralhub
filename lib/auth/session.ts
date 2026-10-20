import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { sessions, users, type UserRole } from "@/lib/db/schema";

export const SESSION_COOKIE = "tetix_session";
export const SESSION_TTL_MS = 30 * 24 * 3600 * 1000;

export type Actor = { id: string; role: UserRole; phone: string; name: string | null; company: string | null };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(db: Db, userId: string, now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt, createdAt: now });
  return { token, expiresAt };
}

export async function actorFromToken(db: Db, token: string | undefined | null, now = new Date()): Promise<Actor | null> {
  if (!token || token.length > 200) return null;
  const [row] = await db
    .select({ id: users.id, role: users.role, phone: users.phone, name: users.name, company: users.company })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, now)))
    .limit(1);
  return row ?? null;
}

export async function deleteSession(db: Db, token: string) {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export const isStaff = (actor: Pick<Actor, "role"> | null | undefined) =>
  actor?.role === "sourcer" || actor?.role === "admin";
export const isAdmin = (actor: Pick<Actor, "role"> | null | undefined) => actor?.role === "admin";
