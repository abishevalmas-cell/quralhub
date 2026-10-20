import { z } from "zod";
import { fenToCnyString, groupThousands, toScaled } from "./decimal";

// Field schemas shared by the quote input and the stored pricing settings.
// Each field has one Russian message that states the whole rule, so the form can show it as is.

export const ROUND_TO_OPTIONS = [1, 10, 100, 500, 1000] as const;
export type RoundTo = (typeof ROUND_TO_OPTIONS)[number];

// Decimal places each value may carry; quote.ts scales by the same numbers.
export const SCALE = { cny: 2, rate: 4, weight: 3, pct: 2 } as const;

// Sanity caps: far above any real part, low enough to catch a typo and keep the math in safe integers.
export const LIMITS = {
  priceCny: 1_000_000,
  qty: 50,
  cnyRate: 1000,
  weightKg: 1000,
  perKgKzt: 1_000_000,
  localChinaKzt: 10_000_000,
  minMarginKzt: 10_000_000,
  dutyPct: 100,
  markupPct: 300,
  // price_kzt, cost_kzt and total_kzt are int4 columns; a larger quote could not be saved at all.
  priceKzt: 2_147_483_647,
} as const;

const g = groupThousands;
const ROUND_TO_TEXT = `${ROUND_TO_OPTIONS.slice(0, -1).map(g).join(", ")} или ${g(ROUND_TO_OPTIONS[ROUND_TO_OPTIONS.length - 1])}`;

export const MESSAGES = {
  priceCny: `Цена в юанях — число больше 0 и не больше ${g(LIMITS.priceCny)} ¥, не больше двух знаков после запятой`,
  qty: `Количество — целое число от 1 до ${LIMITS.qty}`,
  cnyRate: `Курс юаня — число больше 0 и не больше ${g(LIMITS.cnyRate)} ₸ за 1 ¥, не больше четырёх знаков после запятой`,
  weightKg: `Вес — число от 0 до ${g(LIMITS.weightKg)} кг, не больше трёх знаков после запятой`,
  perKgKzt: `Тариф доставки — целое число тенге за 1 кг, от 0 до ${g(LIMITS.perKgKzt)}`,
  localChinaKzt: `Доставка по Китаю — целое число тенге, от 0 до ${g(LIMITS.localChinaKzt)}`,
  dutyPct: `Пошлина — от 0 до ${LIMITS.dutyPct}%, не больше двух знаков после запятой`,
  markupPct: `Наценка — от 0 до ${LIMITS.markupPct}%, не больше двух знаков после запятой`,
  roundTo: `Округление — до ${ROUND_TO_TEXT} ₸`,
  minMarginKzt: `Минимальная наценка — целое число тенге, от 0 до ${g(LIMITS.minMarginKzt)}`,
  cnyRateDate: "Дата курса — в формате ГГГГ-ММ-ДД",
  priceKzt: "Слишком большая сумма для одной позиции — проверьте цену в юанях, курс и количество",
} as const;

const number = (message: string) =>
  z.number({ required_error: message, invalid_type_error: message }).finite(message);

function decimal(message: string, scale: number, min: number, max: number, minExclusive = false) {
  return number(message).refine(
    (n) => (minExclusive ? n > min : n >= min) && n <= max && toScaled(n, scale) !== null,
    message,
  );
}

const tenge = (message: string, max: number) => number(message).int(message).min(0, message).max(max, message);

// Parses to the canonical "1234.50" form, so a validated price can go straight into the numeric(12,2)
// price_cny column; Postgres would reject "1 234,5" with a 500 instead of a form message.
export const priceCnyField = z
  .union([z.string(), z.number()], { errorMap: () => ({ message: MESSAGES.priceCny }) })
  .transform((value, ctx) => {
    const fen = toScaled(value, SCALE.cny);
    if (fen === null || fen <= 0 || fen > LIMITS.priceCny * 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: MESSAGES.priceCny });
      return z.NEVER;
    }
    return fenToCnyString(fen);
  });

export const qtyField = number(MESSAGES.qty).int(MESSAGES.qty).min(1, MESSAGES.qty).max(LIMITS.qty, MESSAGES.qty);
export const cnyRateField = decimal(MESSAGES.cnyRate, SCALE.rate, 0, LIMITS.cnyRate, true);
export const weightKgField = decimal(MESSAGES.weightKg, SCALE.weight, 0, LIMITS.weightKg);
export const perKgKztField = tenge(MESSAGES.perKgKzt, LIMITS.perKgKzt);
export const localChinaKztField = tenge(MESSAGES.localChinaKzt, LIMITS.localChinaKzt);
export const dutyPctField = decimal(MESSAGES.dutyPct, SCALE.pct, 0, LIMITS.dutyPct);
export const markupPctField = decimal(MESSAGES.markupPct, SCALE.pct, 0, LIMITS.markupPct);
export const minMarginKztField = tenge(MESSAGES.minMarginKzt, LIMITS.minMarginKzt);
export const roundToField = number(MESSAGES.roundTo).refine(
  (n): n is RoundTo => (ROUND_TO_OPTIONS as readonly number[]).includes(n),
  MESSAGES.roundTo,
);

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const match = ISO_DATE_RE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export const isoDateField = z
  .string({ required_error: MESSAGES.cnyRateDate, invalid_type_error: MESSAGES.cnyRateDate })
  .refine(isIsoDate, MESSAGES.cnyRateDate);

// The first issue's message: our fields always carry a Russian one.
export function firstMessage(error: z.ZodError, fallback = "Проверьте заполнение формы"): string {
  return error.issues[0]?.message || fallback;
}
