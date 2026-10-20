import Link from "next/link";
import { useId, type CSSProperties, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { CarIllustration } from "./car-illustration";
import { STAGE_BG } from "./stage-bg";
import { zoneLabelsFor, type BodyType, type Powertrain, type ZoneId } from "./types";
import { zonePosition } from "./zones";

// The big car panel of the original Tetix design: name and specs on top, the car in the middle with "+" hotspots
// on its parts, a hint and an action at the bottom. Stateless and controlled: a client parent passes
// `onZoneSelect`, a server page passes `zoneHrefs`; without either the hotspots are only markers.

export type StageSize = "lg" | "md" | "sm";

export type VehicleStageProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  body: BodyType;
  color: string;
  powertrain?: Powertrain | null;
  /** Hotspots to show, in this order (tab order follows it). */
  zones?: readonly ZoneId[];
  /** The hotspots kept on a phone, where eight dots would crowd the car; the rest stay one tap away in the chips. */
  phoneZones?: readonly ZoneId[];
  /** Draw the spare wheel of an off-roader (false for models without one). */
  spare?: boolean;
  activeZone?: ZoneId | null;
  onZoneSelect?: (zone: ZoneId) => void;
  /** Links for the hotspots when the stage is rendered on the server. */
  zoneHrefs?: Partial<Record<ZoneId, string>>;
  /** Accessible names and tooltips; missing ones fall back to zoneLabelsFor(powertrain). */
  zoneLabels?: Partial<Record<ZoneId, string>>;
  /** Accessible name of the picture; defaults to the title when it is plain text. */
  carTitle?: string;
  topRight?: ReactNode;
  bottomLeft?: ReactNode;
  bottomRight?: ReactNode;
  size?: StageSize;
  headingLevel?: 2 | 3;
  className?: string;
};

const SIZES: Record<
  StageSize,
  { pad: string; title: string; subtitle: string; car: string; dot: string; bottom: string; radius: string }
> = {
  lg: {
    pad: "px-[18px] pt-[18px] sm:px-7 sm:pt-6",
    title: "text-[23px] sm:text-[28px]",
    subtitle: "text-[11px] sm:text-[13px]",
    car: "-mx-[3%] -mt-4 w-[106%] sm:mx-auto sm:-mt-12 sm:w-full sm:max-w-[700px] 2xl:max-w-[780px]",
    dot: "size-[25px] sm:size-[30px]",
    bottom: "px-4 pb-3.5 sm:px-7 sm:pb-[22px]",
    radius: "rounded-[17px] sm:rounded-[22px]",
  },
  md: {
    pad: "px-4 pt-4 sm:px-5 sm:pt-5",
    title: "text-xl sm:text-[22px]",
    subtitle: "text-[11px] sm:text-xs",
    car: "-mt-2 w-full sm:-mt-8 sm:mx-auto sm:max-w-[560px]",
    dot: "size-6 sm:size-[26px]",
    bottom: "px-4 pb-3 sm:px-5 sm:pb-4",
    radius: "rounded-[18px]",
  },
  sm: {
    pad: "px-3.5 pt-3.5",
    title: "text-base",
    subtitle: "text-[11px]",
    car: "-mt-1 w-full",
    dot: "size-[22px]",
    bottom: "px-3.5 pb-3",
    radius: "rounded-2xl",
  },
};

export function VehicleStage({
  title,
  subtitle,
  body,
  color,
  powertrain,
  zones = [],
  phoneZones,
  spare,
  activeZone = null,
  onZoneSelect,
  zoneHrefs,
  zoneLabels,
  carTitle,
  topRight,
  bottomLeft,
  bottomRight,
  size = "lg",
  headingLevel = 2,
  className,
}: VehicleStageProps) {
  const s = SIZES[size];
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const defaults = zoneLabelsFor(powertrain);
  const label = (zone: ZoneId) => zoneLabels?.[zone] ?? defaults[zone];
  const headingId = useId();
  return (
    <section
      className={cn("relative isolate overflow-hidden border border-line", s.radius, STAGE_BG, className)}
      aria-labelledby={headingId}
    >
      <div className={cn("relative z-10 flex items-start justify-between gap-3", s.pad)}>
        <div className="min-w-0">
          <Heading id={headingId} className={cn("font-extrabold leading-tight tracking-[-0.03em] [overflow-wrap:anywhere]", s.title)}>{title}</Heading>
          {subtitle ? <p className={cn("mt-1 text-muted", s.subtitle)}>{subtitle}</p> : null}
        </div>
        {topRight ? <div className="shrink-0">{topRight}</div> : null}
      </div>

      <div className={cn("relative scroll-mt-20", s.car)} data-stage-car="">
        <CarIllustration
          body={body}
          color={color}
          powertrain={powertrain}
          spare={spare}
          title={carTitle ?? (typeof title === "string" ? title : undefined)}
        />
        {zones.map((zone, i) => (
          <Hotspot
            key={zone}
            zone={zone}
            body={body}
            index={i}
            label={label(zone)}
            active={zone === activeZone}
            phoneHidden={Boolean(phoneZones && !phoneZones.includes(zone) && zone !== activeZone)}
            dot={s.dot}
            onSelect={onZoneSelect}
            href={zoneHrefs?.[zone]}
          />
        ))}
      </div>

      {bottomLeft || bottomRight ? (
        <div className={cn("relative z-10 flex items-end justify-between gap-3", s.bottom)}>
          <div className="min-w-0">{bottomLeft}</div>
          {bottomRight ? <div className="shrink-0">{bottomRight}</div> : null}
        </div>
      ) : null}
    </section>
  );
}

function Hotspot({
  zone,
  body,
  index,
  label,
  active,
  phoneHidden,
  dot,
  onSelect,
  href,
}: {
  zone: ZoneId;
  body: BodyType;
  index: number;
  label: string;
  active: boolean;
  phoneHidden: boolean;
  dot: string;
  onSelect?: (zone: ZoneId) => void;
  href?: string;
}) {
  const { left, top } = zonePosition(body, zone);
  // Tooltips near the ends of the car open inwards so the stage never clips them.
  const align = left < 22 ? "left-0" : left > 78 ? "right-0" : "left-1/2 -translate-x-1/2";
  // The global :focus-visible rule draws the ring; the inline offset moves it outside the halo so it stays visible.
  const position: CSSProperties = { left: `${left}%`, top: `${top}%`, outlineOffset: "9px" };
  // The open or hovered hotspot rises above its neighbours, so no other dot covers its label.
  const face = cn(
    "group absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
    active ? "z-20" : "z-10 hover:z-20 focus-visible:z-20",
    "before:absolute before:-inset-2 before:rounded-full before:content-['']",
    phoneHidden && "max-sm:hidden",
  );
  const inner = (
    <>
      {active ? null : (
        <span
          aria-hidden="true"
          className="absolute inset-[16%] animate-ping rounded-full bg-card opacity-70 motion-reduce:hidden"
          style={{ animationDuration: "2.8s", animationDelay: `${(index % 6) * 0.45}s` }}
        />
      )}
      <span
        aria-hidden="true"
        className={cn(
          // Graphite in both themes, so the dot reads on white paint in dark mode too; in dark a thin lime ring keeps
          // it off black paint, and the halo comes from --hotspot-halo (white in light, lime in dark).
          "relative grid place-items-center rounded-full bg-strong text-on-strong transition duration-200",
          "shadow-[0_0_0_4px_var(--hotspot-halo),0_3px_10px_rgb(10_20_28/0.25)]",
          "sm:shadow-[0_0_0_6px_var(--hotspot-halo),0_4px_14px_rgb(10_20_28/0.25)]",
          "dark:ring-[1.5px] dark:ring-dot/60",
          "group-hover:scale-110 group-hover:bg-[color-mix(in_oklab,var(--strong)_80%,var(--lime-ink))]",
          active &&
            "scale-110 shadow-[0_0_0_3px_var(--lime),0_0_0_7px_color-mix(in_oklab,var(--lime)_35%,transparent),0_4px_14px_rgb(10_20_28/0.3)] sm:shadow-[0_0_0_4px_var(--lime),0_0_0_9px_color-mix(in_oklab,var(--lime)_35%,transparent),0_4px_14px_rgb(10_20_28/0.3)]",
          dot,
        )}
      >
        <Icon name="plus" className={cn("size-[58%] transition-transform duration-200", active && "rotate-45")} />
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bottom-full mb-3 whitespace-nowrap rounded-md bg-strong px-2 py-1 text-xs font-semibold text-on-strong shadow-sm transition-opacity duration-150",
          align,
          // On phones the active label would cover the title, so it shows only on hover and focus there.
          active ? "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 sm:opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
        )}
      >
        {label}
      </span>
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        className={face}
        style={position}
        aria-label={label}
        aria-pressed={active}
        data-zone={zone}
        onClick={() => onSelect(zone)}
      >
        {inner}
      </button>
    );
  }
  if (href) {
    return (
      <Link href={href} className={face} style={position} aria-label={label} aria-current={active ? "true" : undefined} data-zone={zone}>
        {inner}
      </Link>
    );
  }
  return (
    <span className={cn(face, "pointer-events-none")} style={position} aria-hidden="true">
      {inner}
    </span>
  );
}

/** The hint under the car, as in the original: short, muted, two lines at most (one on a wide stage). */
export function StageHint({ children }: { children: ReactNode }) {
  return <p className="max-w-[17rem] text-[10px] leading-snug text-balance text-muted sm:max-w-sm sm:text-xs">{children}</p>;
}

/** The light pill for the stage corner actions ("Выбрать узел", "Добавить VIN"). */
export const stageActionClass =
  "inline-flex min-h-9 items-center gap-2 rounded-lg bg-card/80 px-3 ring-1 ring-line/70 text-[11px] font-semibold text-ink shadow-[0_1px_2px_rgb(10_20_28/0.06)] backdrop-blur transition hover:bg-card sm:px-3.5 sm:text-[13px]";

/** The underlined text link of the stage top-right corner. */
export const stageLinkClass =
  "inline-flex min-h-9 items-center px-1 text-[11px] font-semibold text-ink underline decoration-1 underline-offset-4 hover:decoration-2 sm:text-[13px]";
