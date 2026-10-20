import { pluralRu } from "@/lib/utils";

// Pure helpers for sourcer screens; safe in server and client components.

export function formatAge(date: Date | string, now: Date | string): string {
  const minutes = Math.floor((new Date(now).getTime() - new Date(date).getTime()) / 60000);
  if (!Number.isFinite(minutes) || minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч`;
  const days = Math.floor(hours / 24);
  return `${days} ${pluralRu(days, "день", "дня", "дней")}`;
}

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// "1234.50" (the numeric column) → "1 234,50 ¥". A missing price stays a dash, never 0.
export function formatCny(value: string | null | undefined): string {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value ?? ""));
  if (!match) return "—";
  return `${group(match[1])},${(match[2] ?? "").padEnd(2, "0")} ¥`;
}

export function formatDays(min: number, max: number): string {
  const unit = (n: number) => pluralRu(n, "день", "дня", "дней");
  return min === max ? `${max} ${unit(max)}` : `${Math.min(min, max)}–${Math.max(min, max)} ${unit(Math.max(min, max))}`;
}
