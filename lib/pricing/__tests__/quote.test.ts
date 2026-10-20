import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRICING,
  LIMITS,
  PRICING_MESSAGES,
  ROUND_TO_OPTIONS,
  computeQuote,
  fenToCnyString,
  parseQuoteInput,
  type QuoteInput,
} from "@/lib/pricing";
import { AppError } from "@/lib/server/errors";

const base = {
  priceCny: "1234.50",
  qty: 2,
  cnyRate: 67.75,
  weightKg: 1.2,
  perKgKzt: 1800,
  localChinaKzt: 4000,
  dutyPct: 0,
  markupPct: 20,
  roundTo: 100,
  minMarginKzt: 3000,
} satisfies QuoteInput;

// Only the purchase in the cost, no markup and no rounding: isolates one piece of arithmetic.
const bare = {
  ...base,
  qty: 1,
  weightKg: 0,
  perKgKzt: 0,
  localChinaKzt: 0,
  markupPct: 0,
  roundTo: 1,
  minMarginKzt: 0,
} satisfies QuoteInput;

const sum = (lines: { kzt: number }[]) => lines.reduce((total, line) => total + line.kzt, 0);
// Labels group thousands with a no-break space; "_" marks one in the expected strings.
const nb = (text: string) => text.replaceAll("_", " ");

function expectError(input: unknown, message: string) {
  let caught: unknown;
  try {
    computeQuote(input as QuoteInput);
  } catch (error) {
    caught = error;
  }
  expect(caught, JSON.stringify(input)).toBeInstanceOf(AppError);
  expect((caught as AppError).status).toBe(400);
  expect((caught as AppError).code).toBe("invalid_quote");
  expect((caught as AppError).message).toBe(message);
}

describe("computeQuote: full example", () => {
  it("prices two units with shipping, markup and rounding", () => {
    const quote = computeQuote(base);
    // 2 × 1234.50 ¥ × 67.75 = 167 274.75 → 167 275
    expect(quote.purchaseKzt).toBe(167_275);
    // 2 × 1.2 kg × 1800 + 4000 local
    expect(quote.shippingKzt).toBe(4320 + 4000);
    expect(quote.dutyKzt).toBe(0);
    expect(quote.costKzt).toBe(175_595);
    // 175 595 × 1.2 = 210 714 → 210 800 for the line, 105 400 per unit
    expect(quote.priceKzt).toBe(210_800);
    expect(quote.unitPriceKzt).toBe(105_400);
    expect(quote.marginKzt).toBe(210_800 - 175_595);
  });

  it("returns a Russian breakdown that adds up to the price", () => {
    const quote = computeQuote(base);
    expect(quote.breakdown).toEqual([
      { label: nb("Товар: 1_234,50 ¥ × 2 шт. по курсу 67,75 ₸ за 1 ¥"), kzt: 167_275 },
      { label: "Доставка по Китаю до склада", kzt: 4000 },
      { label: nb("Доставка из Китая: 2,4 кг × 1_800 ₸/кг"), kzt: 4320 },
      { label: "Наценка 20%", kzt: 35_119 },
      { label: "Округление цены до 100 ₸", kzt: 86 },
    ]);
    expect(sum(quote.breakdown)).toBe(quote.priceKzt);
  });

  it("labels duty, minimum margin and rounding together", () => {
    // purchase 5000, freight 1000, duty 500 → cost 6500; 10% gives 7150, the minimum gives 9500 → 10 000
    const quote = computeQuote({
      ...bare,
      priceCny: "100",
      cnyRate: 50,
      weightKg: 1,
      perKgKzt: 1000,
      dutyPct: 10,
      markupPct: 10,
      minMarginKzt: 3000,
      roundTo: 1000,
    });
    expect(quote.breakdown).toEqual([
      { label: "Товар: 100,00 ¥ по курсу 50 ₸ за 1 ¥", kzt: 5000 },
      { label: nb("Доставка из Китая: 1 кг × 1_000 ₸/кг"), kzt: 1000 },
      { label: "Пошлина 10% от стоимости товара", kzt: 500 },
      { label: nb("Наценка (минимальная — 3_000 ₸)"), kzt: 3000 },
      { label: nb("Округление цены до 1_000 ₸"), kzt: 500 },
    ]);
    expect(quote.priceKzt).toBe(10_000);
  });

  it("works with the stored settings spread into the input", () => {
    const quote = computeQuote({ ...DEFAULT_PRICING, priceCny: "100", qty: 1, weightKg: 0.5 });
    // 6775 purchase + 900 freight + 4000 local; 20% gives 14 010, the 3000 minimum gives 14 675.
    expect(quote.costKzt).toBe(11_675);
    expect(quote.priceKzt).toBe(14_700);
    expect(quote.marginKzt).toBe(3025);
  });
});

describe("computeQuote: decimal-safe yuan", () => {
  it("handles fen exactly where floats drift", () => {
    // 16.40 × 61.25 is exactly 1004.5; in floating point it is 1004.4999999999999.
    expect(16.4 * 61.25).toBeLessThan(1004.5);
    expect(computeQuote({ ...bare, priceCny: "16.40", cnyRate: 61.25 }).purchaseKzt).toBe(1005);
    expect(computeQuote({ ...bare, priceCny: 16.4, cnyRate: 61.25 }).purchaseKzt).toBe(1005);
  });

  it("treats string, comma and number forms the same", () => {
    const a = computeQuote({ ...base, priceCny: "1234.50" });
    expect(computeQuote({ ...base, priceCny: "1234,5" })).toEqual(a);
    expect(computeQuote({ ...base, priceCny: "1 234,50" })).toEqual(a);
    expect(computeQuote({ ...base, priceCny: "1 234,50" })).toEqual(a);
    expect(computeQuote({ ...base, priceCny: 1234.5 })).toEqual(a);
  });

  it("rounds the purchase half up to whole tenge", () => {
    // 0.01 ¥ × 67.75 = 0.6775 → 1; 10 ¥ × 3 × 67.75 = 2032.5 → 2033
    expect(computeQuote({ ...bare, priceCny: "0.01" }).purchaseKzt).toBe(1);
    expect(computeQuote({ ...bare, priceCny: "10", qty: 3 }).purchaseKzt).toBe(2033);
    expect(computeQuote({ ...bare, priceCny: "10.01" }).purchaseKzt).toBe(678); // 678.1775
  });

  it("accepts four decimals in the rate", () => {
    // 100 ¥ × 67.7525 = 6775.25
    expect(computeQuote({ ...bare, priceCny: "100", cnyRate: 67.7525 }).purchaseKzt).toBe(6775);
  });

  it("stays exact up to the largest price the database can hold", () => {
    // 1 000 000 ¥ × 21 × 102.2611 = 2 147 483 100, plus 547 local = 2^31 − 1 exactly.
    const atCap = { ...bare, priceCny: "1000000", qty: 21, cnyRate: 102.2611, localChinaKzt: 547 } satisfies QuoteInput;
    const quote = computeQuote(atCap);
    expect(quote.priceKzt).toBe(LIMITS.priceKzt);
    expect(quote.costKzt).toBe(2_147_483_647);
  });

  it("refuses a price that would not fit the int4 price column", () => {
    const atCap = { ...bare, priceCny: "1000000", qty: 21, cnyRate: 102.2611, localChinaKzt: 547 } satisfies QuoteInput;
    expectError({ ...atCap, localChinaKzt: 548 }, PRICING_MESSAGES.priceKzt);
    // Fits before rounding, not after.
    expectError({ ...atCap, roundTo: 1000 }, PRICING_MESSAGES.priceKzt);
    // Every field at its own limit.
    expectError({ ...bare, priceCny: "1000000", qty: 50, cnyRate: 1000, markupPct: 300 }, PRICING_MESSAGES.priceKzt);
  });
});

describe("computeQuote: rounding up", () => {
  const flat = { ...bare, priceCny: "100", cnyRate: 50 } satisfies QuoteInput; // cost 5000

  it("does not bump a price that is already round", () => {
    expect(computeQuote({ ...flat, roundTo: 1000 }).priceKzt).toBe(5000);
    expect(computeQuote({ ...flat, markupPct: 20, roundTo: 1000 }).priceKzt).toBe(6000);
  });

  it("always rounds up, never to the nearest", () => {
    // cost 5001 × 1.2 = 6001.2
    const quote = computeQuote({ ...flat, localChinaKzt: 1, markupPct: 20, roundTo: 1000 });
    expect(quote.costKzt).toBe(5001);
    expect(quote.priceKzt).toBe(7000);
    expect(computeQuote({ ...flat, localChinaKzt: 1, markupPct: 20, roundTo: 1 }).priceKzt).toBe(6002);
    expect(computeQuote({ ...flat, localChinaKzt: 1, markupPct: 20, roundTo: 10 }).priceKzt).toBe(6010);
    expect(computeQuote({ ...flat, localChinaKzt: 1, markupPct: 20, roundTo: 500 }).priceKzt).toBe(6500);
  });

  it("applies fractional markups without double rounding", () => {
    // 5000 × 1.125 = 5625 exactly; 5001 × 1.125 = 5626.125 → 5627
    expect(computeQuote({ ...flat, markupPct: 12.5 }).priceKzt).toBe(5625);
    expect(computeQuote({ ...flat, localChinaKzt: 1, markupPct: 12.5 }).priceKzt).toBe(5627);
  });

  it("never returns a zero price", () => {
    const quote = computeQuote({ ...bare, priceCny: "0.01", cnyRate: 0.0001 });
    expect(quote.costKzt).toBe(0);
    expect(quote.priceKzt).toBe(1);
    expect(computeQuote({ ...bare, priceCny: "0.01", cnyRate: 0.0001, qty: 5, roundTo: 100 }).priceKzt).toBe(100);
  });
});

describe("computeQuote: minimum margin", () => {
  const flat = { ...bare, priceCny: "100", cnyRate: 50, roundTo: 100 } satisfies QuoteInput; // cost 5000

  it("uses the minimum margin when the markup earns less", () => {
    const quote = computeQuote({ ...flat, markupPct: 20, minMarginKzt: 3000 });
    expect(quote.priceKzt).toBe(8000);
    expect(quote.marginKzt).toBe(3000);
    expect(quote.breakdown.at(-1)).toEqual({ label: nb("Наценка (минимальная — 3_000 ₸)"), kzt: 3000 });
  });

  it("uses the markup when it earns more", () => {
    const quote = computeQuote({ ...flat, priceCny: "1000", markupPct: 20, minMarginKzt: 3000 }); // cost 50 000
    expect(quote.priceKzt).toBe(60_000);
    expect(quote.marginKzt).toBe(10_000);
    expect(quote.breakdown.at(-1)).toEqual({ label: "Наценка 20%", kzt: 10_000 });
  });

  it("keeps at least the minimum margin after rounding", () => {
    const quote = computeQuote({ ...flat, localChinaKzt: 1, markupPct: 0, minMarginKzt: 3000 });
    expect(quote.costKzt).toBe(5001);
    expect(quote.priceKzt).toBe(8100);
    expect(quote.marginKzt).toBe(3099);
  });

  it("applies the minimum margin once per line, not per unit", () => {
    const quote = computeQuote({ ...flat, qty: 5, minMarginKzt: 3000 }); // cost 25 000
    expect(quote.priceKzt).toBe(28_000);
    expect(quote.marginKzt).toBe(3000);
    expect(quote.unitPriceKzt).toBe(5600);
  });
});

describe("computeQuote: quantity, weight and duty", () => {
  it("multiplies weight per unit but charges local delivery once per line", () => {
    const one = computeQuote({ ...base, qty: 1 });
    const five = computeQuote({ ...base, qty: 5 });
    expect(one.shippingKzt).toBe(2160 + 4000);
    expect(five.shippingKzt).toBe(5 * 2160 + 4000);
  });

  it("rounds the line total once, not every unit", () => {
    // 50 × 1 ¥ × 67.75 = 3387.5 → 3388. Rounding each unit to 1000 would have asked 50 000 ₸.
    const many = computeQuote({ ...bare, priceCny: "1", qty: 50, roundTo: 1000 });
    expect(many.costKzt).toBe(3388);
    expect(many.priceKzt).toBe(4000);
    expect(many.unitPriceKzt).toBe(80);

    // 4 × 7.50 ¥ × 67.75 = 2032.5 → 2033 → 2100 for the line.
    const four = computeQuote({ ...bare, priceCny: "7.50", qty: 4, roundTo: 100 });
    expect(four.costKzt).toBe(2033);
    expect(four.priceKzt).toBe(2100);
    expect(four.unitPriceKzt).toBe(525);
  });

  it("shows the unit price as the line total divided by qty, rounded half up", () => {
    // 3 × 9.50 ¥ × 67.75 = 1930.875 → 1931 → 2000; 2000 / 3 = 666.67
    const quote = computeQuote({ ...bare, priceCny: "9.50", qty: 3, roundTo: 100 });
    expect(quote.priceKzt).toBe(2000);
    expect(quote.unitPriceKzt).toBe(667);
    expect(computeQuote({ ...bare, qty: 1, roundTo: 100 }).unitPriceKzt).toBe(computeQuote({ ...bare, roundTo: 100 }).priceKzt);
  });

  it("charges duty on the purchase only", () => {
    // purchase 5000, freight 1 kg × 1000; 10% duty is 500, not 600.
    const quote = computeQuote({ ...bare, priceCny: "100", cnyRate: 50, weightKg: 1, perKgKzt: 1000, dutyPct: 10 });
    expect(quote.dutyKzt).toBe(500);
    expect(quote.costKzt).toBe(6500);
    expect(quote.breakdown).toContainEqual({ label: "Пошлина 10% от стоимости товара", kzt: 500 });
  });

  it("rounds duty half up and supports fractional percents", () => {
    // 167 275 × 12.5% = 20 909.375
    expect(computeQuote({ ...base, dutyPct: 12.5 }).dutyKzt).toBe(20_909);
    // 5000 × 0.01% = 0.5 → 1
    expect(computeQuote({ ...bare, priceCny: "100", cnyRate: 50, dutyPct: 0.01 }).dutyKzt).toBe(1);
  });

  it("uses exact grams for the freight", () => {
    // 3 × 0.335 kg = 1.005 kg × 1500 = 1507.5 → 1508
    const quote = computeQuote({ ...bare, qty: 3, weightKg: 0.335, perKgKzt: 1500 });
    expect(quote.shippingKzt).toBe(1508);
  });

  it("leaves zero lines out of the breakdown but always shows the purchase", () => {
    const quote = computeQuote({ ...bare, priceCny: "100", cnyRate: 50 });
    expect(quote.breakdown).toEqual([{ label: "Товар: 100,00 ¥ по курсу 50 ₸ за 1 ¥", kzt: 5000 }]);
  });

  it("keeps the breakdown summing to the price", () => {
    const variants: QuoteInput[] = [
      base,
      { ...base, qty: 7, dutyPct: 5, roundTo: 500 },
      { ...base, priceCny: "3.33", minMarginKzt: 10_000 },
      { ...base, markupPct: 0, minMarginKzt: 0, roundTo: 1 },
      { ...DEFAULT_PRICING, priceCny: "88.88", qty: 3, weightKg: 0.75 },
    ];
    for (const input of variants) {
      const quote = computeQuote(input);
      expect(sum(quote.breakdown), JSON.stringify(input)).toBe(quote.priceKzt);
      expect(quote.costKzt).toBe(quote.purchaseKzt + quote.shippingKzt + quote.dutyKzt);
      expect(quote.marginKzt).toBe(quote.priceKzt - quote.costKzt);
    }
  });
});

// Deterministic PRNG, so a failing case can be reproduced from the seed.
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("computeQuote: invariants on random inputs", () => {
  it("matches an independent integer reference and the spec formula", () => {
    const rand = mulberry32(20261020);
    const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
    const B = BigInt;
    const PCT = B(10_000);
    for (let i = 0; i < 1000; i++) {
      // Inputs are generated as integers and turned into the decimal forms a form would send.
      const fen = int(1, 5_000_000);
      const rate = int(400_000, 900_000);
      const grams = int(0, 30_000);
      const dutyBp = int(0, 2_000);
      const markupBp = int(0, 10_000);
      const input = {
        priceCny: i % 2 ? fenToCnyString(fen) : fen / 100,
        qty: int(1, LIMITS.qty),
        cnyRate: rate / 10_000,
        weightKg: grams / 1000,
        perKgKzt: int(0, 5000),
        localChinaKzt: int(0, 10_000),
        dutyPct: dutyBp / 100,
        markupPct: markupBp / 100,
        roundTo: ROUND_TO_OPTIONS[int(0, ROUND_TO_OPTIONS.length - 1)],
        minMarginKzt: int(0, 20_000),
      } satisfies QuoteInput;
      const q = computeQuote(input);
      const at = JSON.stringify(input);
      const qty = B(input.qty);
      const halfUp = (n: bigint, d: bigint) => Number((B(2) * n + d) / (B(2) * d));

      expect(q.purchaseKzt, at).toBe(halfUp(B(fen) * qty * B(rate), B(1_000_000)));
      expect(q.shippingKzt, at).toBe(halfUp(B(grams) * qty * B(input.perKgKzt), B(1000)) + input.localChinaKzt);
      expect(q.dutyKzt, at).toBe(halfUp(B(q.purchaseKzt) * B(dutyBp), PCT));
      expect(q.costKzt, at).toBe(q.purchaseKzt + q.shippingKzt + q.dutyKzt);

      const cost = B(q.costKzt);
      const required = [cost * (PCT + B(markupBp)), (cost + B(input.minMarginKzt)) * PCT].reduce((a, b) => (a > b ? a : b));
      const price = B(q.priceKzt);
      const step = B(input.roundTo);
      expect(price % step, at).toBe(B(0));
      expect(price * PCT >= required, at).toBe(true);
      // Smallest such multiple: one step less would be below the required price.
      expect(price === step || (price - step) * PCT < required, at).toBe(true);

      expect(q.marginKzt, at).toBe(q.priceKzt - q.costKzt);
      expect(q.marginKzt, at).toBeGreaterThanOrEqual(input.minMarginKzt);
      expect(sum(q.breakdown), at).toBe(q.priceKzt);
      expect(2 * Math.abs(q.unitPriceKzt * input.qty - q.priceKzt), at).toBeLessThanOrEqual(input.qty);
      for (const value of [q.purchaseKzt, q.shippingKzt, q.dutyKzt, q.costKzt, q.priceKzt, q.unitPriceKzt]) {
        expect(Number.isSafeInteger(value), at).toBe(true);
      }
    }
  });
});

describe("parseQuoteInput", () => {
  it("normalizes the yuan price for the numeric(12,2) column", () => {
    expect(parseQuoteInput({ ...base, priceCny: "1 234,5" }).priceCny).toBe("1234.50");
    expect(parseQuoteInput({ ...base, priceCny: 19.9 }).priceCny).toBe("19.90");
    expect(parseQuoteInput({ ...base, priceCny: "007" }).priceCny).toBe("7.00");
  });

  it("drops keys that are not part of a quote", () => {
    const parsed = parseQuoteInput({ ...DEFAULT_PRICING, priceCny: "100", qty: 1, weightKg: 0, supplierName: "x" });
    expect(Object.keys(parsed).sort()).toEqual(Object.keys(base).sort());
  });
});

describe("computeQuote: validation", () => {
  it("rejects bad yuan prices", () => {
    const bad = [0, "0", "0.00", -5, "-5", "abc", "", "1.234", 0.1 + 0.2, 1_000_000.01, "1e3", null, undefined, true];
    for (const priceCny of bad) expectError({ ...base, priceCny }, PRICING_MESSAGES.priceCny);
  });

  it("rejects a space that is not a thousands separator", () => {
    // "12 5" is a typo for 12,5 more often than a price of 125 ¥.
    for (const priceCny of ["12 5", "1 2 3", "1234 567", "1  234", "1 234 5", "12,5 0"]) {
      expectError({ ...base, priceCny }, PRICING_MESSAGES.priceCny);
    }
  });

  it("rejects bad quantities", () => {
    for (const qty of [0, 51, 1.5, -1, "2", undefined]) expectError({ ...base, qty }, PRICING_MESSAGES.qty);
  });

  it("rejects bad rates", () => {
    for (const cnyRate of [0, -67.75, Number.NaN, Number.POSITIVE_INFINITY, 67.12345, 1001, "67.75"]) {
      expectError({ ...base, cnyRate }, PRICING_MESSAGES.cnyRate);
    }
  });

  it("rejects bad weights, tariffs and margins", () => {
    expectError({ ...base, weightKg: -0.1 }, PRICING_MESSAGES.weightKg);
    expectError({ ...base, weightKg: 0.0001 }, PRICING_MESSAGES.weightKg);
    expectError({ ...base, weightKg: 1000.001 }, PRICING_MESSAGES.weightKg);
    expectError({ ...base, perKgKzt: 1800.5 }, PRICING_MESSAGES.perKgKzt);
    expectError({ ...base, perKgKzt: -1 }, PRICING_MESSAGES.perKgKzt);
    expectError({ ...base, localChinaKzt: -100 }, PRICING_MESSAGES.localChinaKzt);
    expectError({ ...base, minMarginKzt: 10.5 }, PRICING_MESSAGES.minMarginKzt);
    expectError({ ...base, minMarginKzt: -1 }, PRICING_MESSAGES.minMarginKzt);
  });

  it("rejects out-of-range percents", () => {
    expectError({ ...base, dutyPct: 100.01 }, PRICING_MESSAGES.dutyPct);
    expectError({ ...base, dutyPct: -1 }, PRICING_MESSAGES.dutyPct);
    expectError({ ...base, markupPct: 301 }, PRICING_MESSAGES.markupPct);
    expectError({ ...base, markupPct: 10.001 }, PRICING_MESSAGES.markupPct);
  });

  it("accepts the boundaries", () => {
    expect(() => computeQuote({ ...base, dutyPct: 100, markupPct: 300, qty: 50, weightKg: 0 })).not.toThrow();
    expect(() => computeQuote({ ...base, priceCny: "0.01", weightKg: 1000 })).not.toThrow();
  });

  it("rejects rounding steps outside the list", () => {
    for (const roundTo of [0, 5, 50, 250, 2000, "100"]) expectError({ ...base, roundTo }, PRICING_MESSAGES.roundTo);
  });

  it("rejects a missing input", () => {
    expectError(null, "Нет данных для расчёта цены");
    expectError(undefined, "Нет данных для расчёта цены");
    expectError([base], "Нет данных для расчёта цены");
  });

  it("states every limit in the Russian messages", () => {
    expect(PRICING_MESSAGES.priceCny).toBe(
      nb("Цена в юанях — число больше 0 и не больше 1_000_000 ¥, не больше двух знаков после запятой"),
    );
    expect(PRICING_MESSAGES.cnyRate).toContain(nb("не больше 1_000 ₸ за 1 ¥"));
    expect(PRICING_MESSAGES.roundTo).toBe(nb("Округление — до 1, 10, 100, 500 или 1_000 ₸"));
    expect(PRICING_MESSAGES.qty).toBe("Количество — целое число от 1 до 50");
  });
});
