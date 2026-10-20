import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "../utils";

describe("dates in Kazakhstan time", () => {
  it("shows a late-evening UTC moment as the next day in Astana (UTC+5), whatever the server's time zone", () => {
    const lateEvening = new Date("2026-10-20T20:30:00Z");
    expect(formatDate(lateEvening)).toBe("21 окт. 2026 г.");
    expect(formatDateTime(lateEvening)).toBe("21 окт., 01:30");
    expect(formatDateTime("2026-10-20T07:48:00Z")).toBe("20 окт., 12:48");
  });

  it("prints a dash for a missing date", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });
});

describe("brandModel", () => {
  it("does not repeat the brand when the model starts with it", async () => {
    const { brandModel } = await import("../utils");
    expect(brandModel("Deepal", "Deepal S7")).toBe("Deepal S7");
    expect(brandModel("Geely Galaxy", "Galaxy E5")).toBe("Geely Galaxy E5");
    expect(brandModel("BYD", "byd Song Plus")).toBe("BYD Song Plus");
    expect(brandModel("BYD", "Song Plus")).toBe("BYD Song Plus");
    expect(brandModel("Li Auto", "L6")).toBe("Li Auto L6");
    expect(brandModel(null, "Tiggo 7")).toBe("Tiggo 7");
    expect(brandModel(" ", null)).toBeNull();
  });
});
