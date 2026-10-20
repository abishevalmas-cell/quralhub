import { useId } from "react";
import { cn } from "@/lib/utils";
import { BODIES } from "./bodies";
import { luminance, mix, paintShades } from "./colors";
import {
  archR,
  archStroke,
  bodyPath,
  GROUND,
  pathBounds,
  VIEW_H,
  VIEW_W,
  wellPath,
  wheelCy,
  type BodyGeometry,
} from "./geometry";
import { BODY_LABELS, hasChargePort, hasExhaust, type BodyType, type Powertrain } from "./types";
import { Wheel, WheelDefs } from "./wheel";

// Hand-drawn side profile of a car, facing left. Server-safe: no state, no effects, ids from useId so that
// many cars on one page never share gradients.

export type CarIllustrationProps = {
  body: BodyType;
  /** Paint color as hex; an unreadable value falls back to silver. */
  color: string;
  className?: string;
  /** Accessible name; defaults to the body type. */
  title?: string;
  /** Decides between a fuel flap and a charge port, and whether there is an exhaust. */
  powertrain?: Powertrain | null;
  /** Hide the picture from assistive technology when the text next to it already names the car. */
  decorative?: boolean;
  /** Crop the empty studio space around the car (thumbnails). The stage keeps the full box for its hotspots. */
  tight?: boolean;
  /** Draw the spare wheel on the tailgate; off by default for models without one (Haval Dargo). */
  spare?: boolean;
};

/** The crop of `tight`: every body, its roof rails, spare wheel and shadow fit inside. */
export const TIGHT_VIEWBOX = "30 28 740 282";

// Black plastic and rubber read from the theme: a touch lighter on the dark stage, so cladding, flares and tyres keep
// their edges there. The fallbacks are the light-theme values.
const PLASTIC = "var(--car-plastic, #1c2226)";

function PaintDefs({ id, g, color }: { id: string; g: BodyGeometry; color: string }) {
  const s = paintShades(color);
  const span = g.sillY - g.top;
  const at = (y: number) => Math.min(1, Math.max(0, (y - g.top) / span)).toFixed(3);
  const door = g.sillY - g.belt;
  return (
    <>
      <linearGradient id={`${id}-paint`} gradientUnits="userSpaceOnUse" x1="0" y1={g.top} x2="0" y2={g.sillY}>
        <stop offset="0" stopColor={s.top} />
        <stop offset={at(g.belt - 14)} stopColor={s.upper} />
        <stop offset={at(g.belt)} stopColor={s.highlight} />
        <stop offset={at(g.belt + 7)} stopColor={s.upper} />
        <stop offset={at(g.belt + door * 0.28)} stopColor={s.base} />
        <stop offset={at(g.belt + door * 0.42)} stopColor={s.horizon} />
        <stop offset={at(g.belt + door * 0.455)} stopColor={s.lower} />
        <stop offset={at(g.belt + door * 0.72)} stopColor={mix(s.lower, s.base, 0.45)} />
        <stop offset="1" stopColor={s.bottom} />
      </linearGradient>
      <linearGradient id={`${id}-ends`} gradientUnits="userSpaceOnUse" x1={g.nose[0] - 8} y1="0" x2={g.tail[0] + 22} y2="0">
        <stop offset="0" stopColor={s.shadow} stopOpacity={s.light ? 0.3 : 0.5} />
        <stop offset="0.1" stopColor={s.shadow} stopOpacity="0" />
        <stop offset="0.88" stopColor={s.shadow} stopOpacity="0" />
        <stop offset="1" stopColor={s.shadow} stopOpacity={s.light ? 0.34 : 0.55} />
      </linearGradient>
      <radialGradient id={`${id}-sheen`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor={s.highlight} stopOpacity={s.light ? 0.9 : 0.55} />
        <stop offset="1" stopColor={s.highlight} stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3a4852" />
        <stop offset="0.55" stopColor="#1b252c" />
        <stop offset="1" stopColor="#0e151a" />
      </linearGradient>
      <linearGradient id={`${id}-reflect`} x1="0" y1="0" x2="1" y2="0.35">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="0.38" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="0.39" stopColor="#dfe9f0" stopOpacity="0.2" />
        <stop offset="0.56" stopColor="#dfe9f0" stopOpacity="0.07" />
        <stop offset="0.57" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="0.66" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="0.67" stopColor="#dfe9f0" stopOpacity="0.1" />
        <stop offset="0.72" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${id}-head`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f4f8fa" />
        <stop offset="0.5" stopColor="#b9c5cc" />
        <stop offset="1" stopColor="#5d6a72" />
      </linearGradient>
      <linearGradient id={`${id}-tail`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e2414a" />
        <stop offset="0.55" stopColor="#a3141d" />
        <stop offset="1" stopColor="#5e0a10" />
      </linearGradient>
      <linearGradient id={`${id}-mirror`} x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stopColor={s.top} />
        <stop offset="0.35" stopColor={s.upper} />
        <stop offset="0.75" stopColor={s.base} />
        <stop offset="1" stopColor={s.bottom} />
      </linearGradient>
      <linearGradient id={`${id}-well`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#05080a" />
        <stop offset="1" stopColor="#1a2025" />
      </linearGradient>
      <radialGradient id={`${id}-shadow`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#000" stopOpacity="0.34" />
        <stop offset="0.6" stopColor="#000" stopOpacity="0.14" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
    </>
  );
}

/** The grille seen from the side: a dark slot with chrome slats, or a closed painted panel on an electric car. */
function Grille({ id, d, open, paint, edge }: { id: string; d: string; open: boolean; paint: string; edge: string }) {
  const box = pathBounds(d);
  const slats = open ? Array.from({ length: Math.max(2, Math.floor(box.h / 6)) }, (_, i) => box.y + ((i + 1) * box.h) / (Math.floor(box.h / 6) + 1)) : [];
  return (
    <g>
      <clipPath id={`${id}-grille`}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={open ? PLASTIC : paint} stroke={open ? "#59656d" : edge} strokeOpacity={open ? 0.7 : 0.3} strokeWidth="0.8" />
      <g clipPath={`url(#${id}-grille)`}>
        {slats.map((y) => (
          <path key={y} d={`M ${box.x} ${y.toFixed(1)} H ${box.x + box.w}`} stroke="#aab4ba" strokeOpacity="0.55" strokeWidth="1.1" />
        ))}
      </g>
    </g>
  );
}

/** A spare wheel on the tailgate seen edge-on: tread, sidewall bulge and the mounting bracket. */
function Spare({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const grooves = Array.from({ length: Math.floor((h - 16) / 7) }, (_, i) => y + 10 + i * 7);
  return (
    <g>
      <rect x={x - 4} y={y + h / 2 - 9} width="8" height="18" rx="2" fill={PLASTIC} />
      <rect x={x} y={y} width={w} height={h} rx={w * 0.38} fill="#171b1f" />
      <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={w * 0.32} fill="none" stroke="#2c3338" strokeWidth="1.2" />
      {grooves.map((gy) => (
        <path key={gy} d={`M ${x + w * 0.62} ${gy} H ${x + w - 3}`} stroke="#30373c" strokeWidth="2.2" strokeLinecap="round" />
      ))}
      <path d={`M ${x + w * 0.3} ${y + 8} V ${y + h - 8}`} stroke="#ffffff" strokeOpacity="0.08" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

export function CarIllustration({
  body,
  color,
  className,
  title,
  powertrain,
  decorative = false,
  tight = false,
  spare = true,
}: CarIllustrationProps) {
  const id = "car" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const g = BODIES[body];
  const s = paintShades(color);
  const cy = wheelCy(g);
  const R = archR(g);
  const body_ = bodyPath(g);
  const name = title ?? BODY_LABELS[body];
  const seam = s.light ? "#56626c" : s.shadow;
  // Black and graphite paints get a rim light along the silhouette, so they never melt into a dark stage.
  const rimLit = luminance(s.base) < 0.2;
  const engine = hasExhaust(powertrain) || powertrain == null;
  const length = g.tail[0] - g.nose[0];
  const plug = hasChargePort(powertrain);
  // The mirror path is the cap, then (after the second "M") the dark base on the door.
  const [mirrorCap, ...base] = g.mirror.split(/(?=M )/);
  const mirrorBase = base.join(" ");
  const arches = [
    { cx: g.frontX, yl: g.nose[1], yr: g.sillY },
    { cx: g.rearX, yl: g.sillY, yr: g.tail[1] },
  ];

  return (
    <svg
      viewBox={tight ? TIGHT_VIEWBOX : `0 0 ${VIEW_W} ${VIEW_H}`}
      role={decorative ? undefined : "img"}
      aria-labelledby={decorative ? undefined : `${id}-title`}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
      className={cn("block h-auto w-full", className)}
    >
      {decorative ? null : <title id={`${id}-title`}>{name}</title>}
      <defs>
        <PaintDefs id={id} g={g} color={color} />
        <WheelDefs id={id} />
        <clipPath id={`${id}-body`}>
          <path d={body_} />
        </clipPath>
        {/* The rim light runs along the roof, the nose and the tail, not along the sills. */}
        <clipPath id={`${id}-upper`}>
          <rect x="0" y="0" width={VIEW_W} height={g.sillY - g.cladding - 6} />
        </clipPath>
        {g.glass.map((d, i) => (
          <clipPath key={i} id={`${id}-g${i}`}>
            <path d={d} />
          </clipPath>
        ))}
      </defs>

      <ellipse cx={g.nose[0] + length / 2} cy={GROUND + 2} rx={length / 2 + 26} ry={15} fill={`url(#${id}-shadow)`} />

      {arches.map((a) => (
        <path key={a.cx} d={wellPath(g, a.cx, a.yl, a.yr)} fill={`url(#${id}-well)`} />
      ))}

      {/* A dark outline keeps light paints off a light stage (hood and trunk edges of a white car included). */}
      <path
        d={body_}
        fill={`url(#${id}-paint)`}
        stroke={s.shadow}
        strokeOpacity={s.light ? 0.45 : rimLit ? 0.5 : 0.2}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      <g clipPath={`url(#${id}-body)`}>
        <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill={`url(#${id}-ends)`} />
        <ellipse cx={g.frontX + 26} cy={g.belt + 16} rx={88} ry={14} fill={`url(#${id}-sheen)`} opacity="0.55" />
        <ellipse cx={g.rearX - 10} cy={g.belt + 12} rx={96} ry={13} fill={`url(#${id}-sheen)`} opacity="0.5" />
        {/* Fender lips: a shadow just outside each arch. */}
        {arches.map((a) => (
          <path
            key={a.cx}
            d={archStroke(g, a.cx, R + 4, a.yl, a.yr)}
            fill="none"
            stroke={s.shadow}
            strokeOpacity={s.light ? 0.09 : 0.28}
            strokeWidth="5"
          />
        ))}
        {/* Light paints get a slightly darker rocker band: the lower body reads as a surface turning under. */}
        {s.light ? (
          <rect x="0" y={g.sillY - g.cladding - 16} width={VIEW_W} height="16" fill={s.shadow} opacity="0.07" />
        ) : null}
        {g.cladding > 0 ? <rect x="0" y={g.sillY - g.cladding} width={VIEW_W} height={VIEW_H} fill={PLASTIC} /> : null}
        {g.cladding > 0 ? (
          <rect x="0" y={g.sillY - g.cladding} width={VIEW_W} height="1.2" fill="#ffffff" opacity="0.12" />
        ) : (
          <path
            d={`M ${g.frontX} ${g.sillY - 5} L ${g.rearX} ${g.sillY - 5}`}
            stroke={s.bottom}
            strokeOpacity="0.6"
            strokeWidth="10"
          />
        )}
        <path d={g.shoulder} fill="none" stroke={s.shadow} strokeOpacity={s.light ? 0.16 : 0.3} strokeWidth="5" transform="translate(0 3.5)" />
        <path d={g.shoulder} fill="none" stroke={s.edgeLight} strokeOpacity="0.9" strokeWidth="1.3" strokeLinecap="round" />
        {g.details
          ?.filter((d) => d.kind === "crease")
          .map((d, i) => (
            <path key={i} d={d.d} fill="none" stroke={s.edgeLight} strokeOpacity="0.55" strokeWidth="1.1" strokeLinecap="round" />
          ))}
        <path d={g.seams} fill="none" stroke={s.edgeLight} strokeOpacity={s.light ? 0.9 : 0.35} strokeWidth="1" transform="translate(1 0.6)" />
        <path d={g.seams} fill="none" stroke={seam} strokeOpacity={s.light ? 0.75 : 0.85} strokeWidth="1.1" strokeLinecap="round" />
        <rect
          x={g.flap.x}
          y={g.flap.y}
          width={g.flap.w}
          height={g.flap.h}
          rx={Math.min(g.flap.w, g.flap.h) * 0.28}
          fill="none"
          stroke={seam}
          strokeOpacity="0.7"
          strokeWidth="1"
        />
        {plug ? (
          <path
            d={`M ${g.flap.x + g.flap.w * 0.56} ${g.flap.y + g.flap.h * 0.2} l -4 ${g.flap.h * 0.34} h 4 l -3 ${g.flap.h * 0.3}`}
            fill="none"
            stroke={seam}
            strokeOpacity="0.55"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {/* The face: a grille slot (a closed nose on an electric car) and the lower intake, so noses differ. */}
        {g.intake ? <path d={g.intake} fill={PLASTIC} /> : null}
        {g.grille ? <Grille id={id} d={g.grille} open={engine} paint={s.lower} edge={s.shadow} /> : null}
        {/* Lamps sit in the body, so they never stick out of the silhouette. */}
        <path d={g.headlight} fill={`url(#${id}-head)`} stroke="#3b464d" strokeOpacity="0.6" strokeWidth="0.8" />
        <path d={g.drl} fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        <path d={g.taillight} fill={`url(#${id}-tail)`} stroke="#4a070c" strokeOpacity="0.6" strokeWidth="0.8" />
        <path d={g.tailLine} fill="none" stroke="#ff8a8f" strokeWidth="1.6" strokeLinecap="round" />
      </g>

      {rimLit ? (
        <path
          d={body_}
          fill="none"
          stroke={s.highlight}
          strokeOpacity="0.35"
          strokeWidth="1.2"
          strokeLinejoin="round"
          clipPath={`url(#${id}-upper)`}
        />
      ) : null}

      {g.details
        ?.filter((d) => d.kind !== "crease")
        .map((d, i) =>
          d.kind === "trim" ? (
            <path key={i} d={d.d} fill={PLASTIC} />
          ) : (
            <path key={i} d={d.d} fill="none" stroke="#e7ecef" strokeWidth="2" strokeLinecap="round" />
          ),
        )}

      {g.glass.map((d, i) => (
        <g key={i}>
          <path d={d} fill={`url(#${id}-glass)`} />
          <g clipPath={`url(#${id}-g${i})`}>
            {g.seats?.map(([x, y], j) => (
              <rect key={j} x={x - 13} y={y - 9} width="26" height="30" rx="9" fill="#2d3a43" opacity="0.75" />
            ))}
            <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill={`url(#${id}-reflect)`} />
          </g>
        </g>
      ))}
      {g.pillars?.map((d, i) => <path key={i} d={d} fill="#11171b" />)}
      {g.dloTrim ? (
        <path
          d={g.dloTrim.d}
          fill="none"
          stroke={g.dloTrim.kind === "chrome" ? "#e3e8eb" : "#0f1418"}
          strokeWidth={g.dloTrim.kind === "chrome" ? 1.8 : 2.2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}

      {g.handles.map(([x, y, w], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height="5.5" rx="2.75" fill={s.lower} stroke={seam} strokeOpacity="0.55" strokeWidth="0.8" />
          <path d={`M ${x + 3} ${y + 1.3} H ${x + w - 3}`} stroke={s.edgeLight} strokeOpacity="0.8" strokeWidth="0.9" strokeLinecap="round" />
        </g>
      ))}

      {mirrorBase ? <path d={mirrorBase} fill={PLASTIC} /> : null}
      <path d={mirrorCap} fill={`url(#${id}-mirror)`} stroke={seam} strokeOpacity="0.6" strokeWidth="0.9" />
      <path d={mirrorCap} fill="none" stroke={s.edgeLight} strokeOpacity="0.7" strokeWidth="0.8" transform="translate(0.5 0.7)" />

      {g.spare && spare ? <Spare {...g.spare} /> : null}
      {g.roofRails ? (
        <path d={g.roofRails} fill="#1f262b" stroke="#69747c" strokeOpacity="0.6" strokeWidth="0.8" />
      ) : null}
      {g.fin ? (
        <path
          d={`M ${g.fin[0] - 14} ${g.fin[1]} C ${g.fin[0] - 8} ${g.fin[1] - 7}, ${g.fin[0] + 2} ${g.fin[1] - 10}, ${g.fin[0] + 10} ${g.fin[1] - 8} L ${g.fin[0] + 13} ${g.fin[1]} Z`}
          fill="#1a2025"
        />
      ) : null}
      {g.exhaust && hasExhaust(powertrain) ? (
        <rect x={g.exhaust[0] - 10} y={g.exhaust[1] - 3} width="20" height="6" rx="3" fill="#2b3237" stroke="#a7b0b6" strokeWidth="1" />
      ) : null}

      {g.flare > 0
        ? arches.map((a) => (
            <path
              key={a.cx}
              d={archStroke(g, a.cx, R + g.flare / 2 - 1, a.yl - 1, a.yr - 1)}
              fill="none"
              stroke={PLASTIC}
              strokeWidth={g.flare}
            />
          ))
        : null}

      {[g.frontX, g.rearX].map((cx) => (
        <ellipse key={cx} cx={cx} cy={GROUND} rx={g.wheelR * 0.92} ry="5" fill={`url(#${id}-contact)`} />
      ))}
      {[g.frontX, g.rearX].map((cx) => (
        <Wheel key={cx} id={id} cx={cx} cy={cy} r={g.wheelR} rimRatio={g.rimRatio} style={g.rim} face={g.rimFace} tread={g.tread} />
      ))}
    </svg>
  );
}
