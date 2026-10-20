import { and, count, desc, eq, gte, ilike, inArray, lt, notInArray, or, sql, type SQL } from "drizzle-orm";
import { adminPhones } from "@/lib/auth/otp";
import { formatPhone } from "@/lib/auth/phone";
import { isAdmin, type Actor } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import {
  ORDER_STATUSES,
  orders,
  partRequests,
  providerCache,
  requestMessages,
  providerCalls,
  REQUEST_STATUSES,
  sessions,
  USER_ROLES,
  users,
  type OrderStatus,
  type RequestStatus,
  type UserRole,
} from "@/lib/db/schema";
import { getPricingSettings, PricingSettingsSchema, savePricingSettings, type PricingSettings } from "@/lib/pricing";
import { dailyLimitFromEnv, getProvider, type PartsProvider, type ProviderMode } from "@/lib/providers";
import { AppError, badRequest, conflict, forbidden, notFound } from "@/lib/server/errors";
import { ASTANA_OFFSET_MS } from "@/lib/utils";
import { maskVin } from "@/lib/vin";
import { isUuid } from "./access";

// The admin's side: who works here and in which role, the pricing formula, the 17VIN budget and a summary.
// Every function checks the admin role itself; sourcers get 403 like customers.

export const ADMIN_ONLY = "Раздел доступен администратору";
export const ROLE_MESSAGE = "Выберите роль: клиент, мастер, подборщик или администратор";
export const OWN_ROLE_MESSAGE = "Свою роль изменить нельзя. Попросите другого администратора";
export const USER_NOT_FOUND = "Пользователь не найден";
export const RATE_DATE_MESSAGE = "Дата курса не может быть позже завтрашнего дня";

export const USERS_LIMIT = 100;
export const USER_SEARCH_MAX = 100;
export const JOURNAL_LIMIT = 50;

const DAY_MS = 24 * 3600 * 1000;
// Kazakhstan has one time zone, UTC+5, since March 2024 (lib/utils.ts). Fixed offset: no dependence on tz data.
export { ASTANA_OFFSET_MS };

function assertAdmin(actor: Actor) {
  if (!isAdmin(actor)) throw forbidden(ADMIN_ONLY);
}

export const isUserRole = (value: unknown): value is UserRole =>
  typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);

// Customer and master are the same level of rights: switching between them is not a demotion.
const ROLE_RANK: Record<UserRole, number> = { customer: 0, master: 0, sourcer: 1, admin: 2 };

// "staff" lists sourcers and admins together.
export const ROLE_FILTERS = [...USER_ROLES, "staff"] as const;
export type RoleFilter = (typeof ROLE_FILTERS)[number];
export const isRoleFilter = (value: unknown): value is RoleFilter =>
  typeof value === "string" && (ROLE_FILTERS as readonly string[]).includes(value);

const STAFF_ROLES: UserRole[] = ["sourcer", "admin"];
const FINISHED_REQUESTS: RequestStatus[] = ["closed", "cancelled"];

// "YYYY-MM-DD" in Astana time.
export function astanaDate(now: Date): string {
  return new Date(now.getTime() + ASTANA_OFFSET_MS).toISOString().slice(0, 10);
}

function utcDay(now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

// ---------------------------------------------------------------------------------------------------------------------
// Users and roles

export type AdminUser = {
  id: string;
  phone: string; // formatted: +7 701 123 45 67
  name: string | null;
  company: string | null;
  city: string | null;
  role: UserRole;
  createdAt: Date;
  requests: number;
  orders: number;
  // Open requests this person is assigned to as a sourcer.
  assignedOpen: number;
  // The phone is in ADMIN_PHONES: the admin role comes back at the next login whatever is set here.
  adminByEnv: boolean;
};

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => "\\" + c);

// Counts come from grouped subqueries joined by user id. (A correlated subquery in the select list would not
// work here: drizzle leaves columns of a single-table query unqualified, so "id" would bind to the inner table.)
function selectUsers(db: Db) {
  const requestCounts = db
    .select({ userId: partRequests.customerId, n: count().as("requests_n") })
    .from(partRequests)
    .groupBy(partRequests.customerId)
    .as("request_counts");
  const orderCounts = db
    .select({ userId: orders.customerId, n: count().as("orders_n") })
    .from(orders)
    .groupBy(orders.customerId)
    .as("order_counts");
  const assignedCounts = db
    .select({ userId: partRequests.assignedTo, n: count().as("assigned_n") })
    .from(partRequests)
    .where(notInArray(partRequests.status, FINISHED_REQUESTS))
    .groupBy(partRequests.assignedTo)
    .as("assigned_counts");
  return db
    .select({
      id: users.id,
      phone: users.phone,
      name: users.name,
      company: users.company,
      city: users.city,
      role: users.role,
      createdAt: users.createdAt,
      requests: sql<number>`coalesce(${requestCounts.n}, 0)`.mapWith(Number),
      orders: sql<number>`coalesce(${orderCounts.n}, 0)`.mapWith(Number),
      assignedOpen: sql<number>`coalesce(${assignedCounts.n}, 0)`.mapWith(Number),
    })
    .from(users)
    .leftJoin(requestCounts, eq(requestCounts.userId, users.id))
    .leftJoin(orderCounts, eq(orderCounts.userId, users.id))
    .leftJoin(assignedCounts, eq(assignedCounts.userId, users.id));
}

type UserRow = Omit<AdminUser, "adminByEnv"> & { phone: string };

function toAdminUser(row: UserRow, pinned: Set<string>): AdminUser {
  return { ...row, phone: formatPhone(row.phone), adminByEnv: pinned.has(row.phone) };
}

// Name, company and city by substring; the phone by its digits ("+7 701 123", "4567"), including the local "8 701…".
function searchCondition(q: string): SQL {
  const pattern = `%${escapeLike(q)}%`;
  const conditions: SQL[] = [ilike(users.name, pattern), ilike(users.company, pattern), ilike(users.city, pattern)];
  const digits = q.replace(/\D/g, "");
  if (digits.length >= 3) {
    conditions.push(sql`${users.phone} like ${`%${digits}%`}`);
    if (digits.length >= 4 && digits.startsWith("8")) conditions.push(sql`${users.phone} like ${`7${digits.slice(1)}%`}`);
  }
  return or(...conditions)!;
}

export async function listUsers(
  db: Db,
  actor: Actor,
  input: { q?: string | null; role?: string | null } = {},
): Promise<{ users: AdminUser[]; truncated: boolean }> {
  assertAdmin(actor);
  const q = String(input.q ?? "").replace(/\s+/g, " ").trim().slice(0, USER_SEARCH_MAX);
  const role = input.role || null;
  if (role !== null && !isRoleFilter(role)) throw badRequest(ROLE_MESSAGE, "invalid_role");

  const where: SQL[] = [];
  if (role === "staff") where.push(inArray(users.role, STAFF_ROLES));
  else if (role) where.push(eq(users.role, role));
  if (q) where.push(searchCondition(q));

  const rows = await selectUsers(db)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(users.createdAt), desc(users.id))
    .limit(USERS_LIMIT + 1);
  const pinned = new Set(adminPhones());
  return { users: rows.slice(0, USERS_LIMIT).map((row) => toAdminUser(row, pinned)), truncated: rows.length > USERS_LIMIT };
}

async function loadAdminUser(db: Db, userId: string): Promise<AdminUser> {
  const [row] = await selectUsers(db).where(eq(users.id, userId)).limit(1);
  if (!row) throw notFound(USER_NOT_FOUND);
  return toAdminUser(row, new Set(adminPhones()));
}

async function releaseAssignments(tx: Db, userId: string, now: Date): Promise<number> {
  const released = await tx
    .update(partRequests)
    .set({
      assignedTo: null,
      status: sql`case when ${partRequests.status} = 'searching' then 'new' else ${partRequests.status} end`,
      version: sql`${partRequests.version} + 1`,
      updatedAt: now,
    })
    .where(and(eq(partRequests.assignedTo, userId), notInArray(partRequests.status, FINISHED_REQUESTS)))
    .returning({ id: partRequests.id });
  if (released.length)
    await tx.insert(requestMessages).values(
      released.map((r) => ({
        requestId: r.id,
        kind: "system" as const,
        internal: true,
        body: "Подборщик больше не в команде. Заявка вернулась в очередь",
        createdAt: now,
      })),
    );
  return released.length;
}

// Staff roles are granted only here. An admin cannot change their own role, so there is always an admin left.
// The log line names ids and roles only: no phone, no name.
export async function setUserRole(db: Db, actor: Actor, userId: string, role: unknown, now = new Date()): Promise<AdminUser> {
  assertAdmin(actor);
  if (!isUserRole(role)) throw badRequest(ROLE_MESSAGE, "invalid_role");
  if (!isUuid(userId)) throw notFound(USER_NOT_FOUND);
  if (userId === actor.id) throw new AppError(403, OWN_ROLE_MESSAGE, "own_role");
  const [current] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  if (!current) throw notFound(USER_NOT_FOUND);
  if (current.role !== role) {
    // Losing staff rights also ends every session: if the account was taken over, the old cookies stop working.
    const demoted = ROLE_RANK[role] < ROLE_RANK[current.role] && ROLE_RANK[current.role] > 0;
    const leftStaff = STAFF_ROLES.includes(current.role) && !STAFF_ROLES.includes(role);
    const { ended, released } = await db.transaction(async (tx) => {
      const changed = await tx
        .update(users)
        .set({ role, updatedAt: now })
        .where(and(eq(users.id, userId), eq(users.role, current.role)))
        .returning({ id: users.id });
      if (!changed.length) throw conflict("Роль уже изменил другой администратор. Обновите страницу");
      // Someone who left the team keeps no requests: other sourcers could not take them, and staff notifications
      // with customers' messages would keep going to them. A search goes back to the "new" queue.
      const released = leftStaff ? await releaseAssignments(tx, userId, now) : 0;
      if (!demoted) return { ended: 0, released };
      return { ended: (await tx.delete(sessions).where(eq(sessions.userId, userId)).returning({ id: sessions.id })).length, released };
    });
    console.info(
      `[tetix] admin ${actor.id} changed the role of user ${userId}: ${current.role} -> ${role}` +
        (demoted ? `, ended ${ended} sessions` : "") +
        (released ? `, released ${released} requests` : ""),
    );
  }
  return loadAdminUser(db, userId);
}

// ---------------------------------------------------------------------------------------------------------------------
// Pricing

export async function getPricing(db: Db, actor: Actor): Promise<PricingSettings> {
  assertAdmin(actor);
  return getPricingSettings(db);
}

// The next day's National Bank rate may already be published, so tomorrow (Astana time) is the latest valid date.
export async function savePricing(db: Db, actor: Actor, input: unknown, now = new Date()): Promise<PricingSettings> {
  assertAdmin(actor);
  const parsed = PricingSettingsSchema.safeParse(input);
  if (parsed.success && parsed.data.cnyRateDate > astanaDate(new Date(now.getTime() + DAY_MS)))
    throw badRequest(RATE_DATE_MESSAGE, "invalid_pricing_settings");
  const saved = await savePricingSettings(db, input, now);
  console.info(`[tetix] admin ${actor.id} saved pricing settings`);
  return saved;
}

// ---------------------------------------------------------------------------------------------------------------------
// 17VIN

export type ProviderStatusDeps = { provider?: PartsProvider; env?: Record<string, string | undefined>; now?: Date };

export type ProviderCallRow = {
  id: string;
  provider: string;
  operation: string;
  mode: ProviderMode;
  inputMask: string;
  status: string;
  providerCode: number | null;
  durationMs: number;
  createdAt: Date;
};

export type ProviderStatusReport = {
  mode: ProviderMode;
  provider: string;
  dailyLimit: number;
  // Journal rows of the current provider and mode in the current UTC day; in live mode exactly what the
  // gateway counts against dailyLimit. Cache hits are not journaled and cost nothing.
  callsToday: number;
  resetsAt: Date;
  lastCalls: ProviderCallRow[];
  cacheEntries: number;
};

const VIN_SHAPE = /^[A-HJ-NPR-Z0-9]{17}$/;
// The gateway masks inputs before writing them. This second pass covers rows written any other way.
const maskVinTokens = (value: string) =>
  value.replace(/[A-Za-z0-9]+/g, (run) => (VIN_SHAPE.test(run.toUpperCase()) ? maskVin(run) : run));

// Credentials are never part of the answer: only the mode they result in.
export async function providerStatus(db: Db, actor: Actor, deps: ProviderStatusDeps = {}): Promise<ProviderStatusReport> {
  assertAdmin(actor);
  const env = deps.env ?? process.env;
  const provider = deps.provider ?? getProvider(env);
  const { start, end } = utcDay(deps.now ?? new Date());
  const [[today], [cache], calls] = await Promise.all([
    db
      .select({ n: count() })
      .from(providerCalls)
      .where(
        and(
          eq(providerCalls.provider, provider.name),
          eq(providerCalls.mode, provider.mode),
          gte(providerCalls.createdAt, start),
          lt(providerCalls.createdAt, end),
        ),
      ),
    db.select({ n: count() }).from(providerCache),
    db
      .select({
        id: providerCalls.id,
        provider: providerCalls.provider,
        operation: providerCalls.operation,
        mode: providerCalls.mode,
        inputMask: providerCalls.inputMask,
        status: providerCalls.status,
        providerCode: providerCalls.providerCode,
        durationMs: providerCalls.durationMs,
        createdAt: providerCalls.createdAt,
      })
      .from(providerCalls)
      .orderBy(desc(providerCalls.createdAt), desc(providerCalls.id))
      .limit(JOURNAL_LIMIT),
  ]);
  return {
    mode: provider.mode,
    provider: provider.name,
    dailyLimit: dailyLimitFromEnv(env),
    callsToday: Number(today?.n ?? 0),
    resetsAt: end,
    lastCalls: calls.map((call) => ({ ...call, inputMask: maskVinTokens(call.inputMask) })),
    cacheEntries: Number(cache?.n ?? 0),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Summary

export type Dashboard = {
  requestsByStatus: Record<RequestStatus, number>;
  ordersByStatus: Record<OrderStatus, number>;
  usersByRole: Record<UserRole, number>;
  requestsLast7Days: number;
  totals: { requests: number; orders: number; users: number };
};

function tally<K extends string>(keys: readonly K[], rows: { key: string; n: number }[]) {
  const result = Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
  let total = 0;
  for (const row of rows) {
    const n = Number(row.n);
    total += n;
    if ((keys as readonly string[]).includes(row.key)) result[row.key as K] += n;
  }
  return { result, total };
}

export async function dashboard(db: Db, actor: Actor, now = new Date()): Promise<Dashboard> {
  assertAdmin(actor);
  const since = new Date(now.getTime() - 7 * DAY_MS);
  const [requestRows, orderRows, userRows, [recent]] = await Promise.all([
    db.select({ key: partRequests.status, n: count() }).from(partRequests).groupBy(partRequests.status),
    db.select({ key: orders.status, n: count() }).from(orders).groupBy(orders.status),
    db.select({ key: users.role, n: count() }).from(users).groupBy(users.role),
    db.select({ n: count() }).from(partRequests).where(gte(partRequests.createdAt, since)),
  ]);
  const requests = tally(REQUEST_STATUSES, requestRows);
  const orderTally = tally(ORDER_STATUSES, orderRows);
  const userTally = tally(USER_ROLES, userRows);
  return {
    requestsByStatus: requests.result,
    ordersByStatus: orderTally.result,
    usersByRole: userTally.result,
    requestsLast7Days: Number(recent?.n ?? 0),
    totals: { requests: requests.total, orders: orderTally.total, users: userTally.total },
  };
}
