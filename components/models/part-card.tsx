import Link from "next/link";
import { CarGhost } from "@/components/car";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import type { BodyType, ZoneId } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import type { PartBadge } from "./subject";

// One kind of part in the assortment grid, after the original Tetix part card: a light picture area (this car's
// silhouette with the part's area lit, since we have no photo of a part nobody has found yet), the heart, the name,
// the honest badge, the usual lead time and "Подобрать". No price: it is known only after a sourcer found the part.
export function PartCard({
  name,
  nameZh,
  body,
  zone,
  badge,
  href,
  favorite,
  onToggleFavorite,
}: {
  name: string;
  nameZh: string;
  body: BodyType;
  zone: ZoneId | null;
  badge: PartBadge;
  href: string;
  favorite: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <li className="group/card relative flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-line bg-card transition hover:border-line-strong">
      <div className="relative bg-stage-b bg-[radial-gradient(ellipse_at_50%_70%,var(--stage-a),transparent_70%)] pb-2 pl-3 pr-8 pt-6 sm:px-6 sm:pt-5">
        <CarGhost body={body} zone={zone} className="mx-auto max-w-[200px]" />
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={favorite}
          className={cn(
            "absolute right-1 top-1 z-10 grid size-9 place-items-center rounded-full transition sm:right-2 sm:top-2",
            favorite ? "bg-lime text-on-lime" : "bg-card text-ink hover:bg-soft",
          )}
        >
          <Icon name="heart" className={cn("size-[17px]", favorite && "[&_path]:fill-current")} />
          <span className="sr-only">{favorite ? `Убрать из избранного: ${name}` : `В избранное: ${name}`}</span>
        </button>
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {/* Two lines reserved for every name, so the badges of neighbouring cards line up. The Chinese name is for
            sourcers: a tooltip here, not a line on a customer's card. */}
        <h3 className="line-clamp-2 min-h-[2.6em] text-[13px] font-bold leading-[1.3] [overflow-wrap:anywhere] sm:text-sm" title={nameZh ? `${name} · ${nameZh}` : name}>
          {name}
        </h3>
        <div className="mt-2">
          <Badge tone={badge.tone} wrap className="text-[11px] sm:text-xs">
            {badge.label}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-muted sm:text-[13px]">
          Цена после подбора · <span className="whitespace-nowrap">8–20 дней</span>
        </p>
        <div className="mt-auto pt-3">
          {/* A soft button; it turns graphite when the card is hovered or the link has focus. The stretched area
              makes the whole card a target without nesting the heart inside the link. */}
          <Link
            href={href}
            aria-label={`Подобрать: ${name}`}
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded-md border border-line-strong px-3 text-xs font-semibold text-ink transition",
              "after:absolute after:inset-0 after:content-['']",
              "group-hover/card:border-strong group-hover/card:bg-strong group-hover/card:text-on-strong",
              "focus-visible:border-strong focus-visible:bg-strong focus-visible:text-on-strong",
            )}
          >
            Подобрать
            <Icon name="chevron" className="size-3.5" />
          </Link>
        </div>
      </div>
    </li>
  );
}
