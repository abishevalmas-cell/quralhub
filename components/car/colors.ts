// Paint colors and the shading math of the car illustrations. Every shade is computed from one base hex,
// so any color works: white gets cool gray shadows instead of looking flat, black keeps visible highlights.

export type CarColor = { id: string; label: string; hex: string };

export const CAR_COLORS = [
  { id: "white", label: "Белый", hex: "#f1f3f2" },
  { id: "black", label: "Чёрный", hex: "#16191c" },
  { id: "graphite", label: "Серый металлик", hex: "#5f676e" },
  { id: "silver", label: "Серебристый", hex: "#b9c0c5" },
  { id: "blue", label: "Синий", hex: "#2b4f7e" },
  { id: "zeekr-green", label: "Зелёный «Zeekr»", hex: "#7fa6a2" },
  { id: "red", label: "Красный", hex: "#a8232b" },
  { id: "beige", label: "Бежевый", hex: "#d6c6aa" },
  { id: "tank-green", label: "Тёмно-зелёный «Tank»", hex: "#465243" },
] as const satisfies readonly CarColor[];

export type CarColorId = (typeof CAR_COLORS)[number]["id"];

/** The paint used when a color is missing or unreadable: neutral silver, never a made-up brand color. */
export const DEFAULT_PAINT = "#b9c0c5";

export const carColorById = (id: string | null | undefined): CarColor | undefined => CAR_COLORS.find((c) => c.id === id);

type Rgb = { r: number; g: number; b: number };

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** "#fff", "#ffffff" or "ffffff" → channels 0–255; anything else → null. */
export function parseHex(input: string | null | undefined): Rgb | null {
  const s = String(input ?? "").trim().replace(/^#/, "");
  const full = /^[0-9a-f]{3}$/i.test(s) ? s.replace(/./g, (c) => c + c) : s;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const toHex = ({ r, g, b }: Rgb) =>
  "#" + [r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("");

/** A valid lowercase "#rrggbb"; an unreadable input becomes the fallback (silver by default). */
export function normalizeHex(input: string | null | undefined, fallback: string = DEFAULT_PAINT): string {
  const rgb = parseHex(input) ?? parseHex(fallback) ?? parseHex(DEFAULT_PAINT)!;
  return toHex(rgb);
}

/** Linear mix in sRGB: t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const x = parseHex(normalizeHex(a))!;
  const y = parseHex(normalizeHex(b))!;
  const k = clamp01(t);
  return toHex({ r: x.r + (y.r - x.r) * k, g: x.g + (y.g - x.g) * k, b: x.b + (y.b - x.b) * k });
}

// Light and shadow in the studio are slightly cool, like the stage background.
const COOL_WHITE = "#f7fafc";
const COOL_BLACK = "#0a1015";

export const lighten = (hex: string, amount: number) => mix(hex, COOL_WHITE, amount);
export const darken = (hex: string, amount: number) => mix(hex, COOL_BLACK, amount);

/** WCAG relative luminance, 0 (black) … 1 (white). */
export function luminance(hex: string): number {
  const { r, g, b } = parseHex(normalizeHex(hex))!;
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export type PaintShades = {
  base: string;
  /** Roof and upper surfaces that face the studio light. */
  top: string;
  /** The crisp catch light along the shoulder line. */
  highlight: string;
  /** Just under the shoulder, still lit. */
  upper: string;
  /** The horizon reflection band across the doors. */
  horizon: string;
  /** Lower doors that reflect the floor. */
  lower: string;
  /** Rocker and bumper bottoms. */
  bottom: string;
  /** Shadow color for seams, arch lips and the body ends. */
  shadow: string;
  /** Light edge of a seam. */
  edgeLight: string;
  /** True for light paints (white, silver, beige): their seams need more contrast. */
  light: boolean;
};

/**
 * All shades of one paint. Light paints fall off into cool gray (so white is never flat), dark paints get
 * stronger highlights (so black keeps its shape), mid tones use a symmetric curve.
 */
export function paintShades(input: string | null | undefined): PaintShades {
  const base = normalizeHex(input);
  const l = luminance(base);
  const light = l > 0.5;
  const dark = l < 0.05;
  if (light) {
    return {
      base,
      top: lighten(base, 0.55),
      highlight: "#ffffff",
      upper: lighten(base, 0.25),
      horizon: mix(base, "#c9d3da", 0.55),
      lower: mix(base, "#8794a0", 0.42),
      bottom: mix(base, "#5d6a75", 0.62),
      shadow: "#3c4852",
      edgeLight: "#ffffff",
      light,
    };
  }
  if (dark) {
    return {
      base,
      top: mix(base, "#93a3b0", 0.42),
      highlight: mix(base, "#e3eaf0", 0.75),
      upper: mix(base, "#7b8a96", 0.26),
      horizon: mix(base, "#a9b7c2", 0.32),
      lower: mix(base, "#3a4650", 0.25),
      bottom: darken(base, 0.35),
      shadow: "#000000",
      edgeLight: mix(base, "#d5dee5", 0.5),
      light,
    };
  }
  return {
    base,
    top: lighten(base, 0.36),
    highlight: lighten(base, 0.78),
    upper: lighten(base, 0.14),
    horizon: lighten(base, 0.3),
    lower: darken(base, 0.24),
    bottom: darken(base, 0.48),
    shadow: darken(base, 0.82),
    edgeLight: lighten(base, 0.62),
    light,
  };
}
