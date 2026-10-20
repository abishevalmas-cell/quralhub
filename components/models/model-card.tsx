import Link from "next/link";
import { CarThumb } from "@/components/car";
import { Badge } from "@/components/ui/badge";
import { getBrand, MARKET_LABELS, MARKETS, modelTitle, modelYears, POWERTRAIN_LABELS, type CarModel, type Powertrain } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { CATALOG_STATUS } from "./catalog-status";
import { paintHex } from "./subject";

const SHORT_POWERTRAIN: Record<Powertrain, string> = {
  ice: "ДВС",
  hev: "Гибрид",
  phev: "PHEV",
  erev: "EREV",
  bev: "Электро",
};

export function PowertrainChips({ powertrains, className }: { powertrains: readonly Powertrain[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-1", className)} aria-label="Силовая установка">
      {powertrains.map((p) => (
        <li key={p} title={POWERTRAIN_LABELS[p]} className="rounded-md border border-line bg-card px-1.5 py-px text-[11px] font-semibold text-ink">
          {SHORT_POWERTRAIN[p]}
        </li>
      ))}
    </ul>
  );
}

/** "Казахстан, Узбекистан, Кыргызстан, Россия". */
export const marketsText = (model: Pick<CarModel, "popularIn">) => model.popularIn.map((m) => MARKET_LABELS[m]).join(", ");

// A model in a list: the car in its usual color, names, years, powertrains and where it is common. The whole card
// is one link; the status badge says how parts for the brand are picked.
export function ModelCard({
  model,
  href,
  headingLevel = 3,
  showStatus = true,
}: {
  model: CarModel;
  href: string;
  headingLevel?: 2 | 3;
  /** Off inside a brand section, whose heading already shows the status. */
  showStatus?: boolean;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const status = CATALOG_STATUS[getBrand(model.brandId)?.catalogStatus ?? "checking"];
  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-line bg-card transition hover:border-line-strong">
      <div className="p-1.5 pb-0 sm:p-2 sm:pb-0">
        <CarThumb
          body={model.body}
          color={paintHex(model.defaultColor)}
          powertrain={model.powertrains.length === 1 ? model.powertrains[0] : null}
          spare={model.spare}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5 pt-2 sm:p-4 sm:pt-3">
        <Heading className="text-sm font-bold leading-snug [overflow-wrap:anywhere] sm:text-[15px]">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {modelTitle(model)}
          </Link>
        </Heading>
        <p className="text-xs text-muted">
          {model.modelZh ? (
            <span className="zh" lang="zh-CN">
              {model.modelZh}
            </span>
          ) : null}
          {model.modelZh ? " · " : null}
          {modelYears(model)}
        </p>
        <PowertrainChips powertrains={model.powertrains} />
        {/* Most models sell in all four countries; only the others say where. */}
        {model.popularIn.length < MARKETS.length ? (
          <p className="text-[11px] leading-snug text-muted">
            Популярна:{" "}
            {model.popularIn.map((m, i) => (
              <span key={m}>
                {i ? " · " : null}
                <abbr title={MARKET_LABELS[m]} className="no-underline">
                  {m}
                </abbr>
              </span>
            ))}
          </p>
        ) : null}
        {showStatus ? (
          <div className="mt-auto pt-1.5">
            <Badge tone={status.tone}>{status.card}</Badge>
          </div>
        ) : null}
      </div>
      {/* The stretched link draws the focus ring around the whole card. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[14px] group-has-[a:focus-visible]:outline-3 group-has-[a:focus-visible]:outline-lime-ink" />
    </article>
  );
}
