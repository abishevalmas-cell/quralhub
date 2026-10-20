import { describe, expect, it } from "vitest";
import { checkDigit, hasValidCheckDigit, makeVin } from "@/lib/vin";
import { VINS, setAt } from "./fixtures";

const CHECK_VALUES = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "X"];

// Copied from ISO 3779 / the product spec, not from the implementation.
const SPEC_TRANSLITERATION = "A1 B2 C3 D4 E5 F6 G7 H8 J1 K2 L3 M4 N5 P7 R9 S2 T3 U4 V5 W6 X7 Y8 Z9";
const SPEC_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
const asCheck = (n: number) => (n % 11 === 10 ? "X" : String(n % 11));

describe("checkDigit", () => {
  it("matches independently computed fixtures", () => {
    for (const vin of Object.values(VINS)) expect(checkDigit(vin)).toBe(vin[8]);
  });

  it("uses the ISO 3779 value of every letter", () => {
    // Position 1 has weight 8, and 8 is invertible modulo 11, so a wrong value always changes the result.
    const pairs = SPEC_TRANSLITERATION.split(" ");
    expect(pairs).toHaveLength(23);
    for (const pair of pairs) {
      const [letter, value] = [pair[0], Number(pair.slice(1))];
      expect(checkDigit(letter + "0".repeat(16)), letter).toBe(asCheck(value * 8));
    }
  });

  it("uses the face value of every digit", () => {
    for (let d = 0; d <= 9; d++) expect(checkDigit(String(d) + "0".repeat(16))).toBe(asCheck(d * 8));
  });

  it("uses the ISO 3779 weight at every position", () => {
    for (let i = 0; i < 17; i++) {
      const vin = "0".repeat(i) + "1" + "0".repeat(16 - i);
      expect(checkDigit(vin), `position ${i + 1}`).toBe(asCheck(SPEC_WEIGHTS[i]));
    }
  });

  it("gives 1 for the classic all-ones test VIN", () => {
    // Sum of weights is 89, and 89 mod 11 = 1, so 11111111111111111 is self-consistent.
    expect(checkDigit("11111111111111111")).toBe("1");
    expect(hasValidCheckDigit("11111111111111111")).toBe(true);
  });

  it("returns X for remainder 10 and 0 for remainder 0", () => {
    expect(checkDigit(VINS.checkX)).toBe("X");
    expect(checkDigit(VINS.checkZero)).toBe("0");
  });

  it("follows the weighted sum by hand", () => {
    // L G X C E 4 C B _ R 0 9 9 9 0 0 1
    // 3*8 + 7*7 + 7*6 + 3*5 + 5*4 + 4*3 + 3*2 + 2*10 + 9*9 + 0*8 + 9*7 + 9*6 + 9*5 + 0*4 + 0*3 + 1*2 = 433
    // 433 mod 11 = 4
    expect(checkDigit("LGXCE4CB_R0999001")).toBe("4");
  });

  it("ignores whatever stands at position 9", () => {
    for (const c of ["0", "X", "A", "*", "?"]) expect(checkDigit(setAt(VINS.bydLgx, 9, c))).toBe("4");
  });

  it("accepts lowercase", () => {
    expect(checkDigit(VINS.bydLgx.toLowerCase())).toBe("4");
  });

  it("throws on wrong length or characters that have no value", () => {
    expect(() => checkDigit("LGXCE4CB4R099900")).toThrow(RangeError);
    expect(() => checkDigit("LGXCE4CB4R09990011")).toThrow(RangeError);
    for (const c of ["I", "O", "Q", "-", "Ж", " "]) expect(() => checkDigit(setAt(VINS.bydLgx, 5, c))).toThrow(RangeError);
  });

  it("does not put the VIN into its error message", () => {
    // Errors end up in logs, and VINs are personal data.
    try {
      checkDigit(setAt(VINS.bydLgx, 5, "O"));
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain(VINS.bydLgx.slice(9));
    }
  });
});

describe("hasValidCheckDigit", () => {
  it("accepts the correct digit and rejects every other one", () => {
    for (const vin of Object.values(VINS)) {
      expect(hasValidCheckDigit(vin)).toBe(true);
      for (const c of CHECK_VALUES.filter((c) => c !== vin[8])) expect(hasValidCheckDigit(setAt(vin, 9, c))).toBe(false);
    }
  });

  it("catches a single mistyped digit at any other position", () => {
    const vin = VINS.bydLgx;
    for (let position = 1; position <= 17; position++) {
      if (position === 9) continue;
      // Letters are worth 1–9, so "0" always changes their value.
      const replacement = /\d/.test(vin[position - 1]) ? String((Number(vin[position - 1]) + 1) % 10) : "0";
      expect(hasValidCheckDigit(setAt(vin, position, replacement)), `position ${position}`).toBe(false);
    }
  });

  it("returns false instead of throwing on garbage", () => {
    expect(hasValidCheckDigit("")).toBe(false);
    expect(hasValidCheckDigit("LGX")).toBe(false);
    expect(hasValidCheckDigit(setAt(VINS.bydLgx, 3, "O"))).toBe(false);
    expect(hasValidCheckDigit(VINS.bydLgx + " ")).toBe(false);
  });

  it("accepts a lowercase x as the check digit", () => {
    expect(hasValidCheckDigit(VINS.checkX.toLowerCase())).toBe(true);
  });
});

describe("makeVin", () => {
  it("fills position 9 with the correct check digit", () => {
    expect(makeVin("LGXCE4CB*R0999001")).toBe(VINS.bydLgx);
    expect(makeVin("LGXCE4CB_R0999018")).toBe(VINS.checkX);
    expect(makeVin("lgxce4cb?r0999013")).toBe(VINS.checkZero);
  });

  it("repairs a wrong check digit", () => {
    expect(makeVin(setAt(VINS.liAuto, 9, "9"))).toBe(VINS.liAuto);
  });

  it("produces VINs that pass hasValidCheckDigit", () => {
    for (let n = 0; n < 50; n++) {
      const vin = makeVin(`LC0CE6CD*R${String(1_000_000 + n * 7919).slice(-7)}`);
      expect(vin).toHaveLength(17);
      expect(hasValidCheckDigit(vin)).toBe(true);
    }
  });

  it("throws on bad templates", () => {
    expect(() => makeVin("LGXCE4CB*R099900")).toThrow(RangeError);
    expect(() => makeVin("LGXCE4CB*R0O99001")).toThrow(RangeError);
  });
});
