import { describe, expect, it } from "vitest";
import { BODIES } from "../bodies";
import { archR, bodyPath, GROUND, VIEW_H, VIEW_W, wheelCy } from "../geometry";
import { BODY_TYPES, ZONE_IDS, type ZoneId } from "../types";
import { BUMPER_INSET, bodyExtent, carZones, zonePosition } from "../zones";

type P = [number, number];

// The body path as a polygon: lines and cubic curves sampled, arcs converted from endpoint to center form (SVG 1.1,
// appendix F.6.5) and sampled.
function polygon(d: string): P[] {
  const tokens = d.match(/[MLCAZ]|-?(?:\d+\.?\d*|\.\d+)/g) ?? [];
  const pts: P[] = [];
  let i = 0;
  let cur: P = [0, 0];
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === "M" || cmd === "L") {
      cur = [num(), num()];
      pts.push(cur);
    } else if (cmd === "C") {
      const [x1, y1, x2, y2, x, y] = [num(), num(), num(), num(), num(), num()];
      const [x0, y0] = cur;
      for (let k = 1; k <= 12; k++) {
        const t = k / 12;
        const u = 1 - t;
        pts.push([
          u ** 3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x,
          u ** 3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y,
        ]);
      }
      cur = [x, y];
    } else if (cmd === "A") {
      const [rx, , , large, sweep, x, y] = [num(), num(), num(), num(), num(), num(), num()];
      const [x0, y0] = cur;
      const mx = (x0 - x) / 2;
      const my = (y0 - y) / 2;
      const r = Math.max(rx, Math.hypot(mx, my));
      const sign = large === sweep ? -1 : 1;
      const k = sign * Math.sqrt(Math.max(0, (r * r - mx * mx - my * my) / (mx * mx + my * my)));
      const cx = k * my + (x0 + x) / 2;
      const cy = -k * mx + (y0 + y) / 2;
      const a0 = Math.atan2(y0 - cy, x0 - cx);
      let span = Math.atan2(y - cy, x - cx) - a0;
      if (sweep && span < 0) span += Math.PI * 2;
      if (!sweep && span > 0) span -= Math.PI * 2;
      for (let s = 1; s <= 24; s++) pts.push([cx + r * Math.cos(a0 + (span * s) / 24), cy + r * Math.sin(a0 + (span * s) / 24)]);
      cur = [x, y];
    }
  }
  return pts;
}

function inside([x, y]: P, poly: P[]): boolean {
  let hit = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
    const [xa, ya] = poly[a];
    const [xb, yb] = poly[b];
    if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) hit = !hit;
  }
  return hit;
}

const ON_BODY: ZoneId[] = ["front", "hood", "mirror", "door", "charge", "rear"];

describe("carZones", () => {
  it.each(BODY_TYPES)("%s has an anchor for every zone, inside the viewBox with room for the hotspot", (body) => {
    const zones = carZones(body);
    expect(Object.keys(zones).sort()).toEqual([...ZONE_IDS].sort());
    for (const id of ZONE_IDS) {
      const { x, y } = zones[id];
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
      expect(x, `${body}.${id}.x`).toBeGreaterThanOrEqual(14);
      expect(x, `${body}.${id}.x`).toBeLessThanOrEqual(VIEW_W - 14);
      expect(y, `${body}.${id}.y`).toBeGreaterThanOrEqual(14);
      expect(y, `${body}.${id}.y`).toBeLessThanOrEqual(VIEW_H - 14);
    }
  });

  it.each(BODY_TYPES)("%s keeps hotspots apart so they never cover each other", (body) => {
    const zones = Object.entries(carZones(body));
    for (let i = 0; i < zones.length; i++)
      for (let j = i + 1; j < zones.length; j++) {
        const [a, p] = zones[i];
        const [b, q] = zones[j];
        expect(Math.hypot(p.x - q.x, p.y - q.y), `${body}: ${a} ↔ ${b}`).toBeGreaterThanOrEqual(40);
      }
  });

  it.each(BODY_TYPES)("%s puts every body hotspot inside the silhouette, the bumpers well inside", (body) => {
    const g = BODIES[body];
    const z = carZones(body);
    const poly = polygon(bodyPath(g));
    // The polygon itself: the sky, the wheel centers (cut out by the arches) and the floor are outside.
    expect(inside([400, 20], poly) || inside([g.frontX, wheelCy(g)], poly) || inside([400, GROUND - 2], poly)).toBe(false);
    for (const id of ON_BODY) expect(inside([z[id].x, z[id].y], poly), `${body}.${id} inside the body`).toBe(true);
    const { minX, maxX, length } = bodyExtent(g);
    expect(z.front.x - minX, `${body}.front inset`).toBeGreaterThanOrEqual(length * BUMPER_INSET - 0.1);
    expect(maxX - z.rear.x, `${body}.rear inset`).toBeGreaterThanOrEqual(length * BUMPER_INSET - 0.1);
    // The dot (about 17 units across on the stage) stays on the car around the bumper anchors too.
    for (const id of ["front", "rear"] as const)
      for (const [dx, dy] of [[-8, 0], [8, 0], [0, -8], [0, 8]])
        expect(inside([z[id].x + dx, z[id].y + dy], poly), `${body}.${id} dot on the body`).toBe(true);
  });

  it.each(BODY_TYPES)("%s puts the wheel hotspots on the upper tyre, clear of the rim", (body) => {
    const g = BODIES[body];
    const z = carZones(body);
    const cy = wheelCy(g);
    for (const [id, cx] of [["wheel-front", g.frontX], ["wheel-rear", g.rearX]] as const) {
      expect(z[id].x).toBe(cx);
      const above = cy - z[id].y;
      expect(above, `${body}.${id} above the rim`).toBeGreaterThan(g.wheelR * g.rimRatio);
      expect(above, `${body}.${id} within the arch`).toBeLessThan(archR(g));
    }
  });

  it.each(BODY_TYPES)("%s places each anchor on the matching part of that body", (body) => {
    const g = BODIES[body];
    const z = carZones(body);
    expect(z.front.x).toBeLessThan(g.frontX - g.wheelR);
    expect(z.front.x).toBeGreaterThanOrEqual(g.nose[0] - 20);
    expect(z.rear.x).toBeGreaterThan(g.rearX + g.wheelR);
    expect(z.hood.x).toBeGreaterThan(z.front.x);
    expect(z.hood.x).toBeLessThan(z.windshield.x);
    expect(z.roof.y).toBeLessThan(g.belt - 40);
    expect(z.roof.y).toBeGreaterThanOrEqual(g.top - 14);
    expect(z.interior.y).toBeLessThan(g.belt);
    expect(z.mirror.y).toBeLessThan(g.belt + 14);
    expect(z.door.x).toBeGreaterThan(g.frontX + g.wheelR);
    expect(z.door.x).toBeLessThan(g.rearX - g.wheelR);
    expect(z.door.y).toBeGreaterThan(g.belt);
    expect(z.charge.x).toBeGreaterThan(g.frontX);
    expect(z.underbody.y).toBeGreaterThan(g.sillY - 12);
    expect(z.underbody.y).toBeLessThan(GROUND);
  });

  it("gives positions as a share of the illustration box", () => {
    for (const body of BODY_TYPES)
      for (const id of ZONE_IDS) {
        const { left, top } = zonePosition(body, id);
        expect(left).toBeGreaterThan(0);
        expect(left).toBeLessThan(100);
        expect(top).toBeGreaterThan(0);
        expect(top).toBeLessThan(100);
      }
    expect(zonePosition("crossover", "wheel-front").left).toBeCloseTo((BODIES.crossover.frontX / VIEW_W) * 100);
    expect(zonePosition("crossover", "wheel-front").top).toBeCloseTo((carZones("crossover")["wheel-front"].y / VIEW_H) * 100);
  });
});
