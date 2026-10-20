import type { AssortmentGroup, CatalogIcon, DisplayGroupId } from "@/lib/catalog";

// Pure arrangement of the parts assortment for the grid: which cards a chip shows and in what order.

export type GridItem = { id: string; name: string; nameZh: string; icon: CatalogIcon; groupId: DisplayGroupId; popular: boolean };
export type GridFilter = "popular" | "favorites" | DisplayGroupId;

export const GRID_LIMIT = 12;

const toItem = (group: AssortmentGroup) => (item: AssortmentGroup["items"][number]): GridItem => ({
  id: item.id,
  name: item.name,
  nameZh: item.nameZh,
  icon: group.icon,
  groupId: group.id,
  popular: item.popular,
});

/** Popular parts of every group taken in turns (pads, filter, shock, bumper…), so the first row is varied. */
export function popularMix(groups: readonly AssortmentGroup[]): GridItem[] {
  const lists = groups.map((g) => g.items.filter((i) => i.popular).map(toItem(g)));
  const out: GridItem[] = [];
  const seen = new Set<string>();
  for (let round = 0; lists.some((l) => round < l.length); round++)
    for (const list of lists) {
      const item = list[round];
      if (item && !seen.has(item.id)) {
        seen.add(item.id);
        out.push(item);
      }
    }
  return out;
}

/** Every part of the assortment once, popular ones of each group first (the order assortmentFor gives). */
export function allItems(groups: readonly AssortmentGroup[]): GridItem[] {
  return groups.flatMap((g) => g.items.map(toItem(g)));
}

/** Cards for one chip. Favorites keep the order they were marked in, newest first. */
export function itemsFor(groups: readonly AssortmentGroup[], filter: GridFilter, favorites: readonly string[] = []): GridItem[] {
  if (filter === "popular") return popularMix(groups);
  if (filter === "favorites") {
    const byId = new Map(allItems(groups).map((i) => [i.id, i]));
    return favorites.map((id) => byId.get(id)).filter((i): i is GridItem => Boolean(i));
  }
  const group = groups.find((g) => g.id === filter);
  return group ? group.items.map(toItem(group)) : [];
}
