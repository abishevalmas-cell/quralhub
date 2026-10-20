import type { BodyType } from "@/components/car";
import type { Tone } from "@/components/ui/badge";
import { carColorById } from "@/components/car/colors";
import { carSubject, paintHex, type StageSubject } from "@/components/models/subject";
import type { ProviderStatus } from "@/lib/providers/types";
import type { CarRef } from "@/lib/services/requests";
import { catalogMode } from "@/lib/services/search";
import { vehicleBrandStatus, vehicleCatalogModel, vehicleColor, type Vehicle } from "@/lib/services/vehicles";
import { maskVin } from "@/lib/utils";
import { decodeBadge, trimChosen, vehicleName, vehicleTitle } from "./labels";

// Garage rows turned into what the garage pages draw. Server-side: the full row stays on the server, a card gets
// the VIN masked (the garage list is a screen people show to others).

export type GarageCard = {
  id: string;
  title: string;
  details: string;
  maskedVin: string | null;
  /** False until the owner picks the paint of the picture. */
  colorChosen: boolean;
  badge: { label: string; tone: Tone };
  subject: StageSubject;
};

/** The stage subject of a garage car; `level1` is what its first catalog page answered, when known. */
export function vehicleSubject(vehicle: Vehicle, level1: ProviderStatus | null = null): StageSubject {
  const name = vehicleName(vehicle);
  return carSubject({
    id: vehicle.id,
    title: vehicleTitle(vehicle),
    label: vehicle.label?.trim() || null,
    name,
    year: vehicle.year,
    trim: vehicle.trim,
    modelId: vehicleCatalogModel(vehicle)?.id ?? null,
    color: vehicleColor(vehicle),
    hasVin: Boolean(vehicle.vin),
    trimPending: vehicle.decodeStatus === "ambiguous" && !trimChosen(vehicle),
    brandStatus: vehicleBrandStatus(vehicle),
    catalog: catalogMode(vehicle, level1),
  });
}

export function garageCard(vehicle: Vehicle): GarageCard {
  const name = vehicleName(vehicle);
  return {
    id: vehicle.id,
    title: vehicleTitle(vehicle),
    // The paint the owner chose tells two cars of the same model apart; a car without one says so.
    details: [vehicle.label ? name : null, vehicle.year ? `${vehicle.year} г.` : null, vehicle.trim, carColorById(vehicleColor(vehicle))?.label]
      .filter(Boolean)
      .join(" · "),
    colorChosen: Boolean(vehicleColor(vehicle)),
    maskedVin: vehicle.vin ? maskVin(vehicle.vin) : null,
    badge: decodeBadge(vehicle),
    subject: vehicleSubject(vehicle),
  };
}

export type CarLook = { body: BodyType; color: string };

/**
 * The picture of a customer's car on request and order pages: its catalog model's body in the paint the owner chose,
 * or a neutral crossover in the default paint for a car that is not in the catalog. Null without a car.
 */
export function carLook(car: CarRef | null | undefined): CarLook | null {
  if (!car) return null;
  const model = vehicleCatalogModel(car);
  return { body: model?.body ?? "crossover", color: paintHex(car.color, model) };
}
