"use client";

import { useMemo, useState } from "react";
import { loginHref } from "@/components/home/links";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/card";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { assortmentFor, assortmentSize, partZone, type Powertrain } from "@/lib/catalog";
import { getPartType } from "@/lib/taxonomy";
import { pluralRu } from "@/lib/utils";
import { GRID_LIMIT, itemsFor, type GridFilter } from "./assortment-view";
import { useFavorites } from "./favorites";
import { PartCard } from "./part-card";
import { partBadge, partHref, type StageSubject } from "./subject";

// "Детали для вашего авто": group chips with counts and the grid of part cards for one car. The assortment lists
// kinds of parts the car physically has (by powertrain), never offers or prices.
export function AssortmentGrid({
  subject,
  signedIn,
  title = "Детали для вашего авто",
  id = "parts",
}: {
  subject: StageSubject;
  signedIn: boolean;
  title?: string;
  id?: string;
}) {
  // Keyed by the powertrain list, not the array: the parent builds a new subject on every render.
  const ptKey = subject.powertrains.join(",");
  const groups = useMemo(() => assortmentFor(ptKey ? (ptKey.split(",") as Powertrain[]) : null), [ptKey]);
  const total = assortmentSize(groups);
  const favorites = useFavorites(subject.key);
  const [filter, setFilter] = useState<GridFilter>("popular");
  const [expanded, setExpanded] = useState(false);
  // A filter left over from another car (favorites emptied, a group the new car lacks) falls back to popular.
  const active: GridFilter =
    filter === "favorites" ? (favorites.ids.length ? filter : "popular") : filter === "popular" || groups.some((g) => g.id === filter) ? filter : "popular";
  const items = itemsFor(groups, active, favorites.ids);
  const shown = expanded ? items : items.slice(0, GRID_LIMIT);
  const group = groups.find((g) => g.id === active) ?? null;
  const badge = partBadge(subject);
  const popularCount = itemsFor(groups, "popular").length;

  function pick(next: GridFilter) {
    setFilter(next);
    setExpanded(false);
  }

  const href = (partId: string) => {
    const part = getPartType(partId);
    const target = part ? partHref(subject, part) : "/requests/new";
    return signedIn ? target : loginHref(target);
  };

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="min-w-0 scroll-mt-24">
      <SectionHeading id={`${id}-title`} title={title} note={`${total} ${pluralRu(total, "вид", "вида", "видов")} деталей`} />
      <ChipGroup label="Группы деталей" scroll className="mb-3">
        <Chip active={active === "popular"} onClick={() => pick("popular")}>
          Популярные <Count n={popularCount} active={active === "popular"} />
        </Chip>
        {favorites.ids.length ? (
          <Chip active={active === "favorites"} onClick={() => pick("favorites")}>
            <Icon name="heart" className="size-4" />
            Избранное <Count n={favorites.ids.length} active={active === "favorites"} />
          </Chip>
        ) : null}
        {groups.map((g) => (
          <Chip key={g.id} active={active === g.id} onClick={() => pick(g.id)}>
            {g.title} <Count n={g.count} active={active === g.id} />
          </Chip>
        ))}
      </ChipGroup>

      <p className="mb-4 text-[13px] text-muted" aria-live="polite">
        {group ? (
          <span title={group.titleZh} lang="ru">
            {group.description}.
          </span>
        ) : active === "favorites" ? (
          "Отмеченные детали хранятся только в этом браузере."
        ) : (
          badge.note + "."
        )}
      </p>

      <ul className="grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((item) => (
          <PartCard
            key={item.id}
            name={item.name}
            nameZh={item.nameZh}
            body={subject.body}
            zone={partZone(item.id, item.groupId)}
            badge={badge}
            href={href(item.id)}
            favorite={favorites.ids.includes(item.id)}
            onToggleFavorite={() => favorites.toggle(item.id)}
          />
        ))}
      </ul>
      {items.length > shown.length ? (
        <div className="mt-4 flex justify-center">
          <Button type="button" variant="light" onClick={() => setExpanded(true)}>
            Показать все {items.length}
            <Icon name="chevron-down" className="size-4" />
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function Count({ n, active }: { n: number; active: boolean }) {
  return <span className={active ? "font-medium text-on-strong/70" : "font-medium text-muted"}>{n}</span>;
}
