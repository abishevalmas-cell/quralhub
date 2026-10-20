// Links inside the garage catalog browser. Pure, so server and client components can share them.
//
// /garage/[id]/catalog?level=N&parent=P  lists the groups of level N under group P (level 1 has no parent).
// /garage/[id]/catalog?level=N&code=C    shows the parts of the last-level group C.
// trail carries the names of the groups above for the breadcrumbs only; the catalog is read by level and code.

export const MAX_LEVEL = 4;
const MAX_CRUMB_NAME = 80;
const MAX_CODE = 160;

export type Crumb = { code: string; name: string; level: number };

export function parseTrail(raw: string | string[] | undefined): Crumb[] {
  if (typeof raw !== "string" || !raw || raw.length > 4000) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data) || data.length > MAX_LEVEL) return [];
    const crumbs: Crumb[] = [];
    for (const item of data) {
      if (!Array.isArray(item)) return [];
      const [code, name, level] = item as unknown[];
      if (typeof code !== "string" || typeof name !== "string" || !Number.isInteger(level)) return [];
      if (!code || code.length > MAX_CODE || (level as number) < 1 || (level as number) > MAX_LEVEL) return [];
      crumbs.push({ code, name: name.slice(0, MAX_CRUMB_NAME) || code, level: level as number });
    }
    return crumbs;
  } catch {
    return [];
  }
}

export const serializeTrail = (trail: Crumb[]) =>
  JSON.stringify(trail.slice(-MAX_LEVEL).map((c) => [c.code, c.name.slice(0, MAX_CRUMB_NAME), c.level]));

export function catalogHref(vehicleId: string, query: { level: number; parent?: string; code?: string; trail?: Crumb[] }): string {
  const params = new URLSearchParams({ level: String(query.level) });
  if (query.parent) params.set("parent", query.parent);
  if (query.code) params.set("code", query.code);
  if (query.trail?.length) params.set("trail", serializeTrail(query.trail));
  return `/garage/${encodeURIComponent(vehicleId)}/catalog?${params}`;
}

// A last-level group opens its parts; any other group opens the next level.
export function categoryHref(vehicleId: string, category: { code: string; name: string; level: number; last: boolean }, trail: Crumb[]) {
  const next = [...trail, { code: category.code, name: category.name, level: category.level }];
  if (category.last || category.level >= MAX_LEVEL)
    return catalogHref(vehicleId, { level: category.level, code: category.code, trail: next });
  return catalogHref(vehicleId, { level: category.level + 1, parent: category.code, trail: next });
}

// A crumb above the current page opens the list of groups inside it.
export const crumbHref = (vehicleId: string, trail: Crumb[], index: number) =>
  catalogHref(vehicleId, { level: trail[index].level + 1, parent: trail[index].code, trail: trail.slice(0, index + 1) });

export function requestHref(vehicleId: string, part?: { oe: string; name: string }): string {
  const params = new URLSearchParams({ vehicle: vehicleId });
  if (part?.oe) params.set("oe", part.oe);
  if (part?.name) params.set("title", part.name.slice(0, 200));
  return `/requests/new?${params}`;
}
