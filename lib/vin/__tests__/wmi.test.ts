import { describe, expect, it } from "vitest";
import { VIN_CHARSET, WMI_TABLE, hasValidCheckDigit, makeVin, vinRegion, wmiInfo } from "@/lib/vin";
import { VINS } from "./fixtures";

describe("wmiInfo", () => {
  it("knows the prefixes seen in test data", () => {
    expect(wmiInfo(VINS.bydLc0)).toEqual({
      wmi: "LC0",
      region: "China",
      maker: "BYD",
      brands: ["BYD"],
      confidence: "observed",
    });
    expect(wmiInfo(VINS.liAuto)).toMatchObject({ wmi: "HLX", region: "China", maker: "Li Auto", confidence: "observed" });
    expect(wmiInfo(VINS.geelyL6t)).toMatchObject({
      wmi: "L6T",
      maker: "Geely Holding",
      brands: ["Zeekr", "Geely Galaxy", "Lynk & Co"],
      confidence: "observed",
    });
    expect(wmiInfo(VINS.changanLs6)).toMatchObject({
      wmi: "LS6",
      maker: "Changan",
      brands: ["Deepal", "Changan"],
      confidence: "observed",
    });
  });

  it("explains uncertain brands in a note", () => {
    expect(wmiInfo(VINS.geelyL6t).note).toMatch(/Lynk & Co возможен/);
    expect(wmiInfo(VINS.liAuto).note).toMatch(/Lixiang/);
    expect(wmiInfo(VINS.bydLgx)).not.toHaveProperty("note");
  });

  it("marks prefixes from public lists as likely", () => {
    const expected: [string, string, string[]][] = [
      ["LGX", "BYD", ["BYD"]],
      ["LS5", "Changan", ["Changan"]],
      ["LB3", "Geely", ["Geely"]],
      ["LVV", "Chery", ["Chery"]],
      ["LGW", "Great Wall", ["Great Wall", "Haval", "Tank", "Wey", "Ora"]],
    ];
    for (const [wmi, maker, brands] of expected) {
      const vin = makeVin(`${wmi}CE4CB*R0999001`);
      expect(hasValidCheckDigit(vin)).toBe(true);
      expect(wmiInfo(vin), wmi).toEqual({ wmi, region: "China", maker, brands, confidence: "likely" });
    }
  });

  it("keeps only the four trial prefixes as observed", () => {
    const observed = Object.entries(WMI_TABLE)
      .filter(([, entry]) => entry.confidence === "observed")
      .map(([wmi]) => wmi)
      .sort();
    expect(observed).toEqual(["HLX", "L6T", "LC0", "LS6"]);
  });

  it("returns unknown for Chinese prefixes not in the table", () => {
    expect(wmiInfo(VINS.unknownChina)).toEqual({
      wmi: "LFZ",
      region: "China",
      maker: null,
      brands: [],
      confidence: "unknown",
    });
  });

  it("returns unknown for other regions", () => {
    expect(wmiInfo(VINS.europe)).toEqual({ wmi: "WVW", region: "other", maker: null, brands: [], confidence: "unknown" });
    expect(wmiInfo(VINS.russia).region).toBe("other");
  });

  it("normalizes input and works on a partial VIN", () => {
    expect(wmiInfo(" lgx-ce4").maker).toBe("BYD");
    expect(wmiInfo("lс0").maker).toBe("BYD"); // Cyrillic с
    expect(wmiInfo("LG")).toEqual({ wmi: "LG", region: "China", maker: null, brands: [], confidence: "unknown" });
    expect(wmiInfo("")).toEqual({ wmi: "", region: "other", maker: null, brands: [], confidence: "unknown" });
  });

  it("returns a copy of brands", () => {
    wmiInfo(VINS.geelyL6t).brands.push("Volvo");
    expect(wmiInfo(VINS.geelyL6t).brands).toEqual(["Zeekr", "Geely Galaxy", "Lynk & Co"]);
  });

  it("does not match prototype keys or lowercase table lookups", () => {
    expect(wmiInfo("__proto__").maker).toBeNull();
    expect(wmiInfo("constructor").maker).toBeNull();
    expect(wmiInfo("hlx").maker).toBe("Li Auto");
  });

  it("accepts missing input", () => {
    expect(wmiInfo(null)).toEqual({ wmi: "", region: "other", maker: null, brands: [], confidence: "unknown" });
    expect(vinRegion(undefined)).toBe("other");
  });
});

describe("WMI_TABLE", () => {
  it("has well-formed entries", () => {
    for (const [wmi, entry] of Object.entries(WMI_TABLE)) {
      expect(wmi, wmi).toHaveLength(3);
      expect(VIN_CHARSET.test(wmi), wmi).toBe(true);
      expect(entry.maker.length, wmi).toBeGreaterThan(0);
      expect(entry.brands.length, wmi).toBeGreaterThan(0);
      expect(["observed", "likely"]).toContain(entry.confidence);
      expect(new Set(entry.brands).size, wmi).toBe(entry.brands.length);
    }
  });

  it("is frozen, so no caller can change it for the whole process", () => {
    expect(Object.isFrozen(WMI_TABLE)).toBe(true);
    for (const [wmi, entry] of Object.entries(WMI_TABLE)) {
      expect(Object.isFrozen(entry), wmi).toBe(true);
      expect(Object.isFrozen(entry.brands), wmi).toBe(true);
    }
    expect(() => (WMI_TABLE.LGW.brands as string[]).push("Volvo")).toThrow(TypeError);
    expect(WMI_TABLE.LGW.brands).not.toContain("Volvo");
  });

  it("only uses Chinese prefixes", () => {
    for (const wmi of Object.keys(WMI_TABLE)) expect(vinRegion(wmi), wmi).toBe("China");
  });
});

describe("vinRegion", () => {
  it("treats L and H as China", () => {
    expect(vinRegion(VINS.bydLgx)).toBe("China");
    expect(vinRegion(VINS.liAuto)).toBe("China");
    expect(vinRegion("lgx")).toBe("China");
    expect(vinRegion(VINS.europe)).toBe("other");
    expect(vinRegion(VINS.russia)).toBe("other");
    expect(vinRegion("")).toBe("other");
  });
});
