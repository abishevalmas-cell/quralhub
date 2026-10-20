import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLocalStorage, getStorage, isStorageKey, newStorageKey, uploadDir } from "@/lib/storage";

let dir: string;
const previous = process.env.UPLOAD_DIR;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "tetix-uploads-"));
  process.env.UPLOAD_DIR = dir;
});

afterEach(async () => {
  if (previous === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = previous;
  await rm(dir, { recursive: true, force: true });
});

const bytes = (...values: number[]) => new Uint8Array(values);

async function listFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries.filter((e) => e.isFile()).map((e) => path.join(e.parentPath, e.name));
}

describe("local storage", () => {
  it("stores, reads and deletes an object under UPLOAD_DIR", async () => {
    const storage = getStorage();
    const key = newStorageKey();
    await storage.put(key, bytes(0xff, 0xd8, 0xff, 0x00, 0x01), "image/jpeg");

    const stored = await storage.get(key);
    expect(stored?.mime).toBe("image/jpeg");
    expect(Array.from(stored!.bytes)).toEqual([0xff, 0xd8, 0xff, 0x00, 0x01]);
    for (const file of await listFiles(dir)) expect(file.startsWith(dir + path.sep)).toBe(true);

    await storage.delete(key);
    expect(await storage.get(key)).toBeNull();
    expect(await listFiles(dir)).toEqual([]);
  });

  it("returns null for a missing key and ignores deleting it", async () => {
    const storage = getStorage();
    const key = newStorageKey();
    expect(await storage.get(key)).toBeNull();
    await expect(storage.delete(key)).resolves.toBeUndefined();
  });

  it("overwrites an existing key", async () => {
    const storage = getStorage();
    const key = newStorageKey();
    await storage.put(key, bytes(1, 2, 3), "image/png");
    await storage.put(key, bytes(4), "image/webp");
    const stored = await storage.get(key);
    expect(stored?.mime).toBe("image/webp");
    expect(Array.from(stored!.bytes)).toEqual([4]);
  });

  it("treats keys case-insensitively", async () => {
    const storage = getStorage();
    const key = newStorageKey();
    await storage.put(key.toUpperCase(), bytes(7), "image/png");
    expect((await storage.get(key))?.bytes.length).toBe(1);
  });

  it("rejects keys that are not UUIDs", async () => {
    const storage = getStorage();
    const bad = [
      "../../etc/passwd",
      "..",
      "",
      "a/b",
      "photo.jpg",
      newStorageKey() + "/../x",
      newStorageKey() + ".json",
      "..\\" + newStorageKey(),
      " " + newStorageKey(),
    ];
    for (const key of bad) {
      expect(isStorageKey(key)).toBe(false);
      await expect(storage.put(key, bytes(1), "image/png")).rejects.toThrow("Invalid storage key");
      await expect(storage.get(key)).rejects.toThrow("Invalid storage key");
      await expect(storage.delete(key)).rejects.toThrow("Invalid storage key");
    }
    expect(await listFiles(dir)).toEqual([]);
  });

  it("rejects malformed MIME types", async () => {
    const storage = getStorage();
    for (const mime of ["", "image", "image/png\r\nx-evil: 1", "../png", "text/html; charset=utf-8"]) {
      await expect(storage.put(newStorageKey(), bytes(1), mime)).rejects.toThrow("Invalid MIME type");
    }
  });

  it("shards files by the first two key characters and leaves no temp files", async () => {
    const key = newStorageKey();
    await getStorage().put(key, bytes(1, 2), "image/png");
    const files = (await listFiles(dir)).map((f) => path.relative(dir, f)).sort();
    expect(files).toEqual([path.join(key.slice(0, 2), key), path.join(key.slice(0, 2), `${key}.json`)]);
  });

  it("treats an object without metadata as missing (crash before the sidecar was written)", async () => {
    const key = newStorageKey();
    await mkdir(path.join(dir, key.slice(0, 2)), { recursive: true });
    await writeFile(path.join(dir, key.slice(0, 2), key), bytes(1, 2, 3));
    expect(await getStorage().get(key)).toBeNull();
  });

  it("refuses to serve an object with damaged metadata", async () => {
    const storage = getStorage();
    const key = newStorageKey();
    await storage.put(key, bytes(1, 2, 3), "image/png");
    const meta = path.join(dir, key.slice(0, 2), `${key}.json`);
    for (const content of ["{not json", JSON.stringify({ mime: "text/html\r\nx: 1", size: 3 }), JSON.stringify({ mime: "image/png" })]) {
      await writeFile(meta, content);
      await expect(storage.get(key)).rejects.toThrow("Damaged storage object");
    }
    await writeFile(meta, JSON.stringify({ mime: "image/png", size: 99 }));
    await expect(storage.get(key)).rejects.toThrow("Damaged storage object");
  });

  it("accepts Buffers and typed-array views, and refuses anything else", async () => {
    const storage = getStorage();
    const key = newStorageKey();
    const backing = new Uint8Array([9, 9, 1, 2, 3, 9]);
    await storage.put(key, backing.subarray(2, 5), "image/jpeg");
    expect(Array.from((await storage.get(key))!.bytes)).toEqual([1, 2, 3]);
    await storage.put(key, Buffer.from([4, 5]), "IMAGE/JPEG");
    expect(await storage.get(key)).toMatchObject({ mime: "image/jpeg" });
    await expect(storage.put(newStorageKey(), "text" as unknown as Uint8Array, "image/png")).rejects.toThrow("Storage expects bytes");
  });

  it("rejects keys that are not strings", async () => {
    const storage = getStorage();
    for (const key of [null, undefined, 42, {}, [newStorageKey()]]) {
      expect(isStorageKey(key)).toBe(false);
      await expect(storage.get(key as unknown as string)).rejects.toThrow("Invalid storage key");
    }
  });

  it("defaults to .data/uploads in the working directory", () => {
    delete process.env.UPLOAD_DIR;
    expect(uploadDir()).toBe(path.join(process.cwd(), ".data", "uploads"));
    process.env.UPLOAD_DIR = "relative/uploads";
    expect(uploadDir()).toBe(path.resolve("relative/uploads"));
  });

  it("follows UPLOAD_DIR changes and keeps instances separate", async () => {
    const other = await mkdtemp(path.join(os.tmpdir(), "tetix-uploads-"));
    try {
      const key = newStorageKey();
      await getStorage().put(key, bytes(1), "image/png");
      process.env.UPLOAD_DIR = other;
      expect(await getStorage().get(key)).toBeNull();
      expect(await createLocalStorage(dir).get(key)).not.toBeNull();
    } finally {
      await rm(other, { recursive: true, force: true });
    }
  });
});
