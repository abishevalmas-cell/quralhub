import { z } from "zod";
import { badRequest } from "@/lib/server/errors";
import { groupThousands, toScaled } from "./decimal";
import {
  LIMITS,
  MESSAGES,
  SCALE,
  cnyRateField,
  dutyPctField,
  firstMessage,
  localChinaKztField,
  markupPctField,
  minMarginKztField,
  perKgKztField,
  priceCnyField,
  qtyField,
  roundToField,
  weightKgField,
} from "./fields";

// Purchase price in yuan → customer price in tenge, for one offer line of qty units.
//   purchase = priceCny × qty × cnyRate
//   shipping = weightKg × qty × perKgKzt + localChinaKzt (local China delivery is per order line)
//   duty     = purchase × dutyPct
//   cost     = purchase + shipping + duty
//   price    = max(cost × (1 + markupPct), cost + minMarginKzt), rounded UP to roundTo
// Every amount is exact integer math (bigint); each tenge value is rounded exactly once.

export const QuoteInputSchema = z.object(
  {
    priceCny: priceCnyField, // per unit, "1234.50" or 1234.5; parses to "1234.50"
    qty: qtyField,
    cnyRate: cnyRateField, // ₸ per 1 ¥
    weightKg: weightKgField, // per unit
    perKgKzt: perKgKztField,
    localChinaKzt: localChinaKztField,
    dutyPct: dutyPctField,
    markupPct: markupPctField,
    roundTo: roundToField,
    minMarginKzt: minMarginKztField,
  },
  { required_error: "Нет данных для расчёта цены", invalid_type_error: "Нет данных для расчёта цены" },
);

export type QuoteInput = z.input<typeof QuoteInputSchema>;
export type ParsedQuoteInput = z.output<typeof QuoteInputSchema>;

export type QuoteLine = { label: string; kzt: number };

// Only priceKzt and unitPriceKzt may be shown to customers. Everything else is INTERNAL, like the offer's
// priceCny and costKzt columns: purchase, cost, margin and the breakdown reveal what we paid.
export type Quote = {
  purchaseKzt: number;
  shippingKzt: number;
  dutyKzt: number;
  costKzt: number;
  // The binding price for the whole line of qty units, a multiple of roundTo.
  priceKzt: number;
  marginKzt: number;
  // priceKzt / qty rounded half up, for display ("≈ за 1 шт."). Never multiply it back into a total.
  unitPriceKzt: number;
  // INTERNAL: mentions the yuan price. Lines add up to priceKzt; zero lines are left out except the purchase.
  breakdown: QuoteLine[];
};

const big = (n: number) => BigInt(n);
const ONE = big(1);
const TWO = big(2);
const PCT_DENOMINATOR = big(100 * 10 ** SCALE.pct); // 100% in hundredths of a percent
const MAX_PRICE_KZT = big(LIMITS.priceKzt);

const roundHalfUp = (numerator: bigint, denominator: bigint) => (TWO * numerator + denominator) / (TWO * denominator);
const ceilDiv = (numerator: bigint, denominator: bigint) => (numerator + denominator - ONE) / denominator;
const maxBig = (a: bigint, b: bigint) => (a > b ? a : b);

// Validated values are known to scale; the fallback only satisfies the type checker.
const scaled = (value: unknown, scale: number) => big(toScaled(value, scale) ?? 0);

// Validates and normalizes a quote request; priceCny comes back as "1234.50", ready for the price_cny column.
export function parseQuoteInput(input: unknown): ParsedQuoteInput {
  const parsed = QuoteInputSchema.safeParse(input);
  if (!parsed.success) throw badRequest(firstMessage(parsed.error), "invalid_quote");
  return parsed.data;
}

export function computeQuote(input: QuoteInput): Quote {
  const data = parseQuoteInput(input);
  const qty = big(data.qty);
  const roundTo = big(data.roundTo);
  const fen = scaled(data.priceCny, SCALE.cny);
  const rate = scaled(data.cnyRate, SCALE.rate);
  const grams = scaled(data.weightKg, SCALE.weight);
  const dutyBp = scaled(data.dutyPct, SCALE.pct);
  const markupBp = scaled(data.markupPct, SCALE.pct);
  const perKg = big(data.perKgKzt);
  const local = big(data.localChinaKzt);
  const minMargin = big(data.minMarginKzt);

  const purchase = roundHalfUp(fen * qty * rate, big(10 ** (SCALE.cny + SCALE.rate)));
  const freight = roundHalfUp(grams * qty * perKg, big(10 ** SCALE.weight));
  const shipping = freight + local;
  const duty = roundHalfUp(purchase * dutyBp, PCT_DENOMINATOR);
  const cost = purchase + shipping + duty;

  // Both candidates are kept as fractions over PCT_DENOMINATOR so the markup is never rounded twice.
  const byMarkup = cost * (PCT_DENOMINATOR + markupBp);
  const byMinMargin = (cost + minMargin) * PCT_DENOMINATOR;
  const required = maxBig(byMarkup, byMinMargin);
  // The line total is rounded once. Rounding each unit instead would add up to (qty − 1) × roundTo:
  // 50 parts at 1 ¥ with roundTo 1000 would cost the customer 50 000 ₸ instead of 4 000 ₸.
  // A free part is still never priced at 0: the minimum is one rounding step.
  const price = maxBig(ONE, ceilDiv(required, PCT_DENOMINATOR * roundTo)) * roundTo;
  if (price > MAX_PRICE_KZT) throw badRequest(MESSAGES.priceKzt, "invalid_quote");
  // Never below cost: markup and minimum margin are both >= 0.
  const exactPrice = ceilDiv(required, PCT_DENOMINATOR);

  const breakdown: QuoteLine[] = [
    { label: purchaseLabel(fen, data.qty, rate), kzt: Number(purchase) },
    { label: "Доставка по Китаю до склада", kzt: Number(local) },
    {
      label: `Доставка из Китая: ${formatScaled(grams * qty, SCALE.weight)} кг × ${groupThousands(perKg)} ₸/кг`,
      kzt: Number(freight),
    },
    { label: `Пошлина ${formatScaled(dutyBp, SCALE.pct)}% от стоимости товара`, kzt: Number(duty) },
    {
      label:
        byMinMargin > byMarkup
          ? `Наценка (минимальная — ${groupThousands(minMargin)} ₸)`
          : `Наценка ${formatScaled(markupBp, SCALE.pct)}%`,
      kzt: Number(exactPrice - cost),
    },
    { label: `Округление цены до ${groupThousands(roundTo)} ₸`, kzt: Number(price - exactPrice) },
  ].filter((line, index) => index === 0 || line.kzt !== 0);

  return {
    purchaseKzt: Number(purchase),
    shippingKzt: Number(shipping),
    dutyKzt: Number(duty),
    costKzt: Number(cost),
    priceKzt: Number(price),
    marginKzt: Number(price - cost),
    unitPriceKzt: Number(roundHalfUp(price, qty)),
    breakdown,
  };
}

function purchaseLabel(fen: bigint, qty: number, rate: bigint) {
  const each = `${formatScaled(fen, SCALE.cny, SCALE.cny)} ¥`;
  const amount = qty === 1 ? each : `${each} × ${qty} шт.`;
  return `Товар: ${amount} по курсу ${formatScaled(rate, SCALE.rate)} ₸ за 1 ¥`;
}

function formatScaled(value: bigint, scale: number, minFraction = 0) {
  const digits = String(value).padStart(scale + 1, "0");
  const whole = groupThousands(digits.slice(0, digits.length - scale));
  let fraction = digits.slice(digits.length - scale).replace(/0+$/, "");
  if (fraction.length < minFraction) fraction = fraction.padEnd(minFraction, "0");
  return fraction ? `${whole},${fraction}` : whole;
}
