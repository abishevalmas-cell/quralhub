export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export const formatKzt = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? "—" : Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ") + " ₸";

// Every date on the site is shown in Kazakhstan time: one time zone, UTC+5, since March 2024. A fixed offset, so the
// server's time zone (UTC on most hosting) and its tz data do not matter, and server and browser print the same text.
export const ASTANA_OFFSET_MS = 5 * 3600 * 1000;
const inAstana = (d: Date | string) => new Date(new Date(d).getTime() + ASTANA_OFFSET_MS);

export const formatDate = (d: Date | string | null | undefined) =>
  d ? inAstana(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—";

export const formatDateTime = (d: Date | string | null | undefined) =>
  d ? inAstana(d).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) : "—";

// Brand and model in one line without saying the same word twice: "Deepal" + "Deepal S7" → "Deepal S7",
// "Geely Galaxy" + "Galaxy E5" → "Geely Galaxy E5". Catalogs often repeat the brand (or its end) in the model name.
export function brandModel(brand: string | null | undefined, model: string | null | undefined): string | null {
  const b = String(brand ?? "").trim().split(/\s+/).filter(Boolean);
  const m = String(model ?? "").trim().split(/\s+/).filter(Boolean);
  const same = (x: string[], y: string[]) => x.length === y.length && x.every((w, i) => w.toLowerCase() === y[i].toLowerCase());
  let overlap = 0;
  for (let n = Math.min(b.length, m.length); n > 0; n--)
    if (same(b.slice(b.length - n), m.slice(0, n))) {
      overlap = n;
      break;
    }
  return [...b, ...m.slice(overlap)].join(" ") || null;
}

export const maskVin = (vin: string | null | undefined) => (vin && vin.length === 17 ? vin.slice(0, 3) + "…" + vin.slice(-4) : "—");

export function pluralRu(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

// Only same-site paths are allowed after login. Browsers read "\" as "/" and drop tabs and newlines,
// so "/\evil.example" and "/\t/evil.example" would both lead to another site.
export function safeNextPath(next: unknown, fallback = "/"): string {
  if (typeof next !== "string" || next.length > 2048) return fallback;
  if (!/^\/(?![/\\])/.test(next) || /[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  return next;
}
