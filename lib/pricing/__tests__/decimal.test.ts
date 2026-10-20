import { describe, expect, it } from "vitest";
import { fenToCnyString, fromScaled, groupThousands, parseCnyToFen, toScaled } from "@/lib/pricing";

describe("toScaled", () => {
  it("turns yuan strings into exact fen", () => {
    expect(parseCnyToFen("1234.50")).toBe(123450);
    expect(parseCnyToFen("1234,5")).toBe(123450);
    expect(parseCnyToFen(" 1 234,50 ")).toBe(123450);
    expect(parseCnyToFen("1 234.50")).toBe(123450);
    expect(parseCnyToFen("0.01")).toBe(1);
    expect(parseCnyToFen("007")).toBe(700);
    expect(parseCnyToFen("19.990")).toBe(1999);
  });

  it("accepts plain numbers without float drift", () => {
    expect(parseCnyToFen(1234.5)).toBe(123450);
    expect(parseCnyToFen(19.99)).toBe(1999);
    expect(parseCnyToFen(0.29)).toBe(29);
    expect(toScaled(67.75, 4)).toBe(677500);
    expect(toScaled(1.005, 3)).toBe(1005);
  });

  it("rejects values it cannot represent exactly", () => {
    expect(parseCnyToFen("1.234")).toBeNull();
    expect(parseCnyToFen(0.1 + 0.2)).toBeNull();
    expect(parseCnyToFen("-5")).toBeNull();
    expect(parseCnyToFen(-5)).toBeNull();
    expect(parseCnyToFen("1,234.50")).toBeNull();
    expect(parseCnyToFen("1e3")).toBeNull();
    expect(parseCnyToFen(1e21)).toBeNull();
    expect(parseCnyToFen(".5")).toBeNull();
    expect(parseCnyToFen("")).toBeNull();
    expect(parseCnyToFen("abc")).toBeNull();
    expect(parseCnyToFen(Number.NaN)).toBeNull();
    expect(parseCnyToFen(Number.POSITIVE_INFINITY)).toBeNull();
    expect(parseCnyToFen(null)).toBeNull();
    expect(parseCnyToFen("1".repeat(16))).toBeNull();
    expect(parseCnyToFen("+5")).toBeNull();
    expect(parseCnyToFen("5.")).toBeNull();
    expect(parseCnyToFen("1.234,50")).toBeNull();
    expect(parseCnyToFen("\u0661\u0662")).toBeNull(); // Arabic-Indic digits
  });

  it("accepts spaces only as thousands separators", () => {
    expect(parseCnyToFen("1 234 567,89")).toBe(123_456_789);
    expect(parseCnyToFen("12 345")).toBe(1_234_500);
    expect(parseCnyToFen("1\u00a0234,50")).toBe(123_450); // no-break space, as formatKzt prints
    expect(parseCnyToFen("1\u202f234")).toBe(123_400); // narrow no-break space
    // Anything else is a typo: "12 5" read as 125 would multiply the price by ten.
    expect(parseCnyToFen("12 5")).toBeNull();
    expect(parseCnyToFen("1 2 3")).toBeNull();
    expect(parseCnyToFen("1234 567")).toBeNull();
    expect(parseCnyToFen("1  234")).toBeNull();
    expect(parseCnyToFen("1 234,5 0")).toBeNull();
  });

  it("formats scaled integers back", () => {
    expect(fenToCnyString(123450)).toBe("1234.50");
    expect(fenToCnyString(5)).toBe("0.05");
    expect(fenToCnyString(0)).toBe("0.00");
    expect(fromScaled(677500, 4)).toBe("67.7500");
    expect(fromScaled(42, 0)).toBe("42");
    expect(fromScaled(-5, 2)).toBe("-0.05");
  });

  it("refuses to format values that are not safe integers", () => {
    expect(() => fromScaled(1.7, 2)).toThrow(RangeError);
    expect(() => fromScaled(1e21, 2)).toThrow(RangeError);
    expect(() => fenToCnyString(Number.NaN)).toThrow(RangeError);
  });

  it("round-trips every fen value through the column format", () => {
    for (const fen of [1, 9, 10, 99, 100, 101, 123_450, 99_999_999, 999_999_999_999]) {
      expect(parseCnyToFen(fenToCnyString(fen))).toBe(fen);
    }
  });
});

describe("groupThousands", () => {
  it("groups with a no-break space like formatKzt", () => {
    expect(groupThousands(999)).toBe("999");
    expect(groupThousands(1000)).toBe("1\u00a0000");
    expect(groupThousands(BigInt(1_234_567))).toBe("1\u00a0234\u00a0567");
    expect(groupThousands("2147483647")).toBe("2\u00a0147\u00a0483\u00a0647");
  });
});
