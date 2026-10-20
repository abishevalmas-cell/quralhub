import type { Axis, PartType, Side } from "@/lib/taxonomy";
import { safeNextPath } from "@/lib/utils";

// Links out of the home search box. A VIN never goes into a URL: URLs end up in logs and browser history.
// /requests/new reads vehicle, oe, title, part, axis, side and q (see requestDraftFromQuery).

export const REQUEST_Q_MAX = 300;
const TITLE_MAX = 160;

function withParams(path: string, params: [string, string | null | undefined][]): string {
  const search = new URLSearchParams();
  for (const [key, value] of params) if (value) search.set(key, value);
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

// Only same-site paths go into ?next= (see safeNextPath; the login page checks it again).
export const loginHref = (next: string) => `/login?next=${encodeURIComponent(safeNextPath(next))}`;

export const garageHref = (vehicleId: string) => `/garage/${encodeURIComponent(vehicleId)}`;
export const vehicleCatalogHref = (vehicleId: string) => `${garageHref(vehicleId)}/catalog`;

export const findForMeHref = (vehicleId: string | null) => withParams("/requests/new", [["vehicle", vehicleId]]);

type Placement = { axis?: Axis | null; side?: Side | null };

export function oeRequestHref(input: { vehicleId: string | null; oe: string; part?: PartType | null } & Placement): string {
  const oe = input.oe.trim().toUpperCase();
  return withParams("/requests/new", [
    ["vehicle", input.vehicleId],
    ["oe", oe],
    ["part", input.part?.id],
    ["axis", input.axis],
    ["side", input.side],
    ["title", (input.part?.ru ?? `Деталь по номеру ${oe}`).slice(0, TITLE_MAX)],
  ]);
}

// The raw query goes along as q, so the request form can recognise the part again if the customer edits the title.
export function partRequestHref(input: { vehicleId: string | null; part: PartType | null; q: string } & Placement): string {
  return withParams("/requests/new", [
    ["vehicle", input.vehicleId],
    ["part", input.part?.id],
    ["axis", input.part ? input.axis : null],
    ["side", input.part ? input.side : null],
    ["title", input.part?.ru],
    ["q", input.q.replace(/\s+/g, " ").trim().slice(0, REQUEST_Q_MAX)],
  ]);
}

// The request page creates the request first and then attaches the photos picked on the home page.
export function photoRequestHref(vehicleId: string | null, extra: [string, string | null | undefined][] = []): string {
  return withParams("/requests/new", [["vehicle", vehicleId], ...extra.filter(([key]) => key !== "vehicle" && key !== "photo"), ["photo", "1"]]);
}

// The query part of a request link, to carry what was typed over to the photo request.
export function requestParams(href: string): [string, string][] {
  const index = href.indexOf("?");
  return index < 0 ? [] : [...new URLSearchParams(href.slice(index + 1)).entries()];
}
