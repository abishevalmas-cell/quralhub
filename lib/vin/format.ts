import { wmiInfo } from "./manufacturer";
import { normalizeVin } from "./normalize";
import { modelYear } from "./year";

const SAFE_CHAR = /^[A-Z0-9]$/;

// Masked values go to logs, so anything outside the VIN alphabet is replaced instead of copied.
const safe = (chars: string[]) => chars.map((c) => (SAFE_CHAR.test(c) ? c : "*")).join("");

// VINs are personal data: logs and provider_calls keep only the WMI and the last four characters.
export function maskVin(input: string | null | undefined): string {
  const chars = [...normalizeVin(input)];
  if (!chars.length) return "—";
  if (chars.length < 8) return "…";
  return `${safe(chars.slice(0, 3))}…${safe(chars.slice(-4))}`;
}

// A preliminary label from the WMI and position 10, e.g. "BYD · 2024 модельный год". The real model comes from decoding.
export function vinSummary(input: string | null | undefined, now: Date = new Date()): string {
  const info = wmiInfo(input);
  const year = modelYear(input, now);
  const maker =
    info.brands.length === 1
      ? info.brands[0]
      : (info.maker ?? (info.region === "China" && info.wmi.length === 3 ? "Китайский производитель" : null));
  const parts = [maker, year ? `${year} модельный год` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Марка и год не определены";
}
