import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { badRequest } from "@/lib/server/errors";
import {
  cnyRateField,
  dutyPctField,
  firstMessage,
  isoDateField,
  localChinaKztField,
  markupPctField,
  minMarginKztField,
  perKgKztField,
  roundToField,
} from "./fields";

const SETTINGS_KEY = "pricing";

export const PricingSettingsSchema = z.object(
  {
    cnyRate: cnyRateField,
    cnyRateDate: isoDateField, // date of the cnyRate, "YYYY-MM-DD"
    markupPct: markupPctField,
    perKgKzt: perKgKztField,
    localChinaKzt: localChinaKztField,
    dutyPct: dutyPctField,
    roundTo: roundToField,
    minMarginKzt: minMarginKztField,
  },
  { required_error: "Нет настроек цен", invalid_type_error: "Нет настроек цен" },
);

export type PricingSettings = z.infer<typeof PricingSettingsSchema>;

// Used until an admin saves their own values. The rate is the official National Bank of Kazakhstan
// rate on 19.10.2026; admins update it together with cnyRateDate.
// Frozen because it is shared by every request in the process.
export const DEFAULT_PRICING: Readonly<PricingSettings> = Object.freeze({
  cnyRate: 67.75,
  cnyRateDate: "2026-10-19",
  markupPct: 20,
  perKgKzt: 1800,
  localChinaKzt: 4000,
  dutyPct: 0,
  roundTo: 100,
  minMarginKzt: 3000,
});

type Key = keyof PricingSettings;
const KEYS = Object.keys(PricingSettingsSchema.shape) as Key[];
// A rate without its own date (or the other way round) would show the wrong date next to the price.
const RATE_PAIR: Key[] = ["cnyRate", "cnyRateDate"];

// Stored values win over defaults field by field: a field added later gets its default, and a stored value
// that no longer passes validation falls back to the default instead of breaking every price on the site.
// The warning names the fields only, never their values.
export function mergePricingSettings(stored: unknown): PricingSettings {
  const source = stored && typeof stored === "object" && !Array.isArray(stored) ? (stored as Record<string, unknown>) : {};
  const merged: Record<string, unknown> = { ...DEFAULT_PRICING };
  const replaced = new Set<Key>();
  for (const key of KEYS) {
    if (source[key] === undefined) continue;
    const parsed = PricingSettingsSchema.shape[key].safeParse(source[key]);
    if (parsed.success) merged[key] = parsed.data;
    else replaced.add(key);
  }
  if (RATE_PAIR.some((key) => replaced.has(key) || source[key] === undefined)) {
    for (const key of RATE_PAIR) {
      // An admin's rate dropped for lack of a date is worth a warning too, not only an invalid one.
      if (source[key] !== undefined) replaced.add(key);
      merged[key] = DEFAULT_PRICING[key];
    }
  }
  if (replaced.size) console.warn("tetix pricing settings: stored fields replaced by defaults", [...replaced]);
  return PricingSettingsSchema.parse(merged);
}

export async function getPricingSettings(db: Db): Promise<PricingSettings> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, SETTINGS_KEY))
    .limit(1);
  return mergePricingSettings(row?.value);
}

// Permissions are the caller's job: only an admin service should call this.
export async function savePricingSettings(db: Db, value: unknown, now = new Date()): Promise<PricingSettings> {
  const parsed = PricingSettingsSchema.safeParse(value);
  if (!parsed.success) throw badRequest(firstMessage(parsed.error), "invalid_pricing_settings");
  const clean = parsed.data;
  await db
    .insert(settings)
    .values({ key: SETTINGS_KEY, value: clean, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: clean, updatedAt: now } });
  return clean;
}
