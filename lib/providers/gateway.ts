import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { providerCache, providerCalls } from "@/lib/db/schema";
import { FIXTURE_NOTICE } from "./fixture";
import {
  CACHEABLE_STATUSES,
  categoriesFailure,
  decodeFailure,
  isProviderStatus,
  partsFailure,
  type CategoriesInput,
  type CategoriesResult,
  type DecodeResult,
  type PartsInput,
  type PartsProvider,
  type PartsResult,
  type ProviderMeta,
  type ProviderMode,
  type ProviderOperation,
  type ProviderStatus,
} from "./types";
import {
  OE_HINT,
  VIN_HINT,
  isValidEpc,
  isValidLevel,
  maskOeInput,
  maskVin,
  maskVinsIn,
  normalizeCode,
  normalizeOeInput,
  normalizeVinInput,
} from "./validate";

const DAY_MS = 24 * 3600 * 1000;

// 17VIN bills a VIN once per three months, so a decode is kept for 90 days; catalog pages change more often.
export const CACHE_TTL_MS: Record<ProviderOperation, number> = {
  decode: 90 * DAY_MS,
  categories: 30 * DAY_MS,
  parts: 30 * DAY_MS,
  oe: 30 * DAY_MS,
};
// Coverage grows (Li Auto is announced for November), so "nothing found" and "not supported" are re-checked sooner.
export const NEGATIVE_TTL_MS = 7 * DAY_MS;
export const DEFAULT_DAILY_LIMIT = 200;
// Servers disagree on the time by a little. A row written "in the future" by another instance is still fresh,
// otherwise a cache hit would turn into a second paid call.
const CLOCK_SKEW_MS = 5 * 60 * 1000;

export type GatewayOptions = {
  userId?: string | null;
  now?: Date | (() => Date);
  dailyLimit?: number;
  env?: Record<string, string | undefined>;
  // Runs right before a paid live call, after the cache missed. Throwing refuses the call (e.g. a per-person budget);
  // cache hits and fixture answers are free and never reach it.
  beforeLiveCall?: (operation: ProviderOperation) => Promise<void>;
};

export type ProviderUsage = { mode: ProviderMode; used: number; limit: number | null };

export type ProviderGateway = PartsProvider & {
  readonly dailyLimit: number;
  usage(): Promise<ProviderUsage>;
  // The cached answer for a catalog page, if there is a fresh one; never calls the provider or journals anything.
  peekCategories(input: CategoriesInput): Promise<CategoriesResult | null>;
};

const validLimit = (value: number) => Number.isFinite(value) && value >= 0;

export function dailyLimitFromEnv(env: Record<string, string | undefined> = process.env): number {
  const value = Number(env.TETIX_17VIN_DAILY_LIMIT || DEFAULT_DAILY_LIMIT);
  return validLimit(value) ? Math.floor(value) : DEFAULT_DAILY_LIMIT;
}

export function cacheTtl(operation: ProviderOperation, status: ProviderStatus): number {
  return status === "success" ? CACHE_TTL_MS[operation] : Math.min(CACHE_TTL_MS[operation], NEGATIVE_TTL_MS);
}

function utcDay(now: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

// Post-call writes must not lose an answer that is already paid for. Database errors can echo query
// parameters (the full VIN), so only the error name is logged.
function logWriteError(what: string, error: unknown) {
  console.error(`[providers] ${what} failed: ${error instanceof Error ? error.name : "unknown error"}`);
}

const isResult = (value: unknown): value is ProviderMeta =>
  typeof value === "object" && value !== null && isProviderStatus((value as ProviderMeta).status);

export function createGateway(db: Db, provider: PartsProvider, opts: GatewayOptions = {}): ProviderGateway {
  const fixedNow = opts.now instanceof Date ? opts.now : null;
  const clock = typeof opts.now === "function" ? opts.now : () => fixedNow ?? new Date();
  // NaN or a negative number from a bad config must not switch the limit off.
  const dailyLimit =
    opts.dailyLimit !== undefined && validLimit(opts.dailyLimit)
      ? Math.floor(opts.dailyLimit)
      : dailyLimitFromEnv(opts.env ?? process.env);
  const live = provider.mode === "live";
  // Fixture answers live under their own prefix so they never mix with paid 17VIN answers.
  const prefix = live ? provider.name : "fixture";
  const source = live ? "provider" : "fixture";
  const userId = opts.userId ?? null;

  const local = (status: ProviderStatus, message: string): ProviderMeta => ({
    status,
    message: live ? message : `${FIXTURE_NOTICE}. ${message}`,
    source,
    cached: false,
  });

  async function usedToday(now: Date, executor: Db = db): Promise<number> {
    const { start, end } = utcDay(now);
    const [row] = await executor
      .select({ n: sql<number>`count(*)` })
      .from(providerCalls)
      .where(
        and(
          eq(providerCalls.provider, provider.name),
          eq(providerCalls.mode, "live"),
          gte(providerCalls.createdAt, start),
          lt(providerCalls.createdAt, end),
        ),
      );
    return Number(row?.n ?? 0);
  }

  async function readCache<R extends ProviderMeta>(key: string, operation: ProviderOperation, now: Date): Promise<R | null> {
    const [row] = await db.select().from(providerCache).where(eq(providerCache.key, key)).limit(1);
    if (!row || !isResult(row.result) || !CACHEABLE_STATUSES.includes(row.result.status)) return null;
    const age = now.getTime() - row.fetchedAt.getTime();
    return age > -CLOCK_SKEW_MS && age < cacheTtl(operation, row.result.status) ? (row.result as R) : null;
  }

  async function writeCache(key: string, operation: ProviderOperation, result: ProviderMeta, now: Date) {
    const stored = { ...result };
    delete stored.cached;
    await db
      .insert(providerCache)
      .values({ key, provider: provider.name, operation, result: stored, fetchedAt: now })
      .onConflictDoUpdate({ target: providerCache.key, set: { provider: provider.name, operation, result: stored, fetchedAt: now } });
  }

  // The journal row is written before the call and doubles as the reservation against the daily limit.
  // Live reservations are counted and inserted one at a time under a transaction-scoped advisory lock:
  // parallel requests can neither go over the limit nor refuse each other while budget is left.
  async function reserve(operation: ProviderOperation, inputMask: string, now: Date): Promise<{ id: string } | null> {
    const row = {
      provider: provider.name,
      operation,
      mode: provider.mode,
      inputMask: inputMask.slice(0, 200),
      status: "pending",
      durationMs: 0,
      userId,
      createdAt: now,
    };
    if (!live) {
      const [reserved] = await db.insert(providerCalls).values(row).returning({ id: providerCalls.id });
      return reserved;
    }
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`tetix:provider_calls:${provider.name}`}))`);
      if ((await usedToday(now, tx)) >= dailyLimit) return null;
      const [reserved] = await tx.insert(providerCalls).values(row).returning({ id: providerCalls.id });
      return reserved;
    });
  }

  async function run<R extends ProviderMeta>(
    operation: ProviderOperation,
    key: string,
    inputMask: string,
    call: () => Promise<R>,
    failure: (meta: ProviderMeta) => R,
  ): Promise<R> {
    const now = clock();
    const hit = await readCache<R>(key, operation, now);
    if (hit) return { ...hit, cached: true };
    if (live && opts.beforeLiveCall) await opts.beforeLiveCall(operation);

    const reserved = await reserve(operation, inputMask, now);
    if (!reserved) {
      return failure(
        local("rate_limit", `Дневной лимит запросов к каталогу исчерпан (${dailyLimit}). Попробуйте завтра или запросите ручной подбор`),
      );
    }

    const started = Date.now();
    const crashed = () => failure(local("provider_error", "Сбой при обращении к каталогу. Автоматический повтор отключён"));
    let result: R;
    try {
      const answer: unknown = await call();
      // A provider bug must not leave the journal row pending or put garbage into the cache.
      result = isResult(answer) ? (answer as R) : crashed();
    } catch {
      result = crashed();
    }
    const durationMs = Math.max(0, Math.round(Date.now() - started));

    try {
      await db
        .update(providerCalls)
        .set({ status: result.status, providerCode: result.providerCode ?? null, durationMs })
        .where(eq(providerCalls.id, reserved.id));
    } catch (error) {
      logWriteError("journal update", error);
    }
    if (CACHEABLE_STATUSES.includes(result.status)) {
      try {
        await writeCache(key, operation, result, now);
      } catch (error) {
        logWriteError("cache write", error);
      }
    }
    return { ...result, cached: false };
  }

  const invalid = local("invalid", "Некорректный VIN, каталог или группа");

  function categoriesPage(input: CategoriesInput) {
    const vin = normalizeVinInput(input.vin);
    const parent = input.level > 1 ? normalizeCode(input.parentCode) : null;
    if (!vin || !isValidEpc(input.epc) || !isValidLevel(input.level) || (input.level > 1 && !parent)) return null;
    const { epc, level } = input;
    return { vin, epc, level, parent, key: `${prefix}:cata:${epc}:${level}:${parent ?? ""}:${vin}` };
  }

  return {
    name: provider.name,
    mode: provider.mode,
    dailyLimit,

    async decodeVin(input: string): Promise<DecodeResult> {
      const vin = normalizeVinInput(input);
      if (!vin) return decodeFailure(local("invalid", VIN_HINT));
      return run("decode", `${prefix}:decode:${vin}`, maskVin(vin), () => provider.decodeVin(vin), decodeFailure);
    },

    async categories(input: CategoriesInput): Promise<CategoriesResult> {
      const page = categoriesPage(input);
      if (!page) return categoriesFailure(invalid);
      const { vin, epc, level, parent } = page;
      return run(
        "categories",
        page.key,
        `${maskVin(vin)} ${epc} L${level}${parent ? " " + maskVinsIn(parent) : ""}`,
        () => provider.categories(parent ? { vin, epc, level, parentCode: parent } : { vin, epc, level }),
        categoriesFailure,
      );
    },

    async peekCategories(input: CategoriesInput): Promise<CategoriesResult | null> {
      const page = categoriesPage(input);
      if (!page) return null;
      const hit = await readCache<CategoriesResult>(page.key, "categories", clock());
      return hit ? { ...hit, cached: true } : null;
    },

    async parts(input: PartsInput): Promise<PartsResult> {
      const vin = normalizeVinInput(input.vin);
      const code = normalizeCode(input.categoryCode);
      if (!vin || !code || !isValidEpc(input.epc) || !isValidLevel(input.level)) return partsFailure(invalid);
      const { epc, level } = input;
      return run(
        "parts",
        `${prefix}:part:${epc}:${level}:${code}:${vin}`,
        `${maskVin(vin)} ${epc} L${level} ${maskVinsIn(code)}`,
        () => provider.parts({ vin, epc, level, categoryCode: code }),
        partsFailure,
      );
    },

    async searchOe(input: string): Promise<PartsResult> {
      const oe = normalizeOeInput(input);
      if (!oe) return partsFailure(local("invalid", OE_HINT));
      // OE numbers are not personal data and are journaled as entered, unless the input is really a VIN.
      return run("oe", `${prefix}:oe:${oe}`, maskOeInput(oe), () => provider.searchOe(oe), partsFailure);
    },

    async usage(): Promise<ProviderUsage> {
      if (!live) return { mode: provider.mode, used: 0, limit: null };
      return { mode: provider.mode, used: await usedToday(clock()), limit: dailyLimit };
    },
  };
}
