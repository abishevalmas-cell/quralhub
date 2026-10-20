import { useCallback, useSyncExternalStore } from "react";

// Parts the visitor marked with the heart, per car, in this browser only. Every storage call may throw (private
// mode, blocked storage); the marks then live in memory until the page is reloaded.

const PREFIX = "tetix:favorites:";
export const FAVORITES_MAX = 200;
const ID = /^[a-z0-9-]{1,64}$/;

const memory = new Map<string, string>();
const listeners = new Set<() => void>();

/** Stored text → part type ids; anything unreadable is dropped. */
export function parseFavorites(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return [...new Set(data.filter((id): id is string => typeof id === "string" && ID.test(id)))].slice(0, FAVORITES_MAX);
  } catch {
    return [];
  }
}

/** The list after one tap on the heart: added to the front, or removed. */
export function toggleFavorite(list: readonly string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [id, ...list].slice(0, FAVORITES_MAX);
}

function read(key: string): string {
  try {
    return window.localStorage.getItem(PREFIX + key) ?? memory.get(key) ?? "";
  } catch {
    return memory.get(key) ?? "";
  }
}

function write(key: string, list: string[]) {
  const value = JSON.stringify(list);
  memory.set(key, value);
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    // Kept in memory only.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(PREFIX)) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The car's favorites and a toggle. The server render and hydration see none, then the stored ones apply. */
export function useFavorites(carKey: string): { ids: string[]; toggle: (id: string) => void } {
  // The raw string is the snapshot: it is stable between renders, unlike a parsed array.
  const raw = useSyncExternalStore(subscribe, () => read(carKey), () => "");
  const ids = parseFavorites(raw);
  const toggle = useCallback((id: string) => write(carKey, toggleFavorite(parseFavorites(read(carKey)), id)), [carKey]);
  return { ids, toggle };
}
