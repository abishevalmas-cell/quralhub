import type { Tone } from "@/components/ui/badge";
import type { DecodeStatus, FitmentLevel, VehicleCandidate } from "@/lib/db/schema";
import type { ProviderStatus } from "@/lib/providers/types";
import { brandModel } from "@/lib/utils";

// Pure display helpers for garage pages; safe to use in server and client components.

type VehicleLike = {
  label: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  decodeStatus: DecodeStatus;
  candidates: VehicleCandidate[];
  selectedCandidateId: string | null;
};

export function trimChosen(vehicle: Pick<VehicleLike, "decodeStatus" | "candidates" | "selectedCandidateId">): boolean {
  return (
    vehicle.decodeStatus === "ambiguous" &&
    Boolean(vehicle.selectedCandidateId) &&
    vehicle.candidates.some((c) => c.id === vehicle.selectedCandidateId)
  );
}

export function decodeBadge(vehicle: Pick<VehicleLike, "decodeStatus" | "candidates" | "selectedCandidateId">): { label: string; tone: Tone } {
  switch (vehicle.decodeStatus) {
    case "decoded":
      return { label: "Расшифрован", tone: "ok" };
    case "ambiguous":
      return trimChosen(vehicle) ? { label: "Расшифрован", tone: "ok" } : { label: "Уточните комплектацию", tone: "warn" };
    case "unsupported":
      return { label: "Нет каталога", tone: "hand" };
    case "manual":
      return { label: "Без VIN", tone: "neutral" };
    default:
      return { label: "Ошибка, повторите", tone: "bad" };
  }
}

export const vehicleName = (vehicle: Pick<VehicleLike, "brand" | "model">) => brandModel(vehicle.brand, vehicle.model);

export const vehicleTitle = (vehicle: Pick<VehicleLike, "label" | "brand" | "model" | "vin">) =>
  vehicle.label || vehicleName(vehicle) || (vehicle.vin ? "Машина по VIN" : "Машина");

// 17VIN sends build dates as YYYYMM or YYYYMMDD.
export function formatBuildDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  const month = Number(digits.slice(4, 6));
  if (month < 1 || month > 12) return value;
  if (digits.length === 8) return `${digits.slice(6, 8)}.${digits.slice(4, 6)}.${digits.slice(0, 4)}`;
  if (digits.length === 6) return `${digits.slice(4, 6)}.${digits.slice(0, 4)}`;
  return value;
}

export const FITMENT_LABEL: Record<Exclude<FitmentLevel, "manual">, { label: string; tone: Tone }> = {
  vin_confirmed: { label: "Подходит по VIN", tone: "ok" },
  needs_check: { label: "Нужна проверка", tone: "warn" },
};

// Provider messages are written for the team (vendor names, error codes, account problems); customers get plain copy.
// The raw message stays in the admin journal.
export function catalogFailureText(status: ProviderStatus, scope: "catalog" | "group"): string {
  switch (status) {
    case "empty":
      return scope === "catalog" ? "В каталоге для этого VIN пока нет деталей" : "В этой группе каталога нет деталей для вашего VIN";
    case "unsupported":
      return "Для этой марки каталога по VIN нет";
    default:
      return "Каталог сейчас недоступен";
  }
}
