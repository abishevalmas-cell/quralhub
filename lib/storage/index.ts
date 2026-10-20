import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredObject = { bytes: Uint8Array; mime: string };

export interface Storage {
  put(key: string, bytes: Uint8Array, mime: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIME_RE = /^[a-z0-9][a-z0-9!#$&^_.+-]{0,63}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,63}$/;

export const isStorageKey = (key: unknown): key is string => typeof key === "string" && UUID_RE.test(key);

export const newStorageKey = () => randomUUID();

// Keys become file names, so only generated UUIDs are accepted: nothing else can reach outside the root.
function assertKey(key: string): string {
  if (!isStorageKey(key)) throw new Error("Invalid storage key");
  return key.toLowerCase();
}

function assertMime(mime: string): string {
  const value = String(mime ?? "").trim().toLowerCase();
  if (!MIME_RE.test(value)) throw new Error("Invalid MIME type");
  return value;
}

const isNotFound = (error: unknown) => (error as NodeJS.ErrnoException)?.code === "ENOENT";

// The stored mime becomes the Content-Type when the file is served, so it is re-checked on the way out too.
function parseMeta(text: string): { mime: string; size: number } | null {
  try {
    const meta = JSON.parse(text) as { mime?: unknown; size?: unknown };
    const mime = typeof meta?.mime === "string" ? meta.mime : "";
    const size = meta?.size;
    if (!MIME_RE.test(mime) || typeof size !== "number" || !Number.isSafeInteger(size) || size < 0) return null;
    return { mime, size };
  } catch {
    return null;
  }
}

async function writeAtomic(file: string, data: Uint8Array | string) {
  const tmp = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(tmp, data);
    await rename(tmp, file);
  } catch (error) {
    await rm(tmp, { force: true });
    throw error;
  }
}

export function createLocalStorage(root: string): Storage {
  const base = path.resolve(root);
  // Two-character shards keep directories small once there are many thousands of photos.
  const locate = (key: string) => {
    const dir = path.join(base, key.slice(0, 2));
    return { dir, data: path.join(dir, key), meta: path.join(dir, `${key}.json`) };
  };

  return {
    async put(rawKey, bytes, rawMime) {
      const key = assertKey(rawKey);
      const mime = assertMime(rawMime);
      if (!(bytes instanceof Uint8Array)) throw new Error("Storage expects bytes");
      const file = locate(key);
      await mkdir(file.dir, { recursive: true });
      await writeAtomic(file.data, bytes);
      // Metadata goes last: an object without it is treated as missing, so a crash mid-write is invisible.
      await writeAtomic(file.meta, JSON.stringify({ mime, size: bytes.byteLength }));
    },

    async get(rawKey) {
      const key = assertKey(rawKey);
      const file = locate(key);
      let metaText: string;
      let data: Buffer;
      try {
        metaText = await readFile(file.meta, "utf8");
        data = await readFile(file.data);
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
      // Each file is replaced atomically and keys are fresh UUIDs written once, so a bad sidecar or a size mismatch
      // means the object was damaged or changed outside the app. Serving it with a wrong type would be worse than failing.
      const meta = parseMeta(metaText);
      if (!meta || meta.size !== data.byteLength) throw new Error("Damaged storage object");
      return { bytes: new Uint8Array(data.buffer, data.byteOffset, data.byteLength), mime: meta.mime };
    },

    async delete(rawKey) {
      const key = assertKey(rawKey);
      const file = locate(key);
      await rm(file.meta, { force: true });
      await rm(file.data, { force: true });
    },
  };
}

export const uploadDir = () => path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), ".data", "uploads"));

let cached: { root: string; storage: Storage } | undefined;

export function getStorage(): Storage {
  const root = uploadDir();
  if (!cached || cached.root !== root) cached = { root, storage: createLocalStorage(root) };
  return cached.storage;
}
