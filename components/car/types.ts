// Shared vocabulary of the car illustrations and the parts assortment. The zone ids are a contract:
// the stage hotspots, the assortment groups and the search filters all use exactly these strings.

export const BODY_TYPES = ["crossover", "suv", "offroad", "sedan", "liftback", "hatchback", "minivan", "pickup"] as const;
export type BodyType = (typeof BODY_TYPES)[number];

export const ZONE_IDS = [
  "front",
  "hood",
  "windshield",
  "mirror",
  "door",
  "wheel-front",
  "wheel-rear",
  "rear",
  "roof",
  "charge",
  "interior",
  "underbody",
] as const;
export type ZoneId = (typeof ZONE_IDS)[number];

export const POWERTRAINS = ["ice", "hev", "phev", "erev", "bev"] as const;
export type Powertrain = (typeof POWERTRAINS)[number];

/** A plug-in car has a charge port; a car that only burns fuel has a fuel flap in the same place. */
export const hasChargePort = (powertrain: Powertrain | null | undefined) =>
  powertrain === "phev" || powertrain === "erev" || powertrain === "bev";

/** Only a car known to have an engine gets an exhaust under the rear bumper. */
export const hasExhaust = (powertrain: Powertrain | null | undefined) => powertrain != null && powertrain !== "bev";

export const BODY_LABELS: Record<BodyType, string> = {
  crossover: "Кроссовер",
  suv: "Большой SUV",
  offroad: "Внедорожник",
  sedan: "Седан",
  liftback: "Лифтбек",
  hatchback: "Хэтчбек",
  minivan: "Минивэн",
  pickup: "Пикап",
};

export const ZONE_LABELS: Record<ZoneId, string> = {
  front: "Передний бампер и фары",
  hood: "Капот",
  windshield: "Лобовое стекло",
  mirror: "Зеркала и камеры",
  door: "Двери",
  "wheel-front": "Передние тормоза и подвеска",
  "wheel-rear": "Задние тормоза и подвеска",
  rear: "Задние фонари и бампер",
  roof: "Крыша",
  charge: "Лючок бака или зарядки",
  interior: "Салон",
  underbody: "Днище",
};

/**
 * Labels that depend on the powertrain: a fuel flap instead of a charge port, the battery instead of the exhaust.
 * An unknown powertrain keeps the neutral labels; nothing is assumed.
 */
export function zoneLabelsFor(powertrain: Powertrain | null | undefined): Record<ZoneId, string> {
  if (!powertrain) return { ...ZONE_LABELS };
  return {
    ...ZONE_LABELS,
    charge: hasChargePort(powertrain) ? "Зарядный порт" : "Лючок бензобака",
    underbody: powertrain === "bev" ? "Днище и батарея" : hasChargePort(powertrain) ? "Днище, батарея и выхлоп" : "Днище и выхлоп",
  };
}
