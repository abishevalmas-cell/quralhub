import { useSyncExternalStore } from "react";

// The car the home search works for. Kept per browser in localStorage; every read and write may throw
// (private mode, blocked storage), and then the choice lives in memory until the page is reloaded.

const KEY = "tetix:active-vehicle";
const listeners = new Set<() => void>();
let memory: string | null = null;

function read(): string | null {
  try {
    return window.localStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setActiveVehicle(id: string) {
  memory = id;
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    // Kept in memory only.
  }
  for (const listener of listeners) listener();
}

// A stored id that is no longer in the garage (archived, another account on this browser) falls back to the
// newest car. That is a choice of car for the search, not of a trim: the customer sees it and can switch.
export function resolveActiveVehicle(stored: string | null, ids: readonly string[]): string | null {
  return stored && ids.includes(stored) ? stored : (ids[0] ?? null);
}

export function useActiveVehicle(ids: readonly string[]): string | null {
  // The server render and hydration use null, then the stored choice applies.
  const stored = useSyncExternalStore(subscribe, read, () => null);
  return resolveActiveVehicle(stored, ids);
}
