import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { otpCodes, users, type UserRole } from "@/lib/db/schema";
import { badRequest, tooMany } from "@/lib/server/errors";
import { normalizePhone } from "./phone";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_10_MIN = 3;
const MAX_CODES_PER_DAY = 10;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is required in production");
  return value || "tetix-dev-secret";
}

const hashCode = (phone: string, code: string) =>
  createHash("sha256").update(`${secret()}:${phone}:${code}`).digest("hex");

export function adminPhones(): string[] {
  return (process.env.ADMIN_PHONES || "")
    .split(",")
    .map((p) => normalizePhone(p))
    .filter((p): p is string => Boolean(p));
}

export async function requestOtp(db: Db, rawPhone: string, now = new Date()) {
  const phone = normalizePhone(rawPhone);
  if (!phone) throw badRequest("Проверьте номер: Казахстан и Россия +7, Узбекистан +998, Кыргызстан +996");
  const recent = await db
    .select({
      tenMin: sql<number>`count(*) filter (where ${otpCodes.createdAt} > ${new Date(now.getTime() - 10 * 60 * 1000)})`,
      day: sql<number>`count(*)`,
    })
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), gt(otpCodes.createdAt, new Date(now.getTime() - 24 * 3600 * 1000))));
  const counts = recent[0];
  if (Number(counts?.tenMin) >= MAX_CODES_PER_10_MIN) throw tooMany("Слишком много кодов. Подождите 10 минут");
  if (Number(counts?.day) >= MAX_CODES_PER_DAY) throw tooMany("Лимит кодов на сегодня исчерпан. Попробуйте завтра");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(otpCodes).values({
    phone,
    codeHash: hashCode(phone, code),
    expiresAt: new Date(now.getTime() + CODE_TTL_MS),
    createdAt: now,
  });
  return { phone, code };
}

export async function verifyOtp(db: Db, rawPhone: string, rawCode: string, now = new Date()) {
  const phone = normalizePhone(rawPhone);
  const code = String(rawCode ?? "").replace(/\D/g, "");
  if (!phone || code.length !== 6) throw badRequest("Введите 6 цифр из сообщения");
  const [row] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), isNull(otpCodes.consumedAt), gt(otpCodes.expiresAt, now)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  if (!row) throw badRequest("Код устарел. Запросите новый");
  if (row.attempts >= MAX_ATTEMPTS) throw tooMany("Слишком много попыток. Запросите новый код");
  const expected = Buffer.from(row.codeHash, "hex");
  const actual = Buffer.from(hashCode(phone, code), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    await db.update(otpCodes).set({ attempts: row.attempts + 1 }).where(eq(otpCodes.id, row.id));
    throw badRequest("Неверный код");
  }
  const consumed = await db
    .update(otpCodes)
    .set({ consumedAt: now })
    .where(and(eq(otpCodes.id, row.id), isNull(otpCodes.consumedAt)))
    .returning({ id: otpCodes.id });
  if (!consumed.length) throw badRequest("Код уже использован. Запросите новый");

  const isAdmin = adminPhones().includes(phone);
  const [existing] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (existing) {
    if (isAdmin && existing.role !== "admin") {
      const [updated] = await db
        .update(users)
        .set({ role: "admin", updatedAt: now })
        .where(eq(users.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }
  const role: UserRole = isAdmin ? "admin" : "customer";
  const [created] = await db
    .insert(users)
    .values({ phone, role })
    .onConflictDoUpdate({ target: users.phone, set: { updatedAt: now } })
    .returning();
  return created;
}
