// Decimal amounts (yuan, exchange rates, weights, percents) become scaled integers before any arithmetic,
// so "1234.50" ¥ is exactly 123450 fen and never drifts the way 1234.5 * 67.75 does in floating point.

// The integer part is plain digits or groups of three split by single spaces ("1 234 567", as Russian forms
// print it). A space anywhere else ("12 5") is more likely a typo for "12,5" than a thousands separator, and
// reading it as 125 would multiply the price by ten, so it is rejected. \s also covers no-break spaces.
const DECIMAL_RE = /^(\d+|\d{1,3}(?:\s\d{3})+)(?:[.,](\d+))?$/;
// 15 digits always fit into Number.MAX_SAFE_INTEGER.
const MAX_DIGITS = 15;

// Returns value × 10^scale as an integer, or null when the value is not a non-negative decimal
// with at most `scale` significant fraction digits. Accepts "1234.50", "1234,5", "1 234,50" and plain numbers.
export function toScaled(value: unknown, scale: number): number | null {
  let text: string;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    // String() gives the shortest round-trip form: 1234.5 → "1234.5", 0.1 + 0.2 → "0.30000000000000004" (rejected).
    text = String(value);
  } else if (typeof value === "string") {
    text = value.trim();
  } else {
    return null;
  }
  const match = DECIMAL_RE.exec(text);
  if (!match) return null;
  const whole = match[1].replace(/\s/g, "");
  const fraction = (match[2] ?? "").replace(/0+$/, "");
  if (fraction.length > scale) return null;
  const digits = (whole + fraction.padEnd(scale, "0")).replace(/^0+(?=\d)/, "");
  if (digits.length > MAX_DIGITS) return null;
  return Number(digits);
}

// Formats a scaled integer back as a plain decimal string: fromScaled(123450, 2) → "1234.50".
// Throws on non-integers: silently truncating would write a wrong amount into a numeric column.
export function fromScaled(scaled: number, scale: number): string {
  if (!Number.isSafeInteger(scaled)) throw new RangeError(`fromScaled: ${scaled} is not a safe integer`);
  const sign = scaled < 0 ? "-" : "";
  const digits = String(Math.abs(scaled)).padStart(scale + 1, "0");
  if (scale === 0) return sign + digits;
  return `${sign}${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}

// Yuan ↔ fen (1 ¥ = 100 fen). The string form matches the numeric(12,2) price_cny column.
export const parseCnyToFen = (value: unknown): number | null => toScaled(value, 2);
export const fenToCnyString = (fen: number): string => fromScaled(fen, 2);

// Thousands grouping with a no-break space, as formatKzt in lib/utils prints for ru-RU,
// but without depending on the runtime's ICU data.
export function groupThousands(value: bigint | number | string): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
