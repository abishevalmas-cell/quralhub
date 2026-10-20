"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { StageHint, VehicleStage, stageActionClass, zoneLabelsFor, type StageSize } from "@/components/car";
import { loginHref } from "@/components/home/links";
import { Icon } from "@/components/ui/icon";
import { zonePartTypes, type ZoneId } from "@/lib/catalog";
import type { PartType } from "@/lib/taxonomy";
import { pluralRu } from "@/lib/utils";
import { ALL_ZONES, PHONE_ZONES, STAGE_ZONES, partBadge, partHref, type StageSubject } from "./subject";
import { ZonePanel } from "./zone-panel";

export const STAGE_ID = "stage";

// The vehicle stage with live hotspots: a tap opens the parts of that area right under the picture.
// Give it key={subject.key} so another car starts with no area open.
export function StageExplorer({
  subject,
  signedIn,
  title,
  subtitle,
  topRight,
  below,
  colorHex,
  partsHref = "#parts",
  size = "lg",
  headingLevel = 2,
}: {
  subject: StageSubject;
  signedIn: boolean;
  title?: ReactNode;
  subtitle?: ReactNode;
  topRight?: ReactNode;
  /** Shown right under the picture, above an open area (e.g. the color picker). */
  below?: ReactNode;
  /** A paint being tried on (the color picker), instead of the car's own. */
  colorHex?: string;
  partsHref?: string;
  size?: StageSize;
  headingLevel?: 2 | 3;
}) {
  const [zone, setZone] = useState<ZoneId | null>(null);
  const panel = useRef<HTMLElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const opened = useRef(false);
  const labels = zoneLabelsFor(subject.powertrain);
  const parts = zone ? zonePartTypes(zone, subject.powertrains.length ? subject.powertrains : null) : [];
  const note = partBadge(subject).short;

  // After a tap, bring the panel into view under the stage. On a phone the panel is a bottom sheet: the car goes to
  // the top of the screen instead, so the tapped area stays visible above the sheet.
  useEffect(() => {
    if (!zone || !opened.current) return;
    opened.current = false;
    const smooth = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    if (window.matchMedia("(max-width: 639px)").matches)
      root.current?.querySelector("[data-stage-car]")?.scrollIntoView({ block: "start", behavior: smooth });
    else panel.current?.scrollIntoView({ block: "nearest", behavior: smooth });
  }, [zone]);

  // Keep the open area's chip in sight in the sideways-scrolling row of other areas.
  useEffect(() => {
    const row = panel.current?.querySelector<HTMLElement>('[role="group"]');
    const chip = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!row || !chip) return;
    const outer = row.getBoundingClientRect();
    const inner = chip.getBoundingClientRect();
    row.scrollLeft += inner.left - outer.left - (outer.width - inner.width) / 2;
  }, [zone]);

  function select(next: ZoneId) {
    opened.current = true;
    setZone((current) => (current === next ? null : next));
  }

  // Closing unmounts the focused close button: focus goes back to the hotspot of the area that was open.
  function close() {
    const closed = zone;
    setZone(null);
    if (!closed) return;
    requestAnimationFrame(() => {
      const spots = [...(root.current?.querySelectorAll<HTMLElement>("[data-zone]") ?? [])].filter((el) => el.offsetParent !== null);
      (spots.find((el) => el.dataset.zone === closed) ?? spots[0])?.focus();
    });
  }

  const hrefFor = (part: PartType) => {
    const target = partHref(subject, part, zone);
    return signedIn ? target : loginHref(target);
  };

  return (
    <div ref={root} id={STAGE_ID} className="grid min-w-0 scroll-mt-24 gap-3 [&>*]:min-w-0">
      <VehicleStage
        title={title ?? subject.title}
        subtitle={subtitle ?? subject.subtitle}
        carTitle={`${subject.title}: схема узлов`}
        body={subject.body}
        color={colorHex ?? subject.colorHex}
        powertrain={subject.powertrain}
        spare={subject.spare}
        zones={STAGE_ZONES}
        phoneZones={PHONE_ZONES}
        activeZone={zone}
        onZoneSelect={select}
        topRight={topRight}
        size={size}
        headingLevel={headingLevel}
        bottomLeft={
          <StageHint>
            {subject.genericBody
              ? "Модели нет в нашем списке, поэтому кузов на схеме условный. Нажмите «+» у нужной области."
              : "Нажмите «+» на нужной части. Схема условная."}
          </StageHint>
        }
        bottomRight={
          <a href={partsHref} className={stageActionClass}>
            <Icon name="grid" className="size-4 sm:size-[18px]" />
            Выбрать узел
          </a>
        }
      />
      {below}
      <p className="sr-only" aria-live="polite">
        {zone ? `Открыт узел «${labels[zone]}»: ${parts.length} ${pluralRu(parts.length, "деталь", "детали", "деталей")} ниже` : ""}
      </p>
      {zone ? (
        <ZonePanel
          ref={panel}
          zone={zone}
          zones={ALL_ZONES}
          labels={labels}
          parts={parts}
          hrefFor={hrefFor}
          note={note}
          onSelect={(z) => setZone(z)}
          onClose={close}
        />
      ) : null}
    </div>
  );
}

/** Scrolls to the stage and puts the keyboard on its first hotspot ("Визуально"). */
export function focusStage() {
  const stage = document.getElementById(STAGE_ID);
  if (!stage) return;
  stage.scrollIntoView({ block: "start", behavior: "smooth" });
  stage.querySelector<HTMLButtonElement>("button[aria-pressed]")?.focus({ preventScroll: true });
}
