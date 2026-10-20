import type { RimStyle } from "./geometry";

// A wheel seen exactly from the side: tyre, alloy rim with real openings, the brake disc and caliper behind it.
// Road cars get alloy designs; off-roaders and pickups a six-spoke rim with a bolted outer ring and block tread.

type RimSpec = {
  /** Spoke center angles in degrees, 0 = up, clockwise. */
  spokes: number[];
  /** Spoke width, inner and outer radius of the openings — all as a share of the rim radius. */
  width: number;
  inner: number;
  outer: number;
  /** Inner radius of the narrow openings inside a twin spoke. */
  narrowInner?: number;
  /** Turns the outer edge of each opening, for turbine blades. */
  twist?: number;
};

const ring = (n: number, step = 360 / n, shift = 0) => Array.from({ length: n }, (_, i) => shift + i * step);
const pairs = (n: number, half: number) => ring(n).flatMap((a) => [a - half, a + half]);

const RIMS: Record<RimStyle, RimSpec> = {
  split: { spokes: pairs(5, 8.5), width: 0.1, inner: 0.34, outer: 0.88, narrowInner: 0.56 },
  multi: { spokes: ring(10), width: 0.075, inner: 0.33, outer: 0.9 },
  turbine: { spokes: ring(7), width: 0.11, inner: 0.34, outer: 0.88, twist: 17 },
  aero: { spokes: ring(5, 72, 36), width: 0.36, inner: 0.42, outer: 0.82 },
  chunky: { spokes: ring(6), width: 0.2, inner: 0.37, outer: 0.84 },
  star: { spokes: pairs(6, 7), width: 0.08, inner: 0.34, outer: 0.88, narrowInner: 0.6 },
  beadlock: { spokes: ring(6), width: 0.24, inner: 0.36, outer: 0.74 },
};

const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
const polar = (r: number, deg: number): [number, number] => [r * Math.cos(rad(deg)), r * Math.sin(rad(deg))];
const f = (n: number) => Math.round(n * 100) / 100;
const pt = ([x, y]: [number, number]) => `${f(x)} ${f(y)}`;

/** One opening between two spokes, in rim-local coordinates (center 0, 0). */
function opening(a1: number, a2: number, w: number, inner: number, outer: number, twist: number): string {
  const dOut = (Math.asin(Math.min(0.99, w / 2 / outer)) * 180) / Math.PI;
  const dIn = (Math.asin(Math.min(0.99, w / 2 / inner)) * 180) / Math.PI;
  const o1 = polar(outer, a1 + dOut + twist);
  const o2 = polar(outer, a2 - dOut + twist);
  const i2 = polar(inner, a2 - dIn);
  const i1 = polar(inner, a1 + dIn);
  return `M ${pt(o1)} A ${f(outer)} ${f(outer)} 0 0 1 ${pt(o2)} L ${pt(i2)} A ${f(inner)} ${f(inner)} 0 0 0 ${pt(i1)} Z`;
}

/** The rim face: a full disc with the openings cut out (even-odd fill). */
export function rimFacePath(style: RimStyle, rr: number): string {
  const spec = RIMS[style];
  const angles = [...spec.spokes].sort((a, b) => a - b);
  const parts = [`M ${f(-rr)} 0 A ${f(rr)} ${f(rr)} 0 1 0 ${f(rr)} 0 A ${f(rr)} ${f(rr)} 0 1 0 ${f(-rr)} 0 Z`];
  angles.forEach((a1, i) => {
    const a2 = i + 1 < angles.length ? angles[i + 1] : angles[0] + 360;
    const narrow = a2 - a1 < 24 && spec.narrowInner != null;
    const inner = (narrow ? spec.narrowInner! : spec.inner) * rr;
    parts.push(opening(a1, a2, spec.width * rr, inner, spec.outer * rr, spec.twist ?? 0));
  });
  return parts.join(" ");
}

function arc(r: number, from: number, to: number) {
  const [x1, y1] = polar(r, from);
  const [x2, y2] = polar(r, to);
  return `M ${f(x1)} ${f(y1)} A ${f(r)} ${f(r)} 0 ${to - from > 180 ? 1 : 0} 1 ${f(x2)} ${f(y2)}`;
}

export function WheelDefs({ id }: { id: string }) {
  return (
    <>
      <radialGradient id={`${id}-tyre`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0.6" stopColor="#30373c" />
        <stop offset="0.72" stopColor="#1d2226" />
        <stop offset="0.93" style={{ stopColor: "var(--car-tyre, #121518)" }} />
        <stop offset="1" style={{ stopColor: "var(--car-tyre-edge, #0b0d0f)" }} />
      </radialGradient>
      <linearGradient id={`${id}-silver`} x1="0.15" y1="0" x2="0.85" y2="1">
        <stop offset="0" stopColor="#fbfcfc" />
        <stop offset="0.42" stopColor="#d3d8dc" />
        <stop offset="0.7" stopColor="#a9b1b7" />
        <stop offset="1" stopColor="#7b848b" />
      </linearGradient>
      <linearGradient id={`${id}-graphite`} x1="0.15" y1="0" x2="0.85" y2="1">
        <stop offset="0" stopColor="#8a949b" />
        <stop offset="0.45" stopColor="#535c63" />
        <stop offset="1" stopColor="#2a3136" />
      </linearGradient>
      <radialGradient id={`${id}-disc`} cx="0.42" cy="0.38" r="0.62">
        <stop offset="0" stopColor="#a3abb1" />
        <stop offset="0.7" stopColor="#6c757c" />
        <stop offset="1" stopColor="#40474d" />
      </radialGradient>
      <radialGradient id={`${id}-contact`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#000" stopOpacity="0.55" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${id}-caliper`} x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stopColor="#5b656d" />
        <stop offset="0.55" stopColor="#3a434a" />
        <stop offset="1" stopColor="#262d32" />
      </linearGradient>
    </>
  );
}

export function Wheel({
  id,
  cx,
  cy,
  r,
  rimRatio,
  style,
  face,
  tread,
}: {
  id: string;
  cx: number;
  cy: number;
  r: number;
  rimRatio: number;
  style: RimStyle;
  face: "silver" | "graphite";
  tread?: boolean;
}) {
  const rr = r * rimRatio;
  const lugs = ring(style === "beadlock" ? 6 : 5, style === "beadlock" ? 60 : 72, 18).map((a) => polar(rr * 0.26, a));
  const bolts = style === "beadlock" ? ring(18).map((a) => polar(rr * 0.87, a)) : [];
  const blockLen = (radius: number, n: number) => f((Math.PI * 2 * radius) / n / 2);
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r={r} fill={`url(#${id}-tyre)`} />
      {tread ? (
        // All-terrain tread: blocks on the tyre shoulder notch its outline.
        <circle r={r - 2.4} fill="none" stroke="#2e353a" strokeWidth="4.8" strokeDasharray={`${blockLen(r - 2.4, 34)} ${blockLen(r - 2.4, 34)}`} />
      ) : null}
      {/* The tyre's rounded edge: keeps the wheel off a dark floor without looking outlined on a light one. */}
      <circle r={r - 0.6} fill="none" stroke="#6b767d" strokeOpacity="0.35" strokeWidth="1.2" />
      <path d={arc(r - 3.5, 292, 352)} fill="none" stroke="#ffffff" strokeOpacity="0.09" strokeWidth="3" strokeLinecap="round" />
      <circle r={rr + 1.6} fill="#0d1013" />
      <circle r={rr * 0.97} fill="#161b1f" />
      <circle r={rr * 0.8} fill={`url(#${id}-disc)`} />
      <circle r={rr * 0.8} fill="none" stroke="#2c3338" strokeWidth={rr * 0.035} strokeDasharray={`${f(rr * 0.05)} ${f(rr * 0.07)}`} opacity="0.5" />
      <circle r={rr * 0.38} fill="#3c4449" />
      {/* The brake caliper behind the spokes: plain graphite, as on the cars people actually drive. */}
      <path d={arc(rr * 0.64, 52, 104)} fill="none" stroke={`url(#${id}-caliper)`} strokeWidth={rr * 0.25} strokeLinecap="round" />
      <path d={arc(rr * 0.7, 58, 98)} fill="none" stroke="#8b959c" strokeOpacity="0.5" strokeWidth={rr * 0.035} strokeLinecap="round" />
      <path
        d={rimFacePath(style, rr)}
        fill={`url(#${id}-${face})`}
        fillRule="evenodd"
        stroke="#262d32"
        strokeOpacity="0.55"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <circle r={rr} fill="none" stroke={face === "silver" ? "#eef1f3" : "#7d878e"} strokeOpacity="0.8" strokeWidth="1.2" />
      <circle r={rr * 0.94} fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="1" />
      {bolts.length ? <circle r={rr * 0.87} fill="none" stroke="#1e2428" strokeOpacity="0.35" strokeWidth={rr * 0.13} /> : null}
      {bolts.map(([x, y], i) => (
        <circle key={`b${i}`} cx={f(x)} cy={f(y)} r={f(rr * 0.03)} fill={face === "silver" ? "#e9edf0" : "#a3adb4"} />
      ))}
      {lugs.map(([x, y], i) => (
        <circle key={i} cx={f(x)} cy={f(y)} r={f(rr * 0.035)} fill="#59626a" />
      ))}
      <circle r={rr * 0.17} fill="#272e33" stroke={face === "silver" ? "#c9cfd3" : "#8a949b"} strokeWidth="1" />
      <circle r={rr * 0.07} fill="#8d969c" />
    </g>
  );
}
