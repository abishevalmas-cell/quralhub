import { BODIES } from "./bodies";
import { pathBounds, VIEW_H, VIEW_W, wheelCy, type BodyGeometry, type Pt } from "./geometry";
import { ZONE_IDS, type BodyType, type ZoneId } from "./types";

export type ZoneAnchor = { x: number; y: number };

/** How far inside the body's front and rear ends the bumper hotspots sit, as a share of the car's length. */
export const BUMPER_INSET = 0.04;

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Front-most and rear-most x of a body's silhouette. */
export function bodyExtent(g: BodyGeometry): { minX: number; maxX: number; length: number } {
  const box = pathBounds(`M ${g.nose[0]} ${g.nose[1]} ${g.outline}`);
  return { minX: box.x, maxX: box.x + box.w, length: box.w };
}

// The hand-placed anchors of a body with two rules on top: a wheel hotspot sits on the upper tyre, between the rim
// and the arch, so the rim stays visible; a bumper hotspot sits well inside the silhouette, never half off the car.
function anchors(g: BodyGeometry): Record<ZoneId, Pt> {
  const { minX, maxX, length } = bodyExtent(g);
  const inset = length * BUMPER_INSET;
  const tyreTop = r1(wheelCy(g) - (g.wheelR * (1 + g.rimRatio)) / 2 - 1);
  return {
    ...g.zones,
    front: [r1(Math.max(g.zones.front[0], minX + inset)), g.zones.front[1]],
    rear: [r1(Math.min(g.zones.rear[0], maxX - inset)), g.zones.rear[1]],
    "wheel-front": [g.frontX, tyreTop],
    "wheel-rear": [g.rearX, tyreTop],
  };
}

const ANCHORS = Object.fromEntries(Object.entries(BODIES).map(([body, g]) => [body, anchors(g)])) as Record<BodyType, Record<ZoneId, Pt>>;

/** Hotspot anchors of one body type in viewBox units (0 0 800 320), each on the matching part of that body. */
export function carZones(body: BodyType): Record<ZoneId, ZoneAnchor> {
  const zones = ANCHORS[body];
  return Object.fromEntries(ZONE_IDS.map((id) => [id, { x: zones[id][0], y: zones[id][1] }])) as Record<ZoneId, ZoneAnchor>;
}

/** The same anchor as a share of the illustration box, for absolutely positioned hotspots. */
export function zonePosition(body: BodyType, zone: ZoneId): { left: number; top: number } {
  const [x, y] = ANCHORS[body][zone];
  return { left: (x / VIEW_W) * 100, top: (y / VIEW_H) * 100 };
}
