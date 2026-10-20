import Link from "next/link";
import type { Ref } from "react";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import type { ZoneId } from "@/lib/catalog";
import { zhLabel, type PartType } from "@/lib/taxonomy";
import { cn, pluralRu } from "@/lib/utils";
import { zoneAxis } from "./subject";

// The parts behind one hotspot. Under the stage on wider screens; on a phone a bottom sheet over the bottom bar, so
// the car the customer tapped stays in view. Each part is one link row; the zone chips switch to other areas.
export function ZonePanel({
  ref,
  zone,
  zones,
  labels,
  parts,
  hrefFor,
  note,
  onSelect,
  onClose,
}: {
  ref?: Ref<HTMLElement>;
  zone: ZoneId;
  zones: readonly ZoneId[];
  labels: Record<ZoneId, string>;
  parts: PartType[];
  hrefFor: (part: PartType) => string;
  note: string;
  onSelect: (zone: ZoneId) => void;
  onClose: () => void;
}) {
  const headingId = `zone-${zone}-title`;
  return (
    <section
      ref={ref}
      aria-labelledby={headingId}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className={cn(
        "min-w-0 scroll-mt-24 rounded-[18px] border border-line bg-card p-4 shadow-[0_8px_30px_rgb(23_35_44/0.06)] sm:p-5",
        "max-sm:fixed max-sm:inset-x-2 max-sm:bottom-[calc(66px+env(safe-area-inset-bottom))] max-sm:z-30 max-sm:max-h-[52dvh] max-sm:overflow-y-auto max-sm:overscroll-contain max-sm:shadow-dialog",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Узел</p>
          <h3 id={headingId} className="mt-1 text-lg font-bold tracking-[-0.02em] sm:text-xl">
            {labels[zone]}
          </h3>
          <p className="mt-0.5 text-[13px] text-muted">
            {parts.length} {pluralRu(parts.length, "деталь", "детали", "деталей")} · {note}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-soft text-ink transition hover:bg-line"
        >
          <Icon name="close" className="size-5" />
          <span className="sr-only">Закрыть узел</span>
        </button>
      </div>

      <ChipGroup label="Другие узлы" scroll className="mt-3">
        {zones.map((z) => (
          <Chip key={z} active={z === zone} onClick={() => onSelect(z)}>
            {labels[z]}
          </Chip>
        ))}
      </ChipGroup>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {parts.map((part) => (
          <li key={part.id} className="min-w-0">
            <Link
              href={hrefFor(part)}
              aria-label={`Подобрать: ${part.ru}`}
              title={zhLabel(part, zoneAxis(zone, part), null)}
              className="group/row flex min-h-12 min-w-0 items-center gap-3 rounded-xl border border-line px-3 py-2 transition hover:border-line-strong hover:bg-soft"
            >
              <span className="min-w-0 flex-1 text-sm font-semibold leading-snug [overflow-wrap:anywhere]">{part.ru}</span>
              <span className="inline-flex h-7 shrink-0 items-center gap-0.5 rounded-md bg-soft px-2.5 text-xs font-semibold text-ink transition group-hover/row:bg-strong group-hover/row:text-on-strong">
                Подобрать
                <Icon name="chevron" className="size-3.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
