import { afterEach, describe, expect, it, vi } from "vitest";
import { isModelYearCode, makeVin, modelYear } from "@/lib/vin";
import { VINS } from "./fixtures";

const withYearCode = (c: string) => makeVin(`LGXCE4CB*${c}0999001`);
const at = (iso: string) => new Date(iso);

describe("modelYear", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("decodes fixtures", () => {
    const now = at("2026-06-01T00:00:00Z");
    expect(modelYear(VINS.bydLgx, now)).toBe(2024);
    expect(modelYear(VINS.changanLs6, now)).toBe(2023);
    expect(modelYear(VINS.chery, now)).toBe(2025);
    expect(modelYear(VINS.europe, now)).toBe(2008);
  });

  it("maps the letter cycle to 2010–2030 when that is not in the future", () => {
    const now = at("2026-06-01T00:00:00Z");
    const expected: Record<string, number> = {
      A: 2010,
      B: 2011,
      H: 2017,
      J: 2018,
      N: 2022,
      P: 2023,
      R: 2024,
      S: 2025,
      T: 2026,
      V: 2027,
      W: 1998,
      X: 1999,
      Y: 2000,
    };
    for (const [c, year] of Object.entries(expected)) expect(modelYear(withYearCode(c), now), c).toBe(year);
  });

  it("maps digits to 2001–2009 until the 2031 cycle starts", () => {
    const now = at("2026-06-01T00:00:00Z");
    for (let d = 1; d <= 9; d++) expect(modelYear(withYearCode(String(d)), now)).toBe(2000 + d);
  });

  it("allows next model year but not later", () => {
    expect(modelYear(withYearCode("V"), at("2026-01-15T00:00:00Z"))).toBe(2027);
    expect(modelYear(withYearCode("W"), at("2026-12-01T00:00:00Z"))).toBe(1998);
    expect(modelYear(withYearCode("W"), at("2027-01-15T00:00:00Z"))).toBe(2028);
  });

  it("moves to the next cycle in 2029–2031", () => {
    expect(modelYear(withYearCode("Y"), at("2029-03-01T00:00:00Z"))).toBe(2030);
    expect(modelYear(withYearCode("Y"), at("2028-03-01T00:00:00Z"))).toBe(2000);
    expect(modelYear(withYearCode("1"), at("2030-03-01T00:00:00Z"))).toBe(2031);
    expect(modelYear(withYearCode("2"), at("2030-03-01T00:00:00Z"))).toBe(2002);
    expect(modelYear(withYearCode("9"), at("2038-03-01T00:00:00Z"))).toBe(2039);
    expect(modelYear(withYearCode("A"), at("2039-03-01T00:00:00Z"))).toBe(2040);
  });

  it("uses the 1980 cycle for old reference dates", () => {
    const now = at("1995-06-01T00:00:00Z");
    expect(modelYear(withYearCode("A"), now)).toBe(1980);
    expect(modelYear(withYearCode("S"), now)).toBe(1995);
    expect(modelYear(withYearCode("T"), now)).toBe(1996);
    expect(modelYear(withYearCode("V"), now)).toBeNull();
    expect(modelYear(withYearCode("1"), now)).toBeNull();
  });

  it("returns null for codes that are not years", () => {
    const now = at("2026-06-01T00:00:00Z");
    for (const c of ["U", "Z", "0"]) expect(modelYear(withYearCode(c), now), c).toBeNull();
    for (const c of ["I", "O", "Q"]) expect(modelYear(`LGXCE4CB4${c}0999001`, now), c).toBeNull();
  });

  it("returns null for incomplete VINs and invalid dates", () => {
    expect(modelYear(VINS.bydLgx.slice(0, 16), at("2026-06-01T00:00:00Z"))).toBeNull();
    expect(modelYear("", at("2026-06-01T00:00:00Z"))).toBeNull();
    expect(modelYear(VINS.bydLgx, new Date("nonsense"))).toBeNull();
    expect(modelYear(null, at("2026-06-01T00:00:00Z"))).toBeNull();
    expect(modelYear(undefined, at("2026-06-01T00:00:00Z"))).toBeNull();
  });

  it("returns null when every year for the code is still in the future", () => {
    expect(modelYear(withYearCode("A"), at("1978-06-01T00:00:00Z"))).toBeNull();
    expect(modelYear(withYearCode("A"), at("1979-06-01T00:00:00Z"))).toBe(1980);
  });

  it("uses the UTC year, whatever the server time zone", () => {
    // 23:30 on 31 December in UTC is already 1 January in Almaty; the result must not depend on that.
    expect(modelYear(withYearCode("W"), at("2026-12-31T23:30:00Z"))).toBe(1998);
    expect(modelYear(withYearCode("W"), at("2027-01-01T00:00:00Z"))).toBe(2028);
  });

  it("never returns a year more than one year ahead", () => {
    for (let year = 1990; year <= 2060; year += 7) {
      const now = at(`${year}-06-01T00:00:00Z`);
      for (const c of "ABCDEFGHJKLMNPRSTVWXY123456789") {
        const result = modelYear(withYearCode(c), now);
        if (result === null) continue;
        expect(result, `${c} in ${year}`).toBeLessThanOrEqual(year + 1);
        expect(result, `${c} in ${year}`).toBeGreaterThan(year + 1 - 30);
      }
    }
  });

  it("normalizes input", () => {
    expect(modelYear(" lgx-ce4cb4-r0999001 ", at("2026-06-01T00:00:00Z"))).toBe(2024);
  });

  it("defaults to the current date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(at("2026-06-01T00:00:00Z"));
    expect(modelYear(withYearCode("A"))).toBe(2010);
    vi.setSystemTime(at("2040-06-01T00:00:00Z"));
    expect(modelYear(withYearCode("A"))).toBe(2040);
  });
});

describe("isModelYearCode", () => {
  it("accepts the 30 year codes only", () => {
    const valid = "ABCDEFGHJKLMNPRSTVWXY123456789";
    for (const c of valid) expect(isModelYearCode(c)).toBe(true);
    for (const c of ["I", "O", "Q", "U", "Z", "0", "", "AB", "-"]) expect(isModelYearCode(c), c).toBe(false);
    expect(isModelYearCode("r")).toBe(true);
  });
});
