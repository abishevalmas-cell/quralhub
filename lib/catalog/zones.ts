// Hotspot zones of the car illustration. This list is a contract shared with components/car/types.ts:
// the stage hotspots, the assortment and the search filters all use exactly these ids.
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

export const isZoneId = (value: unknown): value is ZoneId =>
  typeof value === "string" && (ZONE_IDS as readonly string[]).includes(value);
