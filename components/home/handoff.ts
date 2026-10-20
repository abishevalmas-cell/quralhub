import { SEARCH_MAX_LENGTH } from "./analyze";

// Hands the home search over to the next page.
// The query survives the login page in sessionStorage, never in the URL: it may hold a VIN.
// Picked photos wait in memory: module state survives client-side navigation (router.push and the login
// page's router.replace), not a reload, so whoever takes them must treat them as optional.

const QUERY_KEY = "tetix:search-query";
export const PENDING_PHOTOS_MAX = 10;

export function stashQuery(query: string) {
  try {
    const value = query.trim().slice(0, SEARCH_MAX_LENGTH);
    if (value) window.sessionStorage.setItem(QUERY_KEY, value);
    else window.sessionStorage.removeItem(QUERY_KEY);
  } catch {
    // Private mode or blocked storage: the customer types the query again after login.
  }
}

export function readStashedQuery(): string {
  try {
    return window.sessionStorage.getItem(QUERY_KEY)?.slice(0, SEARCH_MAX_LENGTH) ?? "";
  } catch {
    return "";
  }
}

export function clearStashedQuery() {
  try {
    window.sessionStorage.removeItem(QUERY_KEY);
  } catch {
    // Nothing to clear.
  }
}

let pendingPhotos: File[] = [];

export function stashPhotos(files: Iterable<File>) {
  pendingPhotos = Array.from(files)
    .filter((f) => !f.type || f.type.startsWith("image/"))
    .slice(0, PENDING_PHOTOS_MAX);
}

// For /requests/new?photo=1: a look without taking them, safe to call while rendering (StrictMode renders twice).
export const peekPendingPhotos = (): File[] => pendingPhotos.slice();

// Returns the photos once and forgets them.
export function takePendingPhotos(): File[] {
  const files = pendingPhotos;
  pendingPhotos = [];
  return files;
}

export const pendingPhotoCount = () => pendingPhotos.length;
