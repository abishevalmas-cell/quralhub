import type { CategoryLevel } from "./types";

// Input checks shared by providers and the gateway, so a bad request never reaches a paid API.

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;
const EPC_RE = /^[a-zA-Z0-9_-]{1,60}$/;
const OE_RE = /^[A-Z0-9][A-Z0-9 ._/-]{0,79}$/;
const MAX_CODE = 160;

export const VIN_HINT = "VIN должен содержать 17 символов: латинские буквы без I, O, Q и цифры";
export const OE_HINT = "Проверьте номер OE: латинские буквы, цифры, пробел, дефис, точка или слеш";

export function normalizeVinInput(input: string): string | null {
  const vin = String(input ?? "")
    .replace(/[\s-]/g, "")
    .toUpperCase();
  return VIN_RE.test(vin) ? vin : null;
}

export function isValidEpc(epc: unknown): epc is string {
  return typeof epc === "string" && EPC_RE.test(epc);
}

export function isValidLevel(level: unknown): level is CategoryLevel {
  return level === 1 || level === 2 || level === 3;
}

export function normalizeCode(code: unknown): string | null {
  if (typeof code !== "string") return null;
  const value = code.trim();
  // Control characters have no place in a catalog code and would end up in the signed URL.
  // A lone surrogate makes encodeURIComponent throw, which would turn into a failed paid call.
  return value && value.length <= MAX_CODE && value.isWellFormed() && !/[\u0000-\u001f\u007f]/.test(value)
    ? value
    : null;
}

// OE numbers are uppercase in Chinese catalogs; one spelling keeps cache keys and paid lookups from doubling.
export function normalizeOeInput(input: string): string | null {
  const oe = String(input ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
  return OE_RE.test(oe) ? oe : null;
}

// OE numbers are written with and without dashes or dots ("14921518-00" vs "1492151800").
export function normalizeOe(oe: string): string {
  return String(oe ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function maskVin(vin: string): string {
  return vin.length >= 8 ? vin.slice(0, 3) + "…" + vin.slice(-4) : "…";
}

// Journal inputs are free text (catalog codes, OE numbers). People paste a VIN into the OE field,
// so every VIN-shaped token is masked before it reaches provider_calls.
export function maskVinsIn(value: string): string {
  return value.replace(/[A-Za-z0-9]+/g, (run) => {
    const upper = run.toUpperCase();
    return VIN_RE.test(upper) ? maskVin(upper) : run;
  });
}

// An OE search input that is a VIN once separators are removed ("LGX TXSP2 4PATX0001") is masked as a whole.
export function maskOeInput(oe: string): string {
  const compact = normalizeOe(oe);
  return VIN_RE.test(compact) ? maskVin(compact) : maskVinsIn(oe);
}
