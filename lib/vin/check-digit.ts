import { VIN_LENGTH } from "./normalize";

// ISO 3779 / 49 CFR 565 check digit: weighted sum of transliterated characters modulo 11.
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
const CHECK_INDEX = 8;

const LETTER_VALUES: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9,
};

function charValue(c: string): number | null {
  if (c >= "0" && c <= "9") return c.charCodeAt(0) - 48;
  return LETTER_VALUES[c] ?? null;
}

// Expects 17 characters. Position 9 has weight 0, so whatever stands there is ignored.
export function checkDigit(vin17: string): string {
  const vin = vin17.toUpperCase();
  if (vin.length !== VIN_LENGTH) throw new RangeError(`VIN must have ${VIN_LENGTH} characters, got ${vin.length}`);
  let sum = 0;
  for (let i = 0; i < VIN_LENGTH; i++) {
    if (i === CHECK_INDEX) continue;
    const value = charValue(vin[i]);
    if (value === null) throw new RangeError(`Invalid VIN character "${vin[i]}" at position ${i + 1}`);
    sum += value * WEIGHTS[i];
  }
  const remainder = sum % 11;
  return remainder === 10 ? "X" : String(remainder);
}

export function hasValidCheckDigit(vin17: string): boolean {
  try {
    return checkDigit(vin17) === vin17[CHECK_INDEX].toUpperCase();
  } catch {
    return false;
  }
}

// Builds a VIN with a correct check digit from "first 8 + any placeholder + last 8". For tests and fixtures.
export function makeVin(template: string): string {
  const vin = template.toUpperCase();
  return vin.slice(0, CHECK_INDEX) + checkDigit(vin) + vin.slice(CHECK_INDEX + 1);
}
