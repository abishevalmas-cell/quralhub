import { describe, expect, it } from "vitest";
import { CAR_COLORS, DEFAULT_PAINT, carColorById, darken, lighten, luminance, mix, normalizeHex, paintShades, parseHex } from "../colors";

const HEX = /^#[0-9a-f]{6}$/;

describe("parseHex and normalizeHex", () => {
  it("reads short and long hex, with or without #", () => {
    expect(parseHex("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex("#000")).toEqual({ r: 0, g: 0, b: 0 });
    expect(parseHex("7FA6A2")).toEqual({ r: 127, g: 166, b: 162 });
    expect(normalizeHex("#FFF")).toBe("#ffffff");
  });

  it("rejects anything else and falls back to silver, never to black or NaN", () => {
    for (const bad of ["", "nope", "#12", "#12345", "#gggggg", "rgb(0,0,0)", null, undefined]) {
      expect(parseHex(bad)).toBeNull();
      expect(normalizeHex(bad)).toBe(DEFAULT_PAINT);
    }
    expect(normalizeHex("oops", "#123456")).toBe("#123456");
    expect(normalizeHex("oops", "also wrong")).toBe(DEFAULT_PAINT);
  });
});

describe("mix, lighten, darken", () => {
  it("handles white and black at the ends of the range", () => {
    expect(mix("#000", "#fff", 0)).toBe("#000000");
    expect(mix("#000", "#fff", 1)).toBe("#ffffff");
    expect(mix("#000", "#fff", 7)).toBe("#ffffff");
    expect(mix("#000", "#fff", Number.NaN)).toBe("#000000");
    expect(lighten("#fff", 0.5)).toMatch(HEX);
    expect(darken("#000", 0.5)).toMatch(HEX);
    expect(luminance(lighten("#000", 0.5))).toBeGreaterThan(luminance("#000"));
    expect(luminance(darken("#fff", 0.5))).toBeLessThan(luminance("#fff"));
  });

  it("treats invalid input as the default paint instead of throwing", () => {
    expect(lighten("oops", 0.2)).toBe(lighten(DEFAULT_PAINT, 0.2));
    expect(darken("", 0.2)).toBe(darken(DEFAULT_PAINT, 0.2));
    expect(luminance("oops")).toBeCloseTo(luminance(DEFAULT_PAINT));
  });
});

describe("paintShades", () => {
  const all = (s: ReturnType<typeof paintShades>) => [s.base, s.top, s.highlight, s.upper, s.horizon, s.lower, s.bottom, s.shadow, s.edgeLight];

  it("returns valid colors for every paint, white, black and garbage", () => {
    for (const hex of [...CAR_COLORS.map((c) => c.hex), "#fff", "#000", "#ffffff", "#000000", "garbage"])
      for (const c of all(paintShades(hex))) expect(c).toMatch(HEX);
    expect(paintShades("garbage")).toEqual(paintShades(DEFAULT_PAINT));
  });

  it("gives white visible, cool gray shading instead of a flat shape", () => {
    const s = paintShades("#ffffff");
    expect(s.light).toBe(true);
    expect(luminance(s.base) - luminance(s.bottom)).toBeGreaterThan(0.4);
    expect(luminance(s.base) - luminance(s.lower)).toBeGreaterThan(0.2);
    const { r, b } = parseHex(s.lower)!;
    expect(b).toBeGreaterThan(r);
  });

  it("keeps visible highlights on black", () => {
    const s = paintShades("#000000");
    expect(s.light).toBe(false);
    expect(luminance(s.highlight) - luminance(s.base)).toBeGreaterThan(0.3);
    expect(luminance(s.top)).toBeGreaterThan(luminance(s.base) + 0.05);
  });

  it("orders mid tones from light on top to dark at the bottom", () => {
    const s = paintShades("#2b4f7e");
    expect(luminance(s.highlight)).toBeGreaterThan(luminance(s.top));
    expect(luminance(s.top)).toBeGreaterThan(luminance(s.base));
    expect(luminance(s.base)).toBeGreaterThan(luminance(s.lower));
    expect(luminance(s.lower)).toBeGreaterThan(luminance(s.bottom));
  });
});

describe("CAR_COLORS", () => {
  it("has unique ids, Russian labels and valid hex", () => {
    const ids = CAR_COLORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CAR_COLORS) {
      expect(c.hex).toMatch(HEX);
      expect(c.label).toMatch(/[а-яё]/i);
    }
    expect(ids).toEqual(expect.arrayContaining(["white", "black", "graphite", "silver", "blue", "zeekr-green", "red", "beige", "tank-green"]));
    expect(carColorById("tank-green")?.label).toBe("Тёмно-зелёный «Tank»");
    expect(carColorById("nope")).toBeUndefined();
  });
});
