import type { PricingSettings } from "@/lib/pricing";

// Pure helpers of the pricing form, kept apart so tests can check that what the form sends is what the server takes.

export type PricingKey = keyof PricingSettings;
export type PricingFormValues = Record<PricingKey, string>;

const DAY_MS = 24 * 3600 * 1000;

const toText = (n: number) => String(n).replace(".", ",");

export function toPricingForm(p: PricingSettings): PricingFormValues {
  return {
    cnyRate: toText(p.cnyRate),
    cnyRateDate: p.cnyRateDate,
    markupPct: toText(p.markupPct),
    perKgKzt: String(p.perKgKzt),
    localChinaKzt: String(p.localChinaKzt),
    dutyPct: toText(p.dutyPct),
    roundTo: String(p.roundTo),
    minMarginKzt: String(p.minMarginKzt),
  };
}

// "67,75" and "1 800" are fine; an empty or broken value becomes NaN (null in JSON), which the server and
// computeQuote reject with the field's own message instead of saving 0.
export function toNumber(value: string): number {
  const text = value.trim().replace(/\s/g, "").replace(",", ".");
  return text ? Number(text) : Number.NaN;
}

export function toPricingBody(form: PricingFormValues) {
  return {
    cnyRate: toNumber(form.cnyRate),
    cnyRateDate: form.cnyRateDate,
    markupPct: toNumber(form.markupPct),
    perKgKzt: toNumber(form.perKgKzt),
    localChinaKzt: toNumber(form.localChinaKzt),
    dutyPct: toNumber(form.dutyPct),
    roundTo: Number(form.roundTo),
    minMarginKzt: toNumber(form.minMarginKzt),
  };
}

// The server accepts a rate dated up to tomorrow: the next day's rate may already be published.
export function nextDay(date: string): string | undefined {
  const t = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(t) ? new Date(t + DAY_MS).toISOString().slice(0, 10) : undefined;
}

export function daysBetween(from: string, to: string): number | null {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) / DAY_MS) : null;
}
