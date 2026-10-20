import { eq } from "drizzle-orm";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryDb, type Db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import {
  DEFAULT_PRICING,
  PRICING_MESSAGES,
  computeQuote,
  getPricingSettings,
  mergePricingSettings,
  savePricingSettings,
  type PricingSettings,
} from "@/lib/pricing";
import { AppError } from "@/lib/server/errors";

const custom: PricingSettings = {
  cnyRate: 68.1234,
  cnyRateDate: "2026-10-20",
  markupPct: 25.5,
  perKgKzt: 2100,
  localChinaKzt: 3500,
  dutyPct: 5,
  roundTo: 500,
  minMarginKzt: 5000,
};

async function storeRaw(db: Db, value: unknown) {
  await db.insert(settings).values({ key: "pricing", value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

describe("pricing settings in the database", () => {
  let db: Db;

  beforeAll(async () => {
    db = await createMemoryDb();
  });

  beforeEach(async () => {
    await db.delete(settings);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the defaults when nothing is saved", async () => {
    expect(await getPricingSettings(db)).toEqual(DEFAULT_PRICING);
  });

  it("round-trips saved settings", async () => {
    const saved = await savePricingSettings(db, custom);
    expect(saved).toEqual(custom);
    expect(await getPricingSettings(db)).toEqual(custom);
  });

  it("upserts one row and moves updatedAt", async () => {
    const first = new Date("2026-10-19T09:00:00Z");
    const second = new Date("2026-10-20T09:00:00Z");
    await savePricingSettings(db, DEFAULT_PRICING, first);
    await savePricingSettings(db, { ...DEFAULT_PRICING, cnyRate: 68, cnyRateDate: "2026-10-20" }, second);
    const rows = await db.select().from(settings).where(eq(settings.key, "pricing"));
    expect(rows).toHaveLength(1);
    expect(rows[0].updatedAt.toISOString()).toBe(second.toISOString());
    expect((await getPricingSettings(db)).cnyRate).toBe(68);
  });

  it("drops unknown keys on save", async () => {
    await savePricingSettings(db, { ...custom, secret: "x" });
    const [row] = await db.select().from(settings).where(eq(settings.key, "pricing"));
    expect(Object.keys(row.value as object).sort()).toEqual(Object.keys(custom).sort());
  });

  it("refuses invalid settings with a Russian message and keeps the old ones", async () => {
    await savePricingSettings(db, custom);
    const attempts: [unknown, string][] = [
      [{ ...custom, cnyRate: 0 }, PRICING_MESSAGES.cnyRate],
      [{ ...custom, markupPct: 500 }, PRICING_MESSAGES.markupPct],
      [{ ...custom, roundTo: 50 }, PRICING_MESSAGES.roundTo],
      [{ ...custom, cnyRateDate: "2026-02-30" }, PRICING_MESSAGES.cnyRateDate],
      [{ ...custom, cnyRateDate: "19.10.2026" }, PRICING_MESSAGES.cnyRateDate],
      [{ ...custom, perKgKzt: undefined }, PRICING_MESSAGES.perKgKzt],
      [null, "Нет настроек цен"],
    ];
    for (const [value, message] of attempts) {
      const error = await savePricingSettings(db, value).catch((e: unknown) => e);
      expect(error, JSON.stringify(value)).toBeInstanceOf(AppError);
      expect((error as AppError).status).toBe(400);
      expect((error as AppError).code).toBe("invalid_pricing_settings");
      expect((error as AppError).message).toBe(message);
    }
    expect(await getPricingSettings(db)).toEqual(custom);
  });

  it("refuses numbers sent as strings instead of guessing", async () => {
    const error = await savePricingSettings(db, { ...custom, cnyRate: "67.75" }).catch((e: unknown) => e);
    expect((error as AppError).message).toBe(PRICING_MESSAGES.cnyRate);
    expect(await getPricingSettings(db)).toEqual(DEFAULT_PRICING);
  });

  it("fills fields that are missing from an older stored value", async () => {
    await storeRaw(db, { markupPct: 35, perKgKzt: 1900 });
    expect(await getPricingSettings(db)).toEqual({ ...DEFAULT_PRICING, markupPct: 35, perKgKzt: 1900 });
  });

  it("falls back per field when a stored value no longer validates", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await storeRaw(db, { ...custom, markupPct: "много", roundTo: 50 });
    expect(await getPricingSettings(db)).toEqual({
      ...custom,
      markupPct: DEFAULT_PRICING.markupPct,
      roundTo: DEFAULT_PRICING.roundTo,
    });
    expect(warn).toHaveBeenCalledOnce();
    // Field names only: stored values never reach the logs.
    expect(JSON.stringify(warn.mock.calls)).not.toContain("много");
    expect(warn.mock.calls[0][1]).toEqual(["markupPct", "roundTo"]);
  });

  it("keeps the rate and its date together", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await storeRaw(db, { ...custom, cnyRateDate: "2026-13-01" });
    const loaded = await getPricingSettings(db);
    expect(loaded.cnyRate).toBe(DEFAULT_PRICING.cnyRate);
    expect(loaded.cnyRateDate).toBe(DEFAULT_PRICING.cnyRateDate);
    expect(loaded.markupPct).toBe(custom.markupPct);

    const withoutDate: Partial<PricingSettings> = { ...custom };
    delete withoutDate.cnyRateDate;
    expect(mergePricingSettings(withoutDate).cnyRate).toBe(DEFAULT_PRICING.cnyRate);
  });

  it("warns when an admin's rate is dropped for lack of its date", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const merged = mergePricingSettings({ cnyRate: 70, markupPct: 30 });
    expect(merged).toEqual({ ...DEFAULT_PRICING, markupPct: 30 });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][1]).toEqual(["cnyRate"]);
  });

  it("does not warn about fields that were simply never saved", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(mergePricingSettings({ markupPct: 30 })).toEqual({ ...DEFAULT_PRICING, markupPct: 30 });
    expect(mergePricingSettings(undefined)).toEqual(DEFAULT_PRICING);
    expect(warn).not.toHaveBeenCalled();
  });

  it("ignores a stored value that is not an object", async () => {
    await storeRaw(db, "oops");
    expect(await getPricingSettings(db)).toEqual(DEFAULT_PRICING);
    expect(mergePricingSettings([1, 2])).toEqual(DEFAULT_PRICING);
    expect(mergePricingSettings(null)).toEqual(DEFAULT_PRICING);
  });

  it("feeds computeQuote directly", async () => {
    await savePricingSettings(db, custom);
    const quote = computeQuote({ ...(await getPricingSettings(db)), priceCny: "100", qty: 1, weightKg: 1 });
    // 100 ¥ × 68.1234 = 6812.34 → 6812; freight 2100 + local 3500; duty 5% = 340.6 → 341; cost 12 753.
    // 25.5% gives 16 005.02, the 5000 minimum gives 17 753 → 18 000 in steps of 500.
    expect(quote).toMatchObject({
      purchaseKzt: 6812,
      shippingKzt: 5600,
      dutyKzt: 341,
      costKzt: 12_753,
      priceKzt: 18_000,
      marginKzt: 5247,
    });
  });

  it("returns a fresh object, so callers cannot change the defaults", async () => {
    const loaded = await getPricingSettings(db);
    expect(loaded).not.toBe(DEFAULT_PRICING);
    loaded.cnyRate = 1;
    expect(DEFAULT_PRICING.cnyRate).toBe(67.75);
    expect((await getPricingSettings(db)).cnyRate).toBe(67.75);
  });
});

describe("DEFAULT_PRICING", () => {
  it("is valid and matches the agreed defaults", () => {
    expect(mergePricingSettings(DEFAULT_PRICING)).toEqual(DEFAULT_PRICING);
    expect(DEFAULT_PRICING).toEqual({
      cnyRate: 67.75,
      cnyRateDate: "2026-10-19",
      markupPct: 20,
      perKgKzt: 1800,
      localChinaKzt: 4000,
      dutyPct: 0,
      roundTo: 100,
      minMarginKzt: 3000,
    });
  });

  it("is frozen", () => {
    expect(Object.isFrozen(DEFAULT_PRICING)).toBe(true);
    expect(() => {
      (DEFAULT_PRICING as PricingSettings).markupPct = 99;
    }).toThrow(TypeError);
  });
});
