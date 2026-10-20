import { useId } from "react";
import { cn } from "@/lib/utils";
import { BODIES } from "./bodies";
import { TIGHT_VIEWBOX } from "./car-illustration";
import { bodyPath, wheelCy } from "./geometry";
import type { BodyType, ZoneId } from "./types";
import { carZones } from "./zones";

// A flat, muted silhouette of the car with one area lit in lime: the picture of a part card. It says where the part
// sits on this body, which is honest (no photo of a part we have not found yet) and ties the card to the stage.
// Colors come from the --ghost-* tokens, so it follows the theme. Decorative: the card names the part.
export function CarGhost({ body, zone, className }: { body: BodyType; zone: ZoneId | null; className?: string }) {
  const id = "ghost" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const g = BODIES[body];
  const cy = wheelCy(g);
  const mark = zone ? carZones(body)[zone] : null;
  return (
    <svg viewBox={TIGHT_VIEWBOX} aria-hidden="true" focusable="false" className={cn("block h-auto w-full", className)}>
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" style={{ stopColor: "var(--lime)", stopOpacity: 0.9 }} />
          <stop offset="0.45" style={{ stopColor: "var(--lime)", stopOpacity: 0.4 }} />
          <stop offset="1" style={{ stopColor: "var(--lime)", stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <path d={bodyPath(g)} style={{ fill: "var(--ghost-body)" }} />
      {g.glass.map((d, i) => (
        <path key={i} d={d} style={{ fill: "var(--ghost-glass)" }} />
      ))}
      {[g.frontX, g.rearX].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={cy} r={g.wheelR} style={{ fill: "var(--ghost-tyre)" }} />
          <circle cx={cx} cy={cy} r={g.wheelR * g.rimRatio} style={{ fill: "var(--ghost-rim)" }} />
        </g>
      ))}
      {mark ? (
        <g>
          <circle cx={mark.x} cy={mark.y} r="78" fill={`url(#${id}-glow)`} />
          <circle cx={mark.x} cy={mark.y} r="21" style={{ fill: "var(--lime)", stroke: "var(--strong)", strokeWidth: 6 }} />
        </g>
      ) : null}
    </svg>
  );
}
