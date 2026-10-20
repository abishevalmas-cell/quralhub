import { z } from "zod";
import { pluralRu } from "@/lib/utils";

// Lead time is a range of calendar days from payment to the part arriving in the customer's city.

export const MIN_LEAD_DAYS = 1;
export const MAX_LEAD_DAYS = 180;

export const LEAD_TIME_MESSAGES = {
  range: `Срок поставки — целое число дней от ${MIN_LEAD_DAYS} до ${MAX_LEAD_DAYS}`,
  order: "Минимальный срок не может быть больше максимального",
} as const;

export const pluralDays = (n: number) => pluralRu(n, "день", "дня", "дней");

const isDays = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= MIN_LEAD_DAYS && n <= MAX_LEAD_DAYS;

// Returns a Russian message for the form, or null when the range is fine.
export function validateLeadTime(min: unknown, max: unknown): string | null {
  if (!isDays(min) || !isDays(max)) return LEAD_TIME_MESSAGES.range;
  if (min > max) return LEAD_TIME_MESSAGES.order;
  return null;
}

// For request bodies that carry the offer's leadDaysMin / leadDaysMax columns.
// The issue points at the field to fix, so a form can highlight the right input.
export const LeadTimeSchema = z
  .object(
    { leadDaysMin: z.unknown(), leadDaysMax: z.unknown() },
    { required_error: LEAD_TIME_MESSAGES.range, invalid_type_error: LEAD_TIME_MESSAGES.range },
  )
  .superRefine((value, ctx) => {
    const message = validateLeadTime(value.leadDaysMin, value.leadDaysMax);
    if (!message) return;
    const field = message === LEAD_TIME_MESSAGES.range && isDays(value.leadDaysMin) ? "leadDaysMax" : "leadDaysMin";
    ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [field] });
  })
  .transform((value) => ({ leadDaysMin: value.leadDaysMin as number, leadDaysMax: value.leadDaysMax as number }));

// "12–18 дней", "1 день", "2–4 дня". The noun agrees with the last number, as in "5–21 день".
// Display is lenient: a reversed range is shown in order; a missing or broken value shows "—".
export function formatLeadTime(min: number | null | undefined, max: number | null | undefined): string {
  const isCount = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;
  if (!isCount(min) || !isCount(max)) return "—";
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return low === high ? `${high} ${pluralDays(high)}` : `${low}–${high} ${pluralDays(high)}`;
}
