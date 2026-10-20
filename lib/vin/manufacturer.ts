import { normalizeVin } from "./normalize";
import { WMI_TABLE, type WmiConfidence } from "./wmi";

export type VinRegion = "China" | "other";

export interface WmiInfo {
  wmi: string;
  region: VinRegion;
  maker: string | null;
  brands: string[];
  confidence: WmiConfidence | "unknown";
  note?: string;
}

// ISO 3779 assigns L and H to mainland China.
export function vinRegion(input: string | null | undefined): VinRegion {
  const first = normalizeVin(input)[0];
  return first === "L" || first === "H" ? "China" : "other";
}

// Works on a partial VIN too, so the form can show the brand while the customer is still typing.
export function wmiInfo(input: string | null | undefined): WmiInfo {
  const vin = normalizeVin(input);
  const wmi = vin.slice(0, 3);
  const region = vinRegion(vin);
  const entry = wmi.length === 3 && Object.hasOwn(WMI_TABLE, wmi) ? WMI_TABLE[wmi] : undefined;
  if (!entry) return { wmi, region, maker: null, brands: [], confidence: "unknown" };
  return {
    wmi,
    region,
    maker: entry.maker,
    brands: [...entry.brands],
    confidence: entry.confidence,
    ...(entry.note ? { note: entry.note } : {}),
  };
}
