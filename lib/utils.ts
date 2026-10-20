export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export const formatKzt = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? "—" : Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ") + " ₸";

export const formatDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" }) : "—";

export const formatDateTime = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export const maskVin = (vin: string | null | undefined) => (vin && vin.length === 17 ? vin.slice(0, 3) + "…" + vin.slice(-4) : "—");

export function pluralRu(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
