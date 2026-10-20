import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { otpCodes, users, type UserRole } from "@/lib/db/schema";
import { badRequest, tooMany } from "@/lib/server/errors";
import { authSecret, DEMO_ADMIN_PHONE, isDemoDeployment } from "@/lib/server/demo";
import { normalizePhone } from "./phone";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_10_MIN = 3;
const MAX_CODES_PER_DAY = 10;
// Every code is a paid SMS once a gateway is set: a cap on all codes per day stops a bot that walks through numbers.
const DEFAULT_CODES_PER_DAY_TOTAL = 2000;
// Codes older than this are of no use to any limit and are deleted while new ones are issued.
const KEEP_CODES_MS = 2 * 24 * 3600 * 1000;
export const OTP_LIMIT_MESSAGE = "Слишком много запросов кода. Попробуйте позже";

export function dailyCodeLimit(env: Record<string, string | undefined> = process.env): number {
  const value = Number(env.OTP_DAILY_LIMIT || DEFAULT_CODES_PER_DAY_TOTAL);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : DEFAULT_CODES_PER_DAY_TOTAL;
}


const hashCode = (phone: string, code: string) =>
  createHash("sha256").update(`${authSecret()}:${phone}:${code}`).digest("hex");

export function adminPhones(): string[] {
  return (process.env.ADMIN_PHONES || (isDemoDeployment() ? DEMO_ADMIN_PHONE : ""))
    .split(",")
    .map((p) => normalizePhone(p))
    .filter((p): p is string => Boolean(p));
}

// The counts and the insert run one phone at a time under a transaction-scoped advisory lock, so a burst of
// parallel requests cannot all pass the limit check before any of them has written its code.
export async function requestOtp(db: Db, rawPhone: string, now = new Date(), env: Record<string, string | undefined> = process.env) {
  const phone = normalizePhone(rawPhone);
  if (!phone) throw badRequest("Проверьте номер: Казахстан и Россия +7, Узбекистан +998, Кыргызстан +996");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`tetix:otp:${phone}`}))`);
    const [counts] = await tx
      .select({
        tenMin: sql<number>`count(*) filter (where ${otpCodes.createdAt} > ${new Date(now.getTime() - 10 * 60 * 1000)})`,
        day: sql<number>`count(*)`,
      })
      .from(otpCodes)
      .where(and(eq(otpCodes.phone, phone), gt(otpCodes.createdAt, dayAgo)));
    if (Number(counts?.tenMin) >= MAX_CODES_PER_10_MIN) throw tooMany("Слишком много кодов. Подождите 10 минут");
    if (Number(counts?.day) >= MAX_CODES_PER_DAY) throw tooMany("Лимит кодов на сегодня исчерпан. Попробуйте завтра");
    const [total] = await tx.select({ n: sql<number>`count(*)` }).from(otpCodes).where(gt(otpCodes.createdAt, dayAgo));
    if (Number(total?.n) >= dailyCodeLimit(env)) {
      console.error("[tetix] daily login code limit reached");
      throw tooMany(OTP_LIMIT_MESSAGE);
    }
    await tx.insert(otpCodes).values({
      phone,
      codeHash: hashCode(phone, code),
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      createdAt: now,
    });
  });
  await db.delete(otpCodes).where(lt(otpCodes.createdAt, new Date(now.getTime() - KEEP_CODES_MS)));
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
  // The attempt is counted before the code is compared, in one conditional UPDATE: parallel guesses each take
  // one of the MAX_ATTEMPTS slots or get nothing, so a burst cannot check more codes than the limit allows.
  const [counted] = await db
    .update(otpCodes)
    .set({ attempts: sql`${otpCodes.attempts} + 1` })
    .where(and(eq(otpCodes.id, row.id), isNull(otpCodes.consumedAt), lt(otpCodes.attempts, MAX_ATTEMPTS)))
    .returning({ id: otpCodes.id });
  if (!counted) {
    const [current] = await db.select({ consumedAt: otpCodes.consumedAt }).from(otpCodes).where(eq(otpCodes.id, row.id)).limit(1);
    if (current?.consumedAt) throw badRequest("Код уже использован. Запросите новый");
    throw tooMany("Слишком много попыток. Запросите новый код");
  }
  const expected = Buffer.from(row.codeHash, "hex");
  const actual = Buffer.from(hashCode(phone, code), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw badRequest("Неверный код");
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
