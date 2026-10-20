import { describe, expect, it } from "vitest";
import { makeVin, maskVin, vinSummary } from "@/lib/vin";
import { VINS, setAt } from "./fixtures";

const now = new Date("2026-06-01T00:00:00Z");

describe("maskVin", () => {
  it("keeps the WMI and the last four characters", () => {
    expect(maskVin(VINS.bydLgx)).toBe("LGX…9001");
    expect(maskVin(VINS.liAuto)).toBe("HLX…9005");
  });

  it("normalizes before masking", () => {
    expect(maskVin(" lgx-ce4cb4.r0 999 001 ")).toBe("LGX…9001");
  });

  it("hides positions 4–13 of every VIN", () => {
    for (let n = 0; n < 200; n++) {
      const vin = makeVin(`LGXC${"ABCDEFGH"[n % 8]}${n % 10}CB*R${String(1_000_000 + n * 4231).slice(-7)}`);
      const masked = maskVin(vin);
      expect(masked).toBe(`${vin.slice(0, 3)}…${vin.slice(13)}`);
      expect(masked).toHaveLength(8);
    }
  });

  it("masks malformed input too", () => {
    expect(maskVin(VINS.bydLgx + "99")).toBe("LGX…0199");
    expect(maskVin("LGXCE4CB")).toBe("LGX…E4CB");
    expect(maskVin("LGX1")).toBe("…");
    expect(maskVin("")).toBe("—");
    expect(maskVin(null)).toBe("—");
    expect(maskVin(undefined)).toBe("—");
  });

  it("copies only VIN alphabet characters into the mask", () => {
    // Masked values go to logs: no markup, quotes or escape codes, and never half of a surrogate pair.
    expect(maskVin("<script>alert(1)</script>")).toBe("*SC…IPT*");
    expect(maskVin("\u001b[31mLGXCE4CB4R0999001\u001b[0m")).toBe("*31…1*0M");
    expect(maskVin("LGXCE4CB4R09990\u{1F697}\u{1F697}")).toBe("LGX…90**");
    expect(maskVin("ЖЖЖЖЖЖЖЖ")).toBe("***…****");
  });

  it("keeps I, O and Q so support can see the typo", () => {
    expect(maskVin(setAt(VINS.bydLgx, 17, "O"))).toBe("LGX…900O");
  });

  it("strips invisible characters before masking", () => {
    expect(maskVin("LGX\u00adCE4CB4R0999\u200b001")).toBe("LGX…9001");
  });
});

describe("vinSummary", () => {
  it("shows the brand and model year", () => {
    expect(vinSummary(VINS.bydLgx, now)).toBe("BYD · 2024 модельный год");
    expect(vinSummary(VINS.bydLc0, now)).toBe("BYD · 2024 модельный год");
    expect(vinSummary(VINS.liAuto, now)).toBe("Li Auto · 2024 модельный год");
    expect(vinSummary(VINS.chery, now)).toBe("Chery · 2025 модельный год");
  });

  it("shows the maker when the WMI covers several brands", () => {
    expect(vinSummary(VINS.geelyL6t, now)).toBe("Geely Holding · 2024 модельный год");
    expect(vinSummary(VINS.changanLs6, now)).toBe("Changan · 2023 модельный год");
    expect(vinSummary(makeVin("LGWEF4E2*R0999010"), now)).toBe("Great Wall · 2024 модельный год");
  });

  it("says Chinese manufacturer for unknown Chinese prefixes", () => {
    expect(vinSummary(VINS.unknownChina, now)).toBe("Китайский производитель · 2024 модельный год");
  });

  it("shows only the year for unknown makers outside China", () => {
    expect(vinSummary(VINS.europe, now)).toBe("2008 модельный год");
  });

  it("shows only the maker when position 10 is not a year", () => {
    expect(vinSummary(makeVin("LGXCE4CB*Z0999001"), now)).toBe("BYD");
  });

  it("handles partial and empty input", () => {
    expect(vinSummary("LGX", now)).toBe("BYD");
    expect(vinSummary("LG", now)).toBe("Марка и год не определены");
    expect(vinSummary("", now)).toBe("Марка и год не определены");
    expect(vinSummary(null, now)).toBe("Марка и год не определены");
    expect(vinSummary(undefined, now)).toBe("Марка и год не определены");
  });

  it("normalizes input", () => {
    expect(vinSummary("lgx ce4cb4 r0999001", now)).toBe("BYD · 2024 модельный год");
  });
});
