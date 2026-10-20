import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, safeFileName, sniffImage, validateImageUpload } from "@/lib/storage/images";

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const be32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
const withTail = (head: number[], tail = 32) => new Uint8Array([...head, ...new Array(tail).fill(0)]);

const JPEG = withTail([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, ...ascii("JFIF")]);
const PNG = withTail([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, ...ascii("IHDR")]);
const WEBP = withTail([...ascii("RIFF"), 0x24, 0, 0, 0, ...ascii("WEBPVP8 ")]);
const ftyp = (major: string, ...compatible: string[]) =>
  withTail([...be32(16 + 4 * compatible.length), ...ascii("ftyp"), ...ascii(major), 0, 0, 0, 0, ...compatible.flatMap(ascii)]);

describe("sniffImage", () => {
  it("detects JPEG, PNG and WebP by magic bytes", () => {
    expect(sniffImage(JPEG)).toBe("image/jpeg");
    expect(sniffImage(PNG)).toBe("image/png");
    expect(sniffImage(WEBP)).toBe("image/webp");
  });

  it("detects HEIC/HEIF from the ftyp brands", () => {
    expect(sniffImage(ftyp("heic", "mif1", "heic"))).toBe("image/heic");
    expect(sniffImage(ftyp("heix"))).toBe("image/heic");
    expect(sniffImage(ftyp("mif1", "heic"))).toBe("image/heic");
    expect(sniffImage(ftyp("heif"))).toBe("image/heic");
    expect(sniffImage(ftyp("msf1", "heif"))).toBe("image/heic");
  });

  it("rejects AVIF, video and other formats", () => {
    expect(sniffImage(ftyp("avif", "mif1", "miaf"))).toBeNull();
    expect(sniffImage(ftyp("mif1", "avif"))).toBeNull();
    expect(sniffImage(ftyp("isom", "iso2", "mp41"))).toBeNull();
    expect(sniffImage(ftyp("qt  "))).toBeNull();
    expect(sniffImage(withTail(ascii("GIF89a")))).toBeNull();
    expect(sniffImage(withTail(ascii("%PDF-1.7")))).toBeNull();
    expect(sniffImage(withTail([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WAVE")]))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
  });

  it("ignores brands outside the declared ftyp box", () => {
    // The box says 16 bytes (major brand + minor version only); "heic" right after it belongs to the next box.
    const bytes = withTail([...be32(16), ...ascii("ftyp"), ...ascii("isom"), 0, 0, 0, 0, ...ascii("heic")]);
    expect(sniffImage(bytes)).toBeNull();
  });

  it("does not trust the declared extension or a leading text prefix", () => {
    expect(sniffImage(new Uint8Array([0x20, ...JPEG]))).toBeNull();
    expect(sniffImage(withTail(ascii("<?xml version='1.0'?><svg>")))).toBeNull();
  });

  it("accepts Buffers and refuses non-byte input", () => {
    expect(sniffImage(Buffer.from(PNG))).toBe("image/png");
    expect(sniffImage(PNG.buffer as unknown as Uint8Array)).toBeNull();
    expect(sniffImage("\xff\xd8\xff" as unknown as Uint8Array)).toBeNull();
    expect(sniffImage(null as unknown as Uint8Array)).toBeNull();
  });

  it("handles truncated input", () => {
    expect(sniffImage(new Uint8Array())).toBeNull();
    expect(sniffImage(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(sniffImage(new Uint8Array([0, 0, 0, 0x18, ...ascii("ftyp")]))).toBeNull();
  });
});

describe("validateImageUpload", () => {
  it("accepts an image and trusts the bytes over the declared type", () => {
    const result = validateImageUpload({ bytes: JPEG, declaredMime: "image/png", size: JPEG.length, name: "фара.png" });
    expect(result).toEqual({ ok: true, mime: "image/jpeg", name: "фара.jpg" });
  });

  it("accepts HEIC sent without a type or as octet-stream", () => {
    const heic = ftyp("heic", "mif1");
    expect(validateImageUpload({ bytes: heic, declaredMime: "", size: heic.length, name: "IMG_0042.HEIC" })).toMatchObject({
      ok: true,
      mime: "image/heic",
      name: "IMG_0042.HEIC",
    });
    expect(
      validateImageUpload({ bytes: heic, declaredMime: "application/octet-stream", size: heic.length, name: "IMG_0042" }),
    ).toMatchObject({ ok: true, name: "IMG_0042.heic" });
  });

  it("refuses empty, oversized and partially uploaded files", () => {
    expect(validateImageUpload({ bytes: new Uint8Array(), size: 0, name: "a.jpg" })).toEqual({
      ok: false,
      mime: null,
      error: "Файл пустой. Выберите другое фото",
    });
    const big = new Uint8Array(MAX_IMAGE_BYTES + 1);
    big.set(JPEG);
    expect(validateImageUpload({ bytes: big, size: big.length, name: "big.jpg" }).error).toContain("больше 10 МБ");
    expect(validateImageUpload({ bytes: JPEG, size: MAX_IMAGE_BYTES + 1, name: "big.jpg" }).error).toContain("больше 10 МБ");
    expect(validateImageUpload({ bytes: JPEG, size: JPEG.length + 5, name: "a.jpg" }).error).toContain("не полностью");
  });

  it("reports a size that does not match the received bytes as a cut-off upload", () => {
    const partial = "Файл загрузился не полностью. Попробуйте ещё раз";
    expect(validateImageUpload({ bytes: JPEG, size: 0, name: "a.jpg" }).error).toBe(partial);
    expect(validateImageUpload({ bytes: JPEG, size: Number.NaN, name: "a.jpg" }).error).toBe(partial);
    expect(validateImageUpload({ bytes: JPEG, size: JPEG.length - 1, name: "a.jpg" }).error).toBe(partial);
    expect(validateImageUpload({ bytes: "x" as unknown as Uint8Array, size: 1 }).error).toBe("Файл пустой. Выберите другое фото");
  });

  it("names a photo without a usable name", () => {
    expect(validateImageUpload({ bytes: PNG, size: PNG.length })).toMatchObject({ ok: true, name: "photo.png" });
    expect(validateImageUpload({ bytes: PNG, size: PNG.length, name: "../.." })).toMatchObject({ name: "photo.png" });
    expect(validateImageUpload({ bytes: WEBP, size: WEBP.length, name: "Toyota 2.5" })).toMatchObject({
      name: "Toyota 2.5.webp",
    });
    expect(validateImageUpload({ bytes: WEBP, size: WEBP.length, name: "evil.php" })).toMatchObject({ name: "evil.webp" });
  });

  it("accepts exactly 10 MB", () => {
    const max = new Uint8Array(MAX_IMAGE_BYTES);
    max.set(PNG);
    expect(validateImageUpload({ bytes: max, size: max.length, name: "scan.png" }).ok).toBe(true);
  });

  it("refuses files that are not photos", () => {
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    const notPhoto = "Можно загрузить только фото: JPG, PNG, WebP или HEIC";
    expect(validateImageUpload({ bytes: html, declaredMime: "image/jpeg", size: html.length, name: "x.jpg" }).error).toBe(notPhoto);
    expect(validateImageUpload({ bytes: JPEG, declaredMime: "text/html", size: JPEG.length, name: "x.html" }).error).toBe(notPhoto);
    expect(validateImageUpload({ bytes: JPEG, declaredMime: "application/pdf", size: JPEG.length, name: "x.pdf" }).ok).toBe(false);
    const svg = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg' onload='alert(1)'/>");
    expect(validateImageUpload({ bytes: svg, declaredMime: "image/svg+xml", size: svg.length, name: "a.svg" }).error).toBe(notPhoto);
    const gif = withTail(ascii("GIF89a"));
    expect(validateImageUpload({ bytes: gif, declaredMime: "image/gif", size: gif.length, name: "a.gif" }).error).toBe(notPhoto);
  });
});

describe("safeFileName", () => {
  it("strips directories and path traversal", () => {
    expect(safeFileName("../../etc/passwd")).toBe("passwd");
    expect(safeFileName("C:\\Users\\Asel\\Desktop\\фото фары.jpg")).toBe("фото фары.jpg");
    expect(safeFileName("..")).toBe("file");
    expect(safeFileName("/")).toBe("file");
  });

  it("removes control, reserved and bidi characters", () => {
    expect(safeFileName("bad\u0000name\r\n.jpg")).toBe("bad name .jpg");
    expect(safeFileName('a<b>c:"d|e?f*.png')).toBe("a b c d e f .png");
    expect(safeFileName("photo\u202Egpj.exe")).toBe("photo gpj.exe");
    expect(safeFileName("photo\u2067gpj.exe\u2069")).toBe("photo gpj.exe");
    expect(safeFileName("a\u200Bb\u061Cc\u2028d\uFEFF.png")).toBe("a b c d .png");
    expect(safeFileName(".htaccess")).toBe("htaccess");
    expect(safeFileName("CON.jpg")).toBe("_CON.jpg");
    expect(safeFileName("  spaced   out  .png  ")).toBe("spaced out .png");
  });

  it("keeps Cyrillic and Chinese names", () => {
    expect(safeFileName("刹车片 前.jpg")).toBe("刹车片 前.jpg");
    expect(safeFileName("Колодки передние.webp")).toBe("Колодки передние.webp");
  });

  it("limits length and keeps the extension", () => {
    const long = "я".repeat(300) + ".jpeg";
    const safe = safeFileName(long);
    expect(Array.from(safe).length).toBe(100);
    expect(safe.endsWith(".jpeg")).toBe(true);
    expect(Array.from(safeFileName("😀".repeat(150))).length).toBe(100);
    // A cut that lands on dots or spaces must not leave "name..jpg" behind.
    const cut = safeFileName("a".repeat(94) + " . . . . . . .jpg");
    expect(cut).toBe("a".repeat(94) + ".jpg");
  });

  it("uses the fallback for empty names", () => {
    expect(safeFileName("")).toBe("file");
    expect(safeFileName(null as unknown as string, "photo")).toBe("photo");
  });
});
