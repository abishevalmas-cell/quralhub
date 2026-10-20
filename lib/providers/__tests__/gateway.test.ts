import { asc, eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { createMemoryDb, type Db } from "@/lib/db";
import { providerCache, providerCalls, users } from "@/lib/db/schema";
import { FIXTURE_NOTICE, FIXTURE_VINS, FixtureProvider, syntheticVin } from "@/lib/providers/fixture";
import { createGateway, dailyLimitFromEnv } from "@/lib/providers/gateway";
import { SeventeenVinProvider, type FetchLike } from "@/lib/providers/seventeen-vin";
import type {
  CategoriesResult,
  DecodeResult,
  PartsProvider,
  PartsResult,
  ProviderMode,
  ProviderStatus,
} from "@/lib/providers/types";

const DAY = 24 * 3600 * 1000;
const T0 = new Date("2026-10-20T08:00:00Z");
const VIN = FIXTURE_VINS.bydSongPlus;
const vinN = (n: number) => syntheticVin("LGX", "TXGWY", "PATX" + String(n).padStart(4, "0"));

const decoded = (status: ProviderStatus = "success"): DecodeResult => ({
  status,
  message: status,
  source: "provider",
  ...(status === "success" ? { providerCode: 1, epc: "byd" } : {}),
  candidates:
    status === "success"
      ? [
          {
            id: "1",
            brand: "BYD",
            model: "Song Plus DM-i",
            year: "2023",
            version: "A",
            description: "",
            engine: "",
            fuel: "",
            drive: "",
            epcId: "",
            image: null,
          },
        ]
      : [],
  ambiguous: false,
});

class FakeProvider implements PartsProvider {
  readonly name = "17vin";
  constructor(readonly mode: ProviderMode = "live") {}
  decodeVin = vi.fn(async (vin: string): Promise<DecodeResult> => {
    void vin;
    return decoded();
  });
  categories = vi.fn(
    async (): Promise<CategoriesResult> => ({
      status: "success",
      message: "ok",
      providerCode: 1,
      source: "provider",
      categories: [{ code: "06", level: 1, last: false, name: "06 Body", remark: "", diagram: null, providerFit: true }],
    }),
  );
  parts = vi.fn(async (): Promise<PartsResult> => ({ status: "empty", message: "none", providerCode: 0, source: "provider", parts: [] }));
  searchOe = vi.fn(async (): Promise<PartsResult> => ({ status: "empty", message: "none", providerCode: 0, source: "provider", parts: [] }));
}

async function journal(db: Db) {
  return db.select().from(providerCalls).orderBy(asc(providerCalls.createdAt));
}

async function makeUserId(db: Db): Promise<string> {
  const [u] = await db.insert(users).values({ phone: "77010000999" }).returning({ id: users.id });
  return u.id;
}

describe("gateway cache", () => {
  it("serves repeated decodes from provider_cache and journals only the real call", async () => {
    const db = await createMemoryDb();
    const userId = await makeUserId(db);
    const provider = new FakeProvider();
    const gw = createGateway(db, provider, { userId, now: T0, dailyLimit: 10 });

    const first = await gw.decodeVin(VIN.toLowerCase());
    const second = await gw.decodeVin(VIN);
    expect(first).toMatchObject({ status: "success", cached: false, epc: "byd" });
    expect(second).toMatchObject({ status: "success", cached: true, epc: "byd" });
    expect(provider.decodeVin).toHaveBeenCalledTimes(1);
    expect(provider.decodeVin).toHaveBeenCalledWith(VIN);

    const [cache] = await db.select().from(providerCache);
    expect(cache).toMatchObject({ key: `17vin:decode:${VIN}`, provider: "17vin", operation: "decode" });
    expect((cache.result as DecodeResult).cached).toBeUndefined();

    const rows = await journal(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      provider: "17vin",
      operation: "decode",
      mode: "live",
      inputMask: "LGX…0001",
      status: "success",
      providerCode: 1,
      userId,
    });
    expect(rows[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it("expires decodes after 90 days and catalog pages after 30 days", async () => {
    const db = await createMemoryDb();
    const provider = new FakeProvider();
    let now = T0;
    const gw = createGateway(db, provider, { now: () => now, dailyLimit: 100 });
    const cata = { vin: VIN, epc: "byd", level: 1 as const };

    await gw.decodeVin(VIN);
    await gw.categories(cata);
    now = new Date(T0.getTime() + 29 * DAY);
    expect((await gw.decodeVin(VIN)).cached).toBe(true);
    expect((await gw.categories(cata)).cached).toBe(true);
    now = new Date(T0.getTime() + 31 * DAY);
    expect((await gw.decodeVin(VIN)).cached).toBe(true);
    expect((await gw.categories(cata)).cached).toBe(false);
    now = new Date(T0.getTime() + 91 * DAY);
    expect((await gw.decodeVin(VIN)).cached).toBe(false);
    expect(provider.decodeVin).toHaveBeenCalledTimes(2);
    expect(provider.categories).toHaveBeenCalledTimes(2);
    expect((await db.select().from(providerCache)).map((r) => r.key).sort()).toEqual([
      `17vin:cata:byd:1::${VIN}`,
      `17vin:decode:${VIN}`,
    ]);
  });

  it("caches empty and unsupported answers for a shorter time", async () => {
    const db = await createMemoryDb();
    const provider = new FakeProvider();
    let now = T0;
    const gw = createGateway(db, provider, { now: () => now, dailyLimit: 100 });
    const input = { vin: VIN, epc: "byd", categoryCode: "SA3HJ-06002", level: 3 as const };
    expect((await gw.parts(input)).status).toBe("empty");
    now = new Date(T0.getTime() + 6 * DAY);
    expect((await gw.parts(input)).cached).toBe(true);
    now = new Date(T0.getTime() + 8 * DAY);
    expect((await gw.parts(input)).cached).toBe(false);
    expect(provider.parts).toHaveBeenCalledTimes(2);
  });

  it("caches successful OE and parts answers for 30 days", async () => {
    const db = await createMemoryDb();
    const provider = new FakeProvider();
    const found: PartsResult = { status: "success", message: "ok", providerCode: 1, source: "provider", parts: [] };
    provider.searchOe.mockResolvedValue(found);
    provider.parts.mockResolvedValue(found);
    let now = T0;
    const gw = createGateway(db, provider, { now: () => now, dailyLimit: 100 });
    const input = { vin: VIN, epc: "byd", categoryCode: "SA3HJ-06002", level: 3 as const };
    await gw.searchOe("14905517-00");
    await gw.parts(input);
    now = new Date(T0.getTime() + 29 * DAY);
    expect((await gw.searchOe("14905517-00")).cached).toBe(true);
    expect((await gw.parts(input)).cached).toBe(true);
    now = new Date(T0.getTime() + 31 * DAY);
    expect((await gw.searchOe("14905517-00")).cached).toBe(false);
    expect((await gw.parts(input)).cached).toBe(false);
    expect(provider.searchOe).toHaveBeenCalledTimes(2);
    expect(provider.parts).toHaveBeenCalledTimes(2);
  });

  it("caches an unsupported catalog (Zeekr, code 1003) and re-checks it after a week", async () => {
    const db = await createMemoryDb();
    let now = T0;
    const gw = createGateway(db, new FixtureProvider(), { now: () => now });
    const input = { vin: FIXTURE_VINS.zeekr001, epc: "zeekr", level: 1 as const };
    expect(await gw.categories(input)).toMatchObject({ status: "unsupported", providerCode: 1003, cached: false });
    expect(await gw.categories(input)).toMatchObject({ status: "unsupported", providerCode: 1003, cached: true });
    now = new Date(T0.getTime() + 8 * DAY);
    expect((await gw.categories(input)).cached).toBe(false);
    expect((await journal(db)).map((r) => r.status)).toEqual(["unsupported", "unsupported"]);
  });

  it("uses one cache entry for OE numbers typed in lower or upper case", async () => {
    const db = await createMemoryDb();
    const provider = new FakeProvider();
    const gw = createGateway(db, provider, { now: T0, dailyLimit: 100 });
    await gw.searchOe("c385b120301-0100");
    expect((await gw.searchOe("C385B120301-0100")).cached).toBe(true);
    expect(provider.searchOe).toHaveBeenCalledWith("C385B120301-0100");
    expect(provider.searchOe).toHaveBeenCalledTimes(1);
  });

  it("serves a row written a little in the future by another server, but not one far ahead", async () => {
    const db = await createMemoryDb();
    const provider = new FakeProvider();
    await createGateway(db, provider, { now: new Date(T0.getTime() + 60_000), dailyLimit: 100 }).decodeVin(VIN);
    const behind = createGateway(db, provider, { now: T0, dailyLimit: 100 });
    expect((await behind.decodeVin(VIN)).cached).toBe(true);
    await db.update(providerCache).set({ fetchedAt: new Date(T0.getTime() + DAY) });
    expect((await behind.decodeVin(VIN)).cached).toBe(false);
    expect(provider.decodeVin).toHaveBeenCalledTimes(2);
  });

  it("ignores a cache row that does not hold a cacheable answer", async () => {
    const db = await createMemoryDb();
    const provider = new FakeProvider();
    const key = `17vin:decode:${VIN}`;
    await db.insert(providerCache).values({ key, provider: "17vin", operation: "decode", result: { broken: true }, fetchedAt: T0 });
    const gw = createGateway(db, provider, { now: T0, dailyLimit: 100 });
    expect(await gw.decodeVin(VIN)).toMatchObject({ status: "success", cached: false });
    await db.update(providerCache).set({ result: decoded("timeout") }).where(eq(providerCache.key, key));
    expect((await gw.decodeVin(VIN)).cached).toBe(false);
    expect(provider.decodeVin).toHaveBeenCalledTimes(2);
  });

  it("never caches errors", async () => {
    const db = await createMemoryDb();
    const provider = new FakeProvider();
    provider.decodeVin.mockResolvedValue(decoded("timeout"));
    const gw = createGateway(db, provider, { now: T0, dailyLimit: 100 });
    expect((await gw.decodeVin(VIN)).status).toBe("timeout");
    expect((await gw.decodeVin(VIN)).status).toBe("timeout");
    expect(provider.decodeVin).toHaveBeenCalledTimes(2);
    expect(await db.select().from(providerCache)).toHaveLength(0);
    expect((await journal(db)).map((r) => r.status)).toEqual(["timeout", "timeout"]);
  });

  it("turns a thrown provider error into provider_error, journaled and not cached", async () => {
    const db = await createMemoryDb();
    const provider = new FakeProvider();
    provider.searchOe.mockRejectedValue(new Error(`boom ${VIN}`));
    const gw = createGateway(db, provider, { now: T0, dailyLimit: 100 });
    const result = await gw.searchOe("14905517-00");
    expect(result).toMatchObject({ status: "provider_error", parts: [], cached: false });
    expect(result.message).not.toContain(VIN);
    expect(await db.select().from(providerCache)).toHaveLength(0);
    expect(await journal(db)).toMatchObject([{ operation: "oe", status: "provider_error", inputMask: "14905517-00" }]);
  });

  it("turns a malformed provider answer into provider_error and closes the journal row", async () => {
    const db = await createMemoryDb();
    const provider = new FakeProvider();
    provider.decodeVin.mockResolvedValue(undefined as unknown as DecodeResult);
    const gw = createGateway(db, provider, { now: T0, dailyLimit: 100 });
    expect(await gw.decodeVin(VIN)).toMatchObject({ status: "provider_error", candidates: [], ambiguous: false, cached: false });
    expect(await db.select().from(providerCache)).toHaveLength(0);
    expect(await journal(db)).toMatchObject([{ status: "provider_error" }]);
  });

  it("keeps fixture answers under a separate key prefix", async () => {
    const db = await createMemoryDb();
    const fixture = createGateway(db, new FixtureProvider(), { now: T0 });
    const fake = new FakeProvider();
    const live = createGateway(db, fake, { now: T0, dailyLimit: 100 });

    const example = await fixture.decodeVin(VIN);
    expect(example).toMatchObject({ source: "fixture", ambiguous: true, cached: false });
    expect((await fixture.decodeVin(VIN)).cached).toBe(true);
    expect(await live.decodeVin(VIN)).toMatchObject({ source: "provider", cached: false });
    expect(fake.decodeVin).toHaveBeenCalledTimes(1);
    expect((await db.select().from(providerCache)).map((r) => r.key).sort()).toEqual([
      `17vin:decode:${VIN}`,
      `fixture:decode:${VIN}`,
    ]);
    expect((await journal(db)).map((r) => r.mode).sort()).toEqual(["fixture", "live"]);
  });
});

describe("gateway daily limit", () => {
  it("serves exactly the remaining budget when calls arrive at the same time", async () => {
    const db = await createMemoryDb();
    const provider = new FakeProvider();
    const gw = createGateway(db, provider, { now: T0, dailyLimit: 4 });
    expect((await gw.decodeVin(vinN(10))).status).toBe("success");
    const results = await Promise.all([1, 2, 3, 4, 5, 6].map((n) => gw.decodeVin(vinN(10 + n))));
    // Neither over the limit nor refusing each other while budget is left.
    expect(results.filter((r) => r.status === "success")).toHaveLength(3);
    expect(results.filter((r) => r.status === "rate_limit")).toHaveLength(3);
    expect(provider.decodeVin).toHaveBeenCalledTimes(4);
    const rows = await journal(db);
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.status === "success")).toBe(true);
    expect(await gw.usage()).toEqual({ mode: "live", used: 4, limit: 4 });
  });

  it("does not switch the limit off when given NaN or a negative number", async () => {
    const db = await createMemoryDb();
    for (const dailyLimit of [Number("lots"), -1, Infinity]) {
      expect(createGateway(db, new FakeProvider(), { dailyLimit, env: { TETIX_17VIN_DAILY_LIMIT: "1" } }).dailyLimit).toBe(1);
      expect(createGateway(db, new FakeProvider(), { dailyLimit, env: {} }).dailyLimit).toBe(200);
    }
    const provider = new FakeProvider();
    const gw = createGateway(db, provider, { now: T0, dailyLimit: NaN, env: { TETIX_17VIN_DAILY_LIMIT: "1" } });
    expect((await gw.decodeVin(vinN(41))).status).toBe("success");
    expect((await gw.decodeVin(vinN(42))).status).toBe("rate_limit");
    expect(provider.decodeVin).toHaveBeenCalledTimes(1);
  });

  it("stops live calls at the limit without calling the provider and resets on the next UTC day", async () => {
    const db = await createMemoryDb();
    const provider = new FakeProvider();
    let now = T0;
    const gw = createGateway(db, provider, { now: () => now, dailyLimit: 2 });

    expect((await gw.decodeVin(vinN(1))).status).toBe("success");
    expect((await gw.decodeVin(vinN(2))).status).toBe("success");
    const refused = await gw.decodeVin(vinN(3));
    expect(refused).toMatchObject({ status: "rate_limit", candidates: [], cached: false });
    expect(refused.message).toContain("Дневной лимит");
    expect(provider.decodeVin).toHaveBeenCalledTimes(2);
    expect(await journal(db)).toHaveLength(2);
    expect(await gw.usage()).toEqual({ mode: "live", used: 2, limit: 2 });

    // Cached answers are still served after the limit is reached.
    expect((await gw.decodeVin(vinN(1))).cached).toBe(true);

    now = new Date("2026-10-20T23:59:59Z");
    expect((await gw.decodeVin(vinN(4))).status).toBe("rate_limit");
    now = new Date("2026-10-21T00:00:01Z");
    expect((await gw.decodeVin(vinN(4))).status).toBe("success");
    expect(provider.decodeVin).toHaveBeenCalledTimes(3);
  });

  it("counts every live call, including errors, and only for this provider", async () => {
    const db = await createMemoryDb();
    await db.insert(providerCalls).values([
      { provider: "17vin", operation: "decode", mode: "live", inputMask: "LGX…0001", status: "timeout", durationMs: 20000, createdAt: T0 },
      { provider: "other", operation: "decode", mode: "live", inputMask: "LGX…0002", status: "success", durationMs: 1, createdAt: T0 },
      { provider: "17vin", operation: "decode", mode: "fixture", inputMask: "LGX…0003", status: "success", durationMs: 1, createdAt: T0 },
      { provider: "17vin", operation: "decode", mode: "live", inputMask: "LGX…0004", status: "success", durationMs: 1, createdAt: new Date(T0.getTime() - DAY) },
    ]);
    const provider = new FakeProvider();
    const gw = createGateway(db, provider, { now: T0, dailyLimit: 2 });
    expect((await gw.decodeVin(vinN(5))).status).toBe("success");
    expect((await gw.decodeVin(vinN(6))).status).toBe("rate_limit");
  });

  it("does not limit fixture mode", async () => {
    const db = await createMemoryDb();
    const gw = createGateway(db, new FixtureProvider(), { now: T0, dailyLimit: 0 });
    expect((await gw.decodeVin(FIXTURE_VINS.geelyGalaxyE5)).status).toBe("success");
    expect((await gw.decodeVin(FIXTURE_VINS.deepalS7)).status).toBe("success");
    expect(await gw.usage()).toEqual({ mode: "fixture", used: 0, limit: null });
  });

  it("reads the limit from TETIX_17VIN_DAILY_LIMIT with a default of 200", async () => {
    expect(dailyLimitFromEnv({})).toBe(200);
    expect(dailyLimitFromEnv({ TETIX_17VIN_DAILY_LIMIT: "50" })).toBe(50);
    expect(dailyLimitFromEnv({ TETIX_17VIN_DAILY_LIMIT: "0" })).toBe(0);
    expect(dailyLimitFromEnv({ TETIX_17VIN_DAILY_LIMIT: "lots" })).toBe(200);
    const db = await createMemoryDb();
    expect(createGateway(db, new FakeProvider(), { env: { TETIX_17VIN_DAILY_LIMIT: "1" } }).dailyLimit).toBe(1);
  });
});

describe("gateway journal", () => {
  it("masks VINs in every journal row and keeps OE numbers", async () => {
    const db = await createMemoryDb();
    let tick = 0;
    const gw = createGateway(db, new FakeProvider(), { now: () => new Date(T0.getTime() + 1000 * tick++), dailyLimit: 100 });
    await gw.decodeVin(VIN);
    await gw.categories({ vin: VIN, epc: "byd", level: 2, parentCode: "06" });
    await gw.parts({ vin: VIN, epc: "byd", categoryCode: "SA3HJ-06002", level: 3 });
    await gw.searchOe("14905517-00");
    const rows = await journal(db);
    expect(rows.map((r) => [r.operation, r.inputMask])).toEqual([
      ["decode", "LGX…0001"],
      ["categories", "LGX…0001 byd L2 06"],
      ["parts", "LGX…0001 byd L3 SA3HJ-06002"],
      ["oe", "14905517-00"],
    ]);
    expect(JSON.stringify(rows)).not.toContain(VIN);
  });

  it("masks a VIN pasted into OE search or into a catalog code", async () => {
    const db = await createMemoryDb();
    let tick = 0;
    const gw = createGateway(db, new FakeProvider(), { now: () => new Date(T0.getTime() + 1000 * tick++), dailyLimit: 100 });
    await gw.searchOe(VIN.toLowerCase());
    await gw.searchOe("LGX TXSP2 4PATX0001");
    await gw.parts({ vin: FIXTURE_VINS.geelyGalaxyE5, epc: "geely", categoryCode: `X-${VIN}`, level: 3 });
    await gw.categories({ vin: FIXTURE_VINS.geelyGalaxyE5, epc: "geely", level: 2, parentCode: VIN });
    const rows = await journal(db);
    expect(rows.map((r) => r.inputMask)).toEqual([
      "LGX…0001",
      "LGX…0001",
      "L6T…0002 geely L3 X-LGX…0001",
      "L6T…0002 geely L2 LGX…0001",
    ]);
    expect(JSON.stringify(rows)).not.toContain("TXSP2");
  });

  it("closes every journal row with a final status", async () => {
    const db = await createMemoryDb();
    const provider = new FakeProvider();
    provider.categories.mockRejectedValueOnce(new Error("boom"));
    const gw = createGateway(db, provider, { now: T0, dailyLimit: 100 });
    await gw.decodeVin(VIN);
    await gw.categories({ vin: VIN, epc: "byd", level: 1 });
    await gw.searchOe("10301727-00");
    const rows = await journal(db);
    expect(rows.map((r) => r.status).sort()).toEqual(["empty", "provider_error", "success"]);
    expect(rows.some((r) => r.status === "pending")).toBe(false);
  });

  it("refuses bad input without journaling or calling the provider", async () => {
    const db = await createMemoryDb();
    const provider = new FakeProvider();
    const gw = createGateway(db, provider, { now: T0, dailyLimit: 100 });
    expect((await gw.decodeVin("LGX")).status).toBe("invalid");
    expect((await gw.categories({ vin: VIN, epc: "byd", level: 3 })).status).toBe("invalid");
    expect((await gw.categories({ vin: VIN, epc: "a/b", level: 1 })).status).toBe("invalid");
    expect((await gw.parts({ vin: VIN, epc: "byd", categoryCode: "", level: 3 })).status).toBe("invalid");
    expect((await gw.searchOe("  ")).status).toBe("invalid");
    expect(provider.decodeVin).not.toHaveBeenCalled();
    expect(provider.categories).not.toHaveBeenCalled();
    expect(provider.parts).not.toHaveBeenCalled();
    expect(provider.searchOe).not.toHaveBeenCalled();
    expect(await journal(db)).toHaveLength(0);
    const fixtureGw = createGateway(db, new FixtureProvider(), { now: T0 });
    expect((await fixtureGw.decodeVin("bad")).message.startsWith(FIXTURE_NOTICE)).toBe(true);
  });
});

describe("gateway with the 17VIN adapter", () => {
  it("pays for a VIN once and serves the rest from cache", async () => {
    const db = await createMemoryDb();
    const urls: string[] = [];
    const fetch: FetchLike = async (url) => {
      urls.push(url);
      return new Response(JSON.stringify({ code: 1, data: { epc: "byd", model_list: [{ Js_id: "1" }, { Js_id: "2" }] } }));
    };
    const gw = createGateway(db, new SeventeenVinProvider({ user: "u", password: "p", fetch }), { now: T0, dailyLimit: 5 });
    const first = await gw.decodeVin(VIN);
    expect(first).toMatchObject({ status: "success", ambiguous: true, cached: false });
    expect((await gw.decodeVin(VIN)).cached).toBe(true);
    expect(urls).toHaveLength(1);
    expect(await journal(db)).toMatchObject([{ provider: "17vin", mode: "live", status: "success", providerCode: 1 }]);
  });

  it("caches a paid answer even when the provider sends NUL or a broken emoji", async () => {
    const db = await createMemoryDb();
    let calls = 0;
    const fetch: FetchLike = async () => {
      calls++;
      const partlist = [{ partnumber_original: "10301727-00", name_en: "Oil\u0000filter", remark_en: "x".repeat(999) + "😀" }];
      return new Response(JSON.stringify({ code: 1, data: { partlist } }));
    };
    const gw = createGateway(db, new SeventeenVinProvider({ user: "u", password: "p", fetch }), { now: T0, dailyLimit: 5 });
    const input = { vin: VIN, epc: "byd", categoryCode: "SA3HJ-01021", level: 3 as const };
    expect(await gw.parts(input)).toMatchObject({ status: "success", cached: false });
    const again = await gw.parts(input);
    expect(again).toMatchObject({ status: "success", cached: true });
    expect(again.parts[0].name).toBe("Oil filter");
    expect(calls).toBe(1);
  });

  it("does not cache an account error such as code 1005", async () => {
    const db = await createMemoryDb();
    let calls = 0;
    const fetch: FetchLike = async () => {
      calls++;
      return new Response(JSON.stringify({ code: 1005 }));
    };
    const gw = createGateway(db, new SeventeenVinProvider({ user: "u", password: "p", fetch }), { now: T0, dailyLimit: 5 });
    expect((await gw.categories({ vin: VIN, epc: "byd", level: 1 })).status).toBe("quota_or_expired");
    expect((await gw.categories({ vin: VIN, epc: "byd", level: 1 })).status).toBe("quota_or_expired");
    expect(calls).toBe(2);
    expect(await journal(db)).toMatchObject([{ providerCode: 1005 }, { providerCode: 1005 }]);
  });
});

describe("gateway with the fixture catalog", () => {
  it("walks BYD from VIN to parts, marks every answer as an example and journals masked input", async () => {
    const db = await createMemoryDb();
    let tick = 0;
    const gw = createGateway(db, new FixtureProvider(), { now: () => new Date(T0.getTime() + 1000 * tick++) });
    const car = await gw.decodeVin(VIN);
    expect(car).toMatchObject({ status: "success", epc: "byd", ambiguous: true, source: "fixture" });
    expect(car.candidates).toHaveLength(2);
    const epc = car.epc!;
    const l1 = await gw.categories({ vin: VIN, epc, level: 1 });
    const electrical = l1.categories.find((c) => c.code === "10")!;
    const l2 = await gw.categories({ vin: VIN, epc, level: 2, parentCode: electrical.code });
    const telematics = l2.categories.find((c) => c.code === "10-07")!;
    const l3 = await gw.categories({ vin: VIN, epc, level: 3, parentCode: telematics.code });
    const leaf = l3.categories[0];
    expect(leaf).toMatchObject({ code: "SA3HJ-10071", last: true });
    const parts = await gw.parts({ vin: VIN, epc, categoryCode: leaf.code, level: leaf.level });
    // The two trims differ here, so the parts carry the option filter for the sourcer.
    expect(parts.parts.map((x) => [x.oe, x.modelOptional, x.modelNotOptional])).toEqual([
      ["10350218-00", "", "5G"],
      ["10350219-00", "5G", ""],
    ]);
    for (const r of [car, l1, l2, l3, parts]) expect(r.message.startsWith(FIXTURE_NOTICE)).toBe(true);
    const rows = await journal(db);
    expect(rows.map((r) => [r.provider, r.mode, r.inputMask])).toEqual([
      ["fixture", "fixture", "LGX…0001"],
      ["fixture", "fixture", "LGX…0001 byd L1"],
      ["fixture", "fixture", "LGX…0001 byd L2 10"],
      ["fixture", "fixture", "LGX…0001 byd L3 10-07"],
      ["fixture", "fixture", "LGX…0001 byd L3 SA3HJ-10071"],
    ]);
    expect(JSON.stringify(rows)).not.toContain(VIN);
  });

  it("decodes Li Auto but returns its empty catalog with code 0", async () => {
    const db = await createMemoryDb();
    const gw = createGateway(db, new FixtureProvider(), { now: T0 });
    const car = await gw.decodeVin(FIXTURE_VINS.liAutoL6);
    expect(car).toMatchObject({ status: "success", ambiguous: false });
    expect(await gw.categories({ vin: FIXTURE_VINS.liAutoL6, epc: car.epc!, level: 1 })).toMatchObject({
      status: "empty",
      providerCode: 0,
      categories: [],
    });
  });
});
