import { describe, expect, it } from "vitest";
import { FIXTURE_NOTICE, FIXTURE_VINS, FixtureProvider, syntheticVin } from "@/lib/providers/fixture";
import { SeventeenVinProvider, sign17, type FetchLike } from "@/lib/providers/seventeen-vin";
import { getProvider } from "@/lib/providers";
import type { ProviderMeta } from "@/lib/providers/types";

// Independent ISO 3779 check, so the fixture helper is not tested against itself.
function hasValidCheckDigit(vin: string): boolean {
  const values: Record<string, number> = {};
  "0123456789".split("").forEach((d, i) => (values[d] = i));
  "ABCDEFGH".split("").forEach((c, i) => (values[c] = i + 1));
  "JKLMN".split("").forEach((c, i) => (values[c] = i + 1));
  values.P = 7;
  values.R = 9;
  "STUVWXYZ".split("").forEach((c, i) => (values[c] = i + 2));
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum = vin.split("").reduce((acc, c, i) => acc + values[c] * weights[i], 0);
  const expected = sum % 11 === 10 ? "X" : String(sum % 11);
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin) && vin[8] === expected;
}

const p = new FixtureProvider();
const BYD = FIXTURE_VINS.bydSongPlus;

describe("fixture VINs", () => {
  it("are synthetic with a correct check digit", () => {
    for (const vin of Object.values(FIXTURE_VINS)) {
      expect(hasValidCheckDigit(vin)).toBe(true);
      expect(vin).toContain("TX");
    }
    expect(BYD).toBe("LGXTXSP24PATX0001");
    expect(hasValidCheckDigit("LGXTXSP25PATX0001")).toBe(false);
  });
});

describe("FixtureProvider", () => {
  it("decodes the BYD Song Plus with two trims and does not pick one", async () => {
    const result = await p.decodeVin(BYD.toLowerCase());
    expect(result).toMatchObject({ status: "success", source: "fixture", epc: "byd", ambiguous: true, providerCode: 1 });
    expect(result.candidates.map((c) => c.version)).toEqual([
      "Champion Edition 150KM Flagship PLUS",
      "Champion Edition 150KM Flagship PLUS 5G",
    ]);
    expect(result.message).toContain(FIXTURE_NOTICE);
  });

  it("walks the three-level BYD catalog down to parts", async () => {
    const l1 = await p.categories({ vin: BYD, epc: "byd", level: 1 });
    expect(l1.status).toBe("success");
    expect(l1.categories.map((c) => c.code)).toEqual(["01", "03", "06", "10"]);
    expect(l1.categories.every((c) => c.level === 1 && !c.last)).toBe(true);

    const l2 = await p.categories({ vin: BYD, epc: "byd", level: 2, parentCode: "06" });
    expect(l2.categories.map((c) => c.code)).toEqual(["06-01", "06-02"]);

    const l3 = await p.categories({ vin: BYD, epc: "byd", level: 3, parentCode: "06-01" });
    expect(l3.categories).toEqual([
      { code: "SA3HJ-06002", level: 3, last: true, name: "Body main", remark: "", diagram: null, providerFit: true },
    ]);

    const parts = await p.parts({ vin: BYD, epc: "byd", categoryCode: "SA3HJ-06002", level: 3 });
    expect(parts.status).toBe("success");
    expect(parts.parts.map((x) => x.oe)).toEqual(["14905517-00", "10140262-00", "11090351-00"]);
    expect(parts.parts.every((x) => x.compatibility === "requires_review" && /^\d{8}-\d{2}$/.test(x.oe))).toBe(true);
  });

  it("supports a group that is already last at level 2", async () => {
    const l2 = await p.categories({ vin: BYD, epc: "byd", level: 2, parentCode: "10" });
    expect(l2.categories.find((c) => c.code === "10-05")).toMatchObject({ last: true, level: 2 });
    const parts = await p.parts({ vin: BYD, epc: "byd", categoryCode: "10-05", level: 2 });
    expect(parts.parts).toHaveLength(2);
    // A non-leaf group has no parts.
    expect((await p.parts({ vin: BYD, epc: "byd", categoryCode: "10-03", level: 2 })).status).toBe("empty");
  });

  it("finds fixture OE numbers with or without separators", async () => {
    const exact = await p.searchOe("10273368-00");
    expect(exact.status).toBe("success");
    expect(exact.parts[0]).toMatchObject({ oe: "10273368-00", name: "Front brake pad kit" });
    expect((await p.searchOe("1027336800")).parts[0].oe).toBe("10273368-00");
    expect((await p.searchOe("c385b120301-0100")).parts[0].oe).toBe("C385B120301-0100");
    const missing = await p.searchOe("99999999-99");
    expect(missing).toMatchObject({ status: "empty", providerCode: 0, parts: [] });
  });

  it("decodes Geely Galaxy E5 and Changan Deepal S7 with one trim each", async () => {
    const geely = await p.decodeVin(FIXTURE_VINS.geelyGalaxyE5);
    expect(geely).toMatchObject({ status: "success", epc: "geely", ambiguous: false });
    expect(geely.candidates).toHaveLength(1);
    expect(geely.candidates[0]).toMatchObject({ brand: "Geely Galaxy", model: "Galaxy E5", year: "2025" });
    const body = await p.parts({ vin: FIXTURE_VINS.geelyGalaxyE5, epc: "geely", categoryCode: "5010-11", level: 3 });
    expect(body.parts[0].oe).toBe("6608412345C15");
    // A level-1 group without subgroups answers "empty", like real catalogs sometimes do.
    expect((await p.categories({ vin: FIXTURE_VINS.geelyGalaxyE5, epc: "geely", level: 2, parentCode: "70" })).status).toBe("empty");

    const deepal = await p.decodeVin(FIXTURE_VINS.deepalS7);
    expect(deepal).toMatchObject({ status: "success", epc: "changan", ambiguous: false });
    expect(deepal.candidates[0]).toMatchObject({ brand: "Deepal", model: "Deepal S7", year: "2024" });
    const brakes = await p.parts({ vin: FIXTURE_VINS.deepalS7, epc: "changan", categoryCode: "B120301", level: 3 });
    expect(brakes.parts.map((x) => x.oe)).toContain("C385B120301-0100");
  });

  it("decodes Li Auto L6 but its catalog is empty with code 0", async () => {
    const vin = FIXTURE_VINS.liAutoL6;
    const decoded = await p.decodeVin(vin);
    expect(decoded).toMatchObject({ status: "success", ambiguous: false });
    expect(decoded.candidates[0]).toMatchObject({ brand: "Li Auto", model: "L6", year: "2024" });
    expect(await p.categories({ vin, epc: decoded.epc!, level: 1 })).toMatchObject({ status: "empty", providerCode: 0, categories: [] });
    expect((await p.parts({ vin, epc: decoded.epc!, categoryCode: "01", level: 1 })).providerCode).toBe(0);
  });

  it("decodes Zeekr 001 but its catalog is unsupported with code 1003", async () => {
    const vin = FIXTURE_VINS.zeekr001;
    const decoded = await p.decodeVin(vin);
    expect(decoded.candidates[0]).toMatchObject({ brand: "Zeekr", model: "001", year: "2024" });
    expect(await p.categories({ vin, epc: "zeekr", level: 1 })).toMatchObject({ status: "unsupported", providerCode: 1003 });
  });

  it("answers empty for unknown VINs and invalid for bad input", async () => {
    const unknown = syntheticVin("LGX", "TXUNK", "PATX0099");
    expect(hasValidCheckDigit(unknown)).toBe(true);
    expect(await p.decodeVin(unknown)).toMatchObject({ status: "empty", candidates: [], ambiguous: false });
    expect((await p.categories({ vin: unknown, epc: "byd", level: 1 })).status).toBe("empty");
    expect((await p.decodeVin("not a vin")).status).toBe("invalid");
    expect((await p.categories({ vin: BYD, epc: "byd", level: 2 })).status).toBe("invalid");
    expect(await p.categories({ vin: BYD, epc: "geely", level: 1 })).toMatchObject({ status: "invalid", providerCode: 1001 });
    expect((await p.searchOe("")).status).toBe("invalid");
  });

  it("says every answer is an example", async () => {
    const vin = FIXTURE_VINS.zeekr001;
    const results: ProviderMeta[] = [
      await p.decodeVin(BYD),
      await p.decodeVin(FIXTURE_VINS.geelyGalaxyE5),
      await p.decodeVin("bad"),
      await p.decodeVin(syntheticVin("LGX", "TXUNK", "PATX0099")),
      await p.categories({ vin: BYD, epc: "byd", level: 1 }),
      await p.categories({ vin: BYD, epc: "byd", level: 3, parentCode: "nope" }),
      await p.categories({ vin, epc: "zeekr", level: 1 }),
      await p.categories({ vin: FIXTURE_VINS.liAutoL6, epc: "lixiang", level: 1 }),
      await p.parts({ vin: BYD, epc: "byd", categoryCode: "SA3HJ-01021", level: 3 }),
      await p.parts({ vin: BYD, epc: "byd", categoryCode: "", level: 3 }),
      await p.searchOe("10301727-00"),
      await p.searchOe("00000000-00"),
    ];
    for (const r of results) {
      expect(r.message.startsWith(FIXTURE_NOTICE)).toBe(true);
      expect(r.source).toBe("fixture");
    }
  });

  it("returns copies, so callers cannot change the fixtures", async () => {
    const first = await p.decodeVin(BYD);
    first.candidates[0].version = "changed";
    const parts = await p.parts({ vin: BYD, epc: "byd", categoryCode: "SA3HJ-06011", level: 3 });
    parts.parts[0].oe = "changed";
    expect((await p.decodeVin(BYD)).candidates[0].version).not.toBe("changed");
    expect((await p.parts({ vin: BYD, epc: "byd", categoryCode: "SA3HJ-06011", level: 3 })).parts[0].oe).toBe("10185533-00");
  });
});

describe("getProvider", () => {
  it("uses 17VIN only when both credentials are set", () => {
    const live = getProvider({ TETIX_17VIN_USER: "u", TETIX_17VIN_PASSWORD: "p" });
    expect(live).toBeInstanceOf(SeventeenVinProvider);
    expect(live.mode).toBe("live");
    expect(live.name).toBe("17vin");
    for (const env of [
      {},
      { TETIX_17VIN_USER: "u" },
      { TETIX_17VIN_PASSWORD: "p" },
      { TETIX_17VIN_USER: " ", TETIX_17VIN_PASSWORD: "p" },
      { TETIX_17VIN_USER: "u", TETIX_17VIN_PASSWORD: " \n" },
    ]) {
      const provider = getProvider(env);
      expect(provider).toBeInstanceOf(FixtureProvider);
      expect(provider.mode).toBe("fixture");
    }
  });
});

describe("getProvider with live credentials", () => {
  it("signs with trimmed credentials and uses the injected fetch", async () => {
    const urls: string[] = [];
    const fetcher: FetchLike = async (url) => {
      urls.push(url);
      return new Response(JSON.stringify({ code: 0 }));
    };
    const live = getProvider({ TETIX_17VIN_USER: " tetix ", TETIX_17VIN_PASSWORD: "secret\n" }, fetcher);
    expect((await live.decodeVin(BYD)).status).toBe("empty");
    expect(urls).toEqual([sign17(`/?vin=${BYD}`, "tetix", "secret")]);
  });
});

describe("fixture catalog data", () => {
  it("lists the BYD trim difference as an option filter", async () => {
    const parts = await p.parts({ vin: BYD, epc: "byd", categoryCode: "SA3HJ-10071", level: 3 });
    expect(parts.parts.map((x) => x.modelOptional || "!" + x.modelNotOptional)).toEqual(["!5G", "5G"]);
  });

  it("has well-formed, unique OE numbers in every car", async () => {
    const cars = [
      { vin: BYD, epc: "byd" },
      { vin: FIXTURE_VINS.geelyGalaxyE5, epc: "geely" },
      { vin: FIXTURE_VINS.deepalS7, epc: "changan" },
    ];
    for (const car of cars) {
      const oes: string[] = [];
      const walk = async (level: 1 | 2 | 3, parentCode?: string): Promise<void> => {
        const list = await p.categories(parentCode ? { ...car, level, parentCode } : { ...car, level });
        for (const c of list.categories) {
          if (c.last) {
            const found = await p.parts({ ...car, categoryCode: c.code, level: c.level });
            for (const part of found.parts) {
              expect(part.oe).toMatch(/^[A-Z0-9][A-Z0-9-]+$/);
              expect(part.normalizedOe).toBe(part.oe.replace(/-/g, ""));
              expect((await p.searchOe(part.oe)).parts.map((x) => x.oe)).toContain(part.oe);
              oes.push(part.oe);
            }
          } else if (level < 3) await walk((level + 1) as 2 | 3, c.code);
        }
      };
      await walk(1);
      expect(oes.length).toBeGreaterThan(1);
      expect(new Set(oes).size).toBe(oes.length);
    }
  });
});
