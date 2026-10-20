import { and, count, desc, eq, isNotNull, max } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { fitments } from "@/lib/db/schema";
import { normalizeOe } from "@/lib/providers";
import { badRequest } from "@/lib/server/errors";
import { getPartType } from "@/lib/taxonomy";
import { hasValidCheckDigit, normalizeVin, VIN_CHARSET, VIN_LENGTH } from "@/lib/vin";

// Our own compatibility base. These are low-level helpers without an actor: callers check permissions.
// recordFitment and fitmentsForVin handle VINs (personal data) and are for server code and staff screens only;
// fitmentSummaryForOe returns no VINs and is safe to show to anyone.

export const FITMENT_SOURCES = ["catalog", "sourcer", "install_feedback"] as const;
export type FitmentSource = (typeof FITMENT_SOURCES)[number];
export const FITMENT_RESULTS = ["fits", "not_fits", "unknown"] as const;
export type FitmentResult = (typeof FITMENT_RESULTS)[number];

export const FITMENT_LIMITS = { oeMax: 40, textMax: 120, yearMin: 1950, yearMax: 2100 } as const;

export type FitmentInput = {
  oe: string;
  result: FitmentResult;
  source: FitmentSource;
  vin?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  trim?: string | null;
  partTypeId?: string | null;
  orderId?: string | null;
  createdBy?: string | null;
};

type FitmentRow = typeof fitments.$inferSelect;

// One spelling per number: "14921518-00", "1492151800" and "14921518 00" are the same part.
export function fitmentOeKey(raw: string | null | undefined): string | null {
  const oe = normalizeOe(String(raw ?? ""));
  if (!oe || oe.length > FITMENT_LIMITS.oeMax) return null;
  // A VIN typed into an OE field must not end up in a column nobody masks.
  if (oe.length === VIN_LENGTH && VIN_CHARSET.test(oe) && hasValidCheckDigit(oe)) return null;
  return oe;
}

// Chinese VINs often fail the check digit, and the garage accepts them with a warning, so only the shape is checked.
export function fitmentVin(raw: string | null | undefined): string | null {
  const vin = normalizeVin(raw);
  return vin.length === VIN_LENGTH && VIN_CHARSET.test(vin) ? vin : null;
}

const text = (value: string | null | undefined) => {
  const s = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s ? s.slice(0, FITMENT_LIMITS.textMax) : null;
};

export async function recordFitment(db: Db, input: FitmentInput): Promise<FitmentRow> {
  const oe = fitmentOeKey(input.oe);
  if (!oe) throw badRequest("Укажите номер OE детали: латинские буквы и цифры, до 40 символов");
  if (!FITMENT_RESULTS.includes(input.result)) throw badRequest("Неизвестный результат проверки совместимости");
  if (!FITMENT_SOURCES.includes(input.source)) throw badRequest("Неизвестный источник данных о совместимости");
  let vin: string | null = null;
  if (input.vin != null && String(input.vin).trim()) {
    vin = fitmentVin(input.vin);
    if (!vin) throw badRequest("Проверьте VIN: 17 латинских букв и цифр без I, O и Q");
  }
  const year = input.year ?? null;
  if (year !== null && (!Number.isInteger(year) || year < FITMENT_LIMITS.yearMin || year > FITMENT_LIMITS.yearMax))
    throw badRequest("Проверьте год выпуска");
  const partTypeId = input.partTypeId?.trim() || null;
  if (partTypeId && !getPartType(partTypeId)) throw badRequest("Неизвестный тип детали");

  const [row] = await db
    .insert(fitments)
    .values({
      vin,
      brand: text(input.brand),
      model: text(input.model),
      year,
      trim: text(input.trim),
      oe,
      partTypeId,
      source: input.source,
      result: input.result,
      orderId: input.orderId ?? null,
      createdBy: input.createdBy ?? null,
    })
    .returning();
  return row;
}

export type FitmentSummary = {
  // The normalized number, or null when the input is not an OE number (a VIN pasted by mistake is never echoed back).
  oe: string | null;
  fits: number;
  notFits: number;
  // Cars on which the part was confirmed to fit, most confirmations first. Brand, model and year only: no VINs.
  vehicles: { brand: string; model: string | null; year: number | null }[];
};

const VEHICLES_MAX = 20;

export async function fitmentSummaryForOe(db: Db, rawOe: string): Promise<FitmentSummary> {
  const oe = fitmentOeKey(rawOe);
  if (!oe) return { oe: null, fits: 0, notFits: 0, vehicles: [] };
  const [totals, cars] = await Promise.all([
    db
      .select({ result: fitments.result, n: count() })
      .from(fitments)
      .where(eq(fitments.oe, oe))
      .groupBy(fitments.result),
    db
      .select({ brand: fitments.brand, model: fitments.model, year: fitments.year, n: count(), last: max(fitments.createdAt) })
      .from(fitments)
      .where(and(eq(fitments.oe, oe), eq(fitments.result, "fits"), isNotNull(fitments.brand)))
      .groupBy(fitments.brand, fitments.model, fitments.year)
      .orderBy(desc(count()), desc(max(fitments.createdAt)))
      .limit(VEHICLES_MAX),
  ]);
  const total = (result: FitmentResult) => Number(totals.find((t) => t.result === result)?.n ?? 0);
  return {
    oe,
    fits: total("fits"),
    notFits: total("not_fits"),
    vehicles: cars.map((c) => ({ brand: c.brand as string, model: c.model, year: c.year })),
  };
}

// Staff only: everything we know about one car, newest first.
export async function fitmentsForVin(db: Db, rawVin: string, limit = 100): Promise<FitmentRow[]> {
  const vin = fitmentVin(rawVin);
  if (!vin) return [];
  return db
    .select()
    .from(fitments)
    .where(eq(fitments.vin, vin))
    .orderBy(desc(fitments.createdAt), desc(fitments.id))
    .limit(Math.min(Math.max(1, Math.trunc(limit) || 1), 500));
}
