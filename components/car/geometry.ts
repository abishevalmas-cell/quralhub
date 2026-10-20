import type { ZoneId } from "./types";

// All car art lives in one coordinate system: viewBox 0 0 800 320, car facing left, tyres standing on GROUND.
export const VIEW_W = 800;
export const VIEW_H = 320;
export const GROUND = 284;

export type Pt = readonly [number, number];

export type RimStyle = "split" | "multi" | "turbine" | "aero" | "chunky" | "star" | "beadlock";

/** A decorative path: black plastic trim, a chrome strip, or a light character line on the paint. */
export type Detail = { d: string; kind: "trim" | "chrome" | "crease" };

export type BodyGeometry = {
  /** Tyre radius and wheel centers (x); the centers sit at GROUND - wheelR. */
  wheelR: number;
  frontX: number;
  rearX: number;
  /** Rim radius as a share of the tyre radius: 0.7 on road cars, 0.6 on all-terrain tyres. */
  rimRatio: number;
  rim: RimStyle;
  /** Rim face: bright machined alloy or dark gunmetal. */
  rimFace: "silver" | "graphite";
  /** Gap between tyre and wheel arch; `archLift` raises the arch center for off-road clearance. */
  archGap: number;
  archLift?: number;
  /** The silhouette above the arches: from the lower front corner over the roof to the lower rear corner. */
  nose: Pt;
  outline: string;
  tail: Pt;
  /** Rocker bottom between the arches. */
  sillY: number;
  /** Highest painted point and the shoulder height in the middle of the car (for the paint gradient). */
  top: number;
  belt: number;
  /** Side windows, drawn as dark glass. */
  glass: string[];
  /** Blacked-out pillars drawn over the glass. */
  pillars?: string[];
  /** Window surround: black rubber or chrome. */
  dloTrim?: { d: string; kind: "black" | "chrome" };
  /** Headrests seen through the side glass. */
  seats?: Pt[];
  /** The crisp shoulder crease that catches the light. */
  shoulder: string;
  /** Door shut lines and other seams. */
  seams: string;
  /** Flush door handles: left end and length. */
  handles: readonly (readonly [number, number, number])[];
  mirror: string;
  headlight: string;
  drl: string;
  /** Dark grille slot at the nose (left out on a closed electric nose) and the lower bumper intake. */
  grille?: string;
  intake?: string;
  taillight: string;
  tailLine: string;
  /** Black plastic: height of the lower body band and width of the arch flares (0 = painted). */
  cladding: number;
  flare: number;
  /** Fuel or charge flap. */
  flap: { x: number; y: number; w: number; h: number };
  details?: readonly Detail[];
  roofRails?: string;
  /** Spare wheel on the tailgate, seen edge-on. */
  spare?: { x: number; y: number; w: number; h: number };
  /** All-terrain tread blocks on the tyre shoulders. */
  tread?: boolean;
  fin?: Pt;
  exhaust?: Pt;
  /** Anchor points of the hotspots, in viewBox units, placed on the matching part of this body. */
  zones: Record<ZoneId, Pt>;
};

export const wheelCy = (g: BodyGeometry) => GROUND - g.wheelR;
export const archR = (g: BodyGeometry) => g.wheelR + g.archGap;
export const archCy = (g: BodyGeometry) => wheelCy(g) - (g.archLift ?? 0);

const f = (n: number) => Math.round(n * 10) / 10;

/** The x coordinates where a circle crosses the horizontal line y (left, right); null when it does not. */
export function circleAtY(cx: number, cy: number, r: number, y: number): [number, number] | null {
  const dy = y - cy;
  if (Math.abs(dy) >= r) return null;
  const dx = Math.sqrt(r * r - dy * dy);
  return [cx - dx, cx + dx];
}

/** An arc over the top of a circle from (x1, y1) on the right to (x2, y2) on the left, as SVG "A" command. */
function arcOverTop(cx: number, cy: number, r: number, from: Pt, to: Pt): string {
  const a1 = Math.atan2(from[1] - cy, from[0] - cx);
  const a2 = Math.atan2(to[1] - cy, to[0] - cx);
  let span = a1 - a2;
  while (span < 0) span += Math.PI * 2;
  const large = span > Math.PI ? 1 : 0;
  return `A ${f(r)} ${f(r)} 0 ${large} 0 ${f(to[0])} ${f(to[1])}`;
}

/** An opening of radius r around a wheel, cut from the line yRight (behind) to yLeft (in front). */
export function archPoints(g: BodyGeometry, cx: number, r: number, yLeft: number, yRight: number): { left: Pt; right: Pt } {
  const cy = archCy(g);
  const l = circleAtY(cx, cy, r, yLeft);
  const rr = circleAtY(cx, cy, r, yRight);
  return {
    left: [l ? l[0] : cx - r, l ? yLeft : cy],
    right: [rr ? rr[1] : cx + r, rr ? yRight : cy],
  };
}

export function archArc(g: BodyGeometry, cx: number, r: number, yLeft: number, yRight: number): { start: Pt; d: string } {
  const { left, right } = archPoints(g, cx, r, yLeft, yRight);
  return { start: right, d: arcOverTop(cx, archCy(g), r, right, left) };
}

/** The whole painted body: outline over the roof, then back along the bottom around both arches. */
export function bodyPath(g: BodyGeometry): string {
  const r = archR(g);
  const rear = archArc(g, g.rearX, r, g.sillY, g.tail[1]);
  const front = archArc(g, g.frontX, r, g.nose[1], g.sillY);
  return [
    `M ${g.nose[0]} ${g.nose[1]}`,
    g.outline,
    `L ${f(rear.start[0])} ${f(rear.start[1])}`,
    rear.d,
    `L ${f(front.start[0])} ${f(front.start[1])}`,
    front.d,
    "Z",
  ].join(" ");
}

/** The dark wheel well behind a tyre: the arch opening closed by its chord. */
export function wellPath(g: BodyGeometry, cx: number, yLeft: number, yRight: number): string {
  const a = archArc(g, cx, archR(g), yLeft, yRight);
  return `M ${f(a.start[0])} ${f(a.start[1])} ${a.d} Z`;
}

/** An open arc around a wheel at radius r (for arch flares and fender lip shading). */
export function archStroke(g: BodyGeometry, cx: number, r: number, yLeft: number, yRight: number): string {
  const a = archArc(g, cx, r, yLeft, yRight);
  return `M ${f(a.start[0])} ${f(a.start[1])} ${a.d}`;
}

/**
 * Moves every coordinate of an absolute SVG path by (dx, dy). Handles M, L, C, A and Z, the only commands the bodies
 * use; an arc keeps its radii and flags and moves only its end point.
 */
export function shiftPath(d: string, dx: number, dy: number): string {
  const out: string[] = [];
  let command = "";
  let index = 0;
  for (const token of d.match(/[MLCAZ]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []) {
    if (/^[MLCAZ]$/i.test(token)) {
      command = token.toUpperCase();
      index = 0;
      out.push(command);
      continue;
    }
    const n = Number(token);
    let value = n;
    if (command === "A") {
      const slot = index % 7;
      if (slot === 5) value = n + dx;
      if (slot === 6) value = n + dy;
    } else value = n + (index % 2 === 0 ? dx : dy);
    index++;
    out.push(String(f(value)));
  }
  return out.join(" ");
}

/** Bounding box of an absolute path's points (control points included, which is enough for clipping). */
export function pathBounds(d: string): { x: number; y: number; w: number; h: number } {
  const nums = (d.match(/-?(?:\d+\.?\d*|\.\d+)/g) ?? []).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

const shiftPt = (p: Pt, dy: number): Pt => [p[0], f(p[1] + dy)];

/**
 * The same body on bigger wheels and higher off the ground: tyres of radius `wheelR` still stand on GROUND, the
 * whole body (and every hotspot) moves up by `lift`. Off-roaders and big SUVs use it, so they do not look
 * under-wheeled next to a sedan.
 */
export function raise(g: BodyGeometry, lift: number, wheelR = g.wheelR): BodyGeometry {
  const dy = -lift;
  const path = (d: string) => shiftPath(d, 0, dy);
  // The outline continues from `nose` without its own "M": shift it as part of a path and drop the "M" again.
  const outline = shiftPath(`M ${g.nose[0]} ${g.nose[1]} ${g.outline}`, 0, dy).replace(/^M \S+ \S+ /, "");
  return {
    ...g,
    wheelR,
    nose: shiftPt(g.nose, dy),
    outline,
    tail: shiftPt(g.tail, dy),
    sillY: f(g.sillY + dy),
    top: f(g.top + dy),
    belt: f(g.belt + dy),
    glass: g.glass.map(path),
    pillars: g.pillars?.map(path),
    dloTrim: g.dloTrim ? { ...g.dloTrim, d: path(g.dloTrim.d) } : undefined,
    seats: g.seats?.map((p) => shiftPt(p, dy)),
    shoulder: path(g.shoulder),
    seams: path(g.seams),
    handles: g.handles.map(([x, y, w]) => [x, f(y + dy), w] as const),
    mirror: path(g.mirror),
    headlight: path(g.headlight),
    drl: path(g.drl),
    taillight: path(g.taillight),
    tailLine: path(g.tailLine),
    grille: g.grille ? path(g.grille) : undefined,
    intake: g.intake ? path(g.intake) : undefined,
    flap: { ...g.flap, y: f(g.flap.y + dy) },
    details: g.details?.map((detail) => ({ ...detail, d: path(detail.d) })),
    roofRails: g.roofRails ? path(g.roofRails) : undefined,
    spare: g.spare ? { ...g.spare, y: f(g.spare.y + dy) } : undefined,
    fin: g.fin ? shiftPt(g.fin, dy) : undefined,
    exhaust: g.exhaust ? shiftPt(g.exhaust, dy) : undefined,
    zones: Object.fromEntries(Object.entries(g.zones).map(([zone, p]) => [zone, shiftPt(p, dy)])) as Record<ZoneId, Pt>,
  };
}
