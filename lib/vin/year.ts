import { VIN_LENGTH, normalizeVin } from "./normalize";

// Position 10 codes in order: A = 1980 … Y = 2000, 1 = 2001 … 9 = 2009, then the 30-year cycle repeats.
const YEAR_CODES = "ABCDEFGHJKLMNPRSTVWXY123456789";
const FIRST_YEAR = 1980;
const CYCLE = YEAR_CODES.length;

export function isModelYearCode(c: string): boolean {
  return c.length === 1 && YEAR_CODES.includes(c.toUpperCase());
}

// The same code means 2010 or 1980; take the latest year that is not more than one year ahead,
// because cars are sold as next model year from about the middle of the current year.
// The year is taken in UTC so the result does not depend on the server's time zone.
export function modelYear(input: string | null | undefined, now: Date = new Date()): number | null {
  const vin = normalizeVin(input);
  if (vin.length !== VIN_LENGTH) return null;
  const index = YEAR_CODES.indexOf(vin[9]);
  if (index < 0) return null;
  const latestAllowed = now.getUTCFullYear() + 1;
  const base = FIRST_YEAR + index;
  if (!Number.isFinite(latestAllowed) || base > latestAllowed) return null;
  return base + Math.floor((latestAllowed - base) / CYCLE) * CYCLE;
}
