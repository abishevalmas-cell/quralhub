import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { Actor } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import { providerCalls, vehicles, type FitmentLevel } from "@/lib/db/schema";
import {
  CATEGORY_LEVELS,
  createGateway,
  getProvider,
  type CatalogPart,
  type Category,
  type CategoryLevel,
  type PartsProvider,
  type ProviderSource,
  type ProviderStatus,
} from "@/lib/providers";
import { badRequest, tooMany } from "@/lib/server/errors";
import { loadVehicleForOwner } from "./access";

type Vehicle = typeof vehicles.$inferSelect;

export type CatalogDeps = { provider?: PartsProvider; now?: Date };

export type CatalogReason = "no_vin" | "manual" | "unsupported" | "no_epc" | "likely_unavailable";
export type CatalogAvailability = { available: boolean; reason: CatalogReason | null };

type AvailabilityInput = Pick<Vehicle, "vin" | "decodeStatus" | "epc" | "epcId">;

// Whether the VIN catalog can be opened for this car. "likely_unavailable" is only a warning: in the 17VIN trial
// every Li Auto and Zeekr VIN decoded with epc_id "0" and then had no catalog, but browsing is still allowed.
export function catalogAvailability(vehicle: AvailabilityInput): CatalogAvailability {
  if (vehicle.decodeStatus === "manual") return { available: false, reason: "manual" };
  if (!vehicle.vin) return { available: false, reason: "no_vin" };
  if (vehicle.decodeStatus === "unsupported") return { available: false, reason: "unsupported" };
  if (!vehicle.epc || (vehicle.decodeStatus !== "decoded" && vehicle.decodeStatus !== "ambiguous"))
    return { available: false, reason: "no_epc" };
  if (vehicle.epcId === "0") return { available: true, reason: "likely_unavailable" };
  return { available: true, reason: null };
}

const UNAVAILABLE: Record<Exclude<CatalogReason, "likely_unavailable">, string> = {
  manual: "Машина добавлена без VIN: каталог по VIN для неё не открыть",
  no_vin: "У машины нет VIN: каталог по VIN для неё не открыть",
  unsupported: "Для этой машины у поставщика нет каталога",
  no_epc: "VIN ещё не расшифрован, поэтому каталог недоступен. Повторите расшифровку",
};

type TrimInput = Pick<Vehicle, "decodeStatus" | "candidates" | "selectedCandidateId">;

// The owner picked one of several trims the VIN matches. The provider still answered for the VIN, not the trim.
export function ownerSelectedTrim(vehicle: TrimInput): boolean {
  return (
    vehicle.decodeStatus === "ambiguous" &&
    Boolean(vehicle.selectedCandidateId) &&
    vehicle.candidates.some((c) => c.id === vehicle.selectedCandidateId)
  );
}

// The trim is unambiguous when the VIN matched one trim, or the owner confirmed theirs from the list.
export function trimConfirmed(vehicle: TrimInput): boolean {
  return vehicle.decodeStatus === "decoded" || ownerSelectedTrim(vehicle);
}

// "Подходит по VIN" only when the provider lists the part for this VIN and the trim is unambiguous.
// When the owner chose the trim, the provider's flag still covers every trim of the VIN, so a part that is
// listed only for some options (model_optional / model_not_optional) needs a sourcer's check.
export function partFitment(
  part: Pick<CatalogPart, "providerFit" | "modelOptional" | "modelNotOptional">,
  vehicle: TrimInput,
): Exclude<FitmentLevel, "manual"> {
  if (!part.providerFit) return "needs_check";
  if (vehicle.decodeStatus === "decoded") return "vin_confirmed";
  if (ownerSelectedTrim(vehicle) && !part.modelOptional && !part.modelNotOptional) return "vin_confirmed";
  return "needs_check";
}

// Per-person cap on paid provider calls, on top of the gateway's shared daily limit: one account clicking
// through the catalog must not use up the budget of everyone else. Cached answers are free and not counted, so the
// check runs inside the gateway right before a live call (budgetedGateway), never in front of a cache hit.
export const USER_DAILY_LIVE_CALLS: Record<"customer" | "master", number> = { customer: 60, master: 150 };

function utcDay(now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return { start, end: new Date(start.getTime() + 24 * 3600 * 1000) };
}

export async function assertProviderBudget(
  db: Db,
  actor: Actor,
  provider: PartsProvider,
  now: Date,
  message = "Сегодня вы открыли много страниц каталога. Продолжите завтра или оставьте заявку на ручной подбор",
) {
  if (provider.mode !== "live" || isStaff(actor)) return;
  const limit = USER_DAILY_LIVE_CALLS[actor.role === "master" ? "master" : "customer"];
  const { start, end } = utcDay(now);
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(providerCalls)
    .where(
      and(
        eq(providerCalls.userId, actor.id),
        eq(providerCalls.provider, provider.name),
        eq(providerCalls.mode, "live"),
        gte(providerCalls.createdAt, start),
        lt(providerCalls.createdAt, end),
      ),
    );
  if (Number(row?.n ?? 0) >= limit) throw tooMany(message);
}

// A gateway that refuses a paid call once the person is over their daily budget; cached pages stay open.
export function budgetedGateway(db: Db, actor: Actor, provider: PartsProvider, now: Date, message?: string) {
  return createGateway(db, provider, {
    userId: actor.id,
    now,
    beforeLiveCall: () => assertProviderBudget(db, actor, provider, now, message),
  });
}

export function catalogSource(deps: CatalogDeps = {}): ProviderSource {
  return (deps.provider ?? getProvider()).mode === "live" ? "provider" : "fixture";
}

export type CatalogAnswer = {
  ok: boolean;
  status: ProviderStatus;
  message: string;
  source: ProviderSource;
  availability: CatalogAvailability;
};

export type CatalogCategory = Category;
export type FittedPart = CatalogPart & { fitment: Exclude<FitmentLevel, "manual"> };

const isLevel = (value: unknown): value is CategoryLevel => (CATEGORY_LEVELS as readonly unknown[]).includes(value);

async function openCatalog(db: Db, actor: Actor, vehicleId: string, deps: CatalogDeps) {
  const vehicle = await loadVehicleForOwner(db, actor, vehicleId);
  const availability = catalogAvailability(vehicle);
  if (!availability.available) {
    const reason = availability.reason as keyof typeof UNAVAILABLE;
    throw badRequest(UNAVAILABLE[reason], `catalog_${reason}`);
  }
  const provider = deps.provider ?? getProvider();
  const now = deps.now ?? new Date();
  const gateway = budgetedGateway(db, actor, provider, now);
  return { vehicle: vehicle as Vehicle & { vin: string; epc: string }, availability, gateway };
}

function checkLevel(level: unknown): CategoryLevel {
  if (!isLevel(level)) throw badRequest("Уровень каталога должен быть от 1 до 4", "invalid_level");
  return level;
}

function checkCode(code: unknown, what: string): string {
  const value = typeof code === "string" ? code.trim() : "";
  if (!value || value.length > 160) throw badRequest(`Не указана ${what}`, "invalid_code");
  return value;
}

export async function getCategories(
  db: Db,
  actor: Actor,
  vehicleId: string,
  input: { level: number; parentCode?: string | null },
  deps: CatalogDeps = {},
): Promise<CatalogAnswer & { vehicle: Vehicle; categories: CatalogCategory[] }> {
  const level = checkLevel(input.level);
  const parentCode = level > 1 ? checkCode(input.parentCode, "группа каталога") : undefined;
  const { vehicle, availability, gateway } = await openCatalog(db, actor, vehicleId, deps);
  const result = await gateway.categories({ vin: vehicle.vin, epc: vehicle.epc, level, ...(parentCode ? { parentCode } : {}) });
  return {
    vehicle,
    ok: result.status === "success",
    status: result.status,
    message: result.message,
    source: result.source,
    availability,
    categories: result.categories,
  };
}

export async function getParts(
  db: Db,
  actor: Actor,
  vehicleId: string,
  input: { categoryCode: string; level: number },
  deps: CatalogDeps = {},
): Promise<CatalogAnswer & { vehicle: Vehicle; parts: FittedPart[] }> {
  const level = checkLevel(input.level);
  const categoryCode = checkCode(input.categoryCode, "группа деталей");
  const { vehicle, availability, gateway } = await openCatalog(db, actor, vehicleId, deps);
  const result = await gateway.parts({ vin: vehicle.vin, epc: vehicle.epc, categoryCode, level });
  return {
    vehicle,
    ok: result.status === "success",
    status: result.status,
    message: result.message,
    source: result.source,
    availability,
    parts: result.parts.map((part) => ({ ...part, fitment: partFitment(part, vehicle) })),
  };
}

// OE search across all catalogs is not tied to a VIN, so nothing found here is confirmed for a car.
export async function searchOe(
  db: Db,
  actor: Actor,
  oe: string,
  deps: CatalogDeps = {},
): Promise<Omit<CatalogAnswer, "availability"> & { parts: FittedPart[] }> {
  const provider = deps.provider ?? getProvider();
  const now = deps.now ?? new Date();
  if (typeof oe !== "string" || !oe.trim() || oe.length > 100)
    throw badRequest("Введите номер OE: латинские буквы, цифры, дефис или точка", "invalid_oe");
  const result = await budgetedGateway(db, actor, provider, now).searchOe(oe);
  if (result.status === "invalid") throw badRequest("Проверьте номер OE: латинские буквы, цифры, пробел, дефис, точка или слеш", "invalid_oe");
  return {
    ok: result.status === "success",
    status: result.status,
    message: result.message,
    source: result.source,
    parts: result.parts.map((part) => ({ ...part, fitment: "needs_check" as const })),
  };
}
