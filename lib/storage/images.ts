export const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;
export type ImageMime = (typeof IMAGE_MIMES)[number];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const EXTENSIONS: Record<ImageMime, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/heic": ["heic", "heif"],
};

const HEIF_BRANDS = new Set(["heic", "heix", "mif1", "heif"]);
// AVIF shares the HEIF container and often lists mif1, but it is a different codec we do not accept.
const AVIF_BRANDS = new Set(["avif", "avis"]);

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

const startsWith = (bytes: Uint8Array, signature: number[]) =>
  bytes.length >= signature.length && signature.every((b, i) => bytes[i] === b);

function ftypBrands(bytes: Uint8Array): string[] | null {
  if (bytes.length < 12 || ascii(bytes, 4, 4) !== "ftyp") return null;
  const boxSize = ((bytes[0] << 24) >>> 0) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3];
  const end = Math.min(bytes.length, boxSize >= 16 ? boxSize : 16, 256);
  const brands = [ascii(bytes, 8, 4)];
  for (let offset = 16; offset + 4 <= end; offset += 4) brands.push(ascii(bytes, offset, 4));
  return brands;
}

// The browser-declared type and the file extension are user input; only the leading bytes decide the type.
export function sniffImage(bytes: Uint8Array): ImageMime | null {
  if (!(bytes instanceof Uint8Array)) return null;
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  const brands = ftypBrands(bytes);
  if (brands && !brands.some((b) => AVIF_BRANDS.has(b)) && brands.some((b) => HEIF_BRANDS.has(b))) return "image/heic";
  return null;
}

// Characters that break paths or headers, plus invisible and bidi characters used to disguise extensions
// ("photo\u202Egpj.exe" displays as "photoexe.jpg"): zero-width marks, Arabic letter mark, line/paragraph
// separators, bidi embeddings, overrides and isolates, word joiners and the BOM.
const UNSAFE_CHARS = /[\u0000-\u001f\u007f-\u009f<>:"/\\|?*\u061c\u180e\u200b-\u200f\u2028-\u202e\u2060-\u2064\u2066-\u206f\ufeff]/g;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i;
const MAX_NAME_CHARS = 100;

export function safeFileName(name: string, fallback = "file"): string {
  const raw = String(name ?? "").normalize("NFC");
  const last = raw.split(/[/\\]/).pop() ?? "";
  let clean = last.replace(UNSAFE_CHARS, " ").replace(/\s+/g, " ").trim().replace(/^[.\s]+|[.\s]+$/g, "");
  if (!clean) return fallback;
  if (WINDOWS_RESERVED.test(clean)) clean = "_" + clean;
  const chars = Array.from(clean);
  if (chars.length <= MAX_NAME_CHARS) return clean;
  const dot = clean.lastIndexOf(".");
  const ext = dot > 0 ? Array.from(clean.slice(dot)) : [];
  const keepExt = ext.length > 1 && ext.length <= 10 ? ext : [];
  const base = Array.from(keepExt.length ? clean.slice(0, dot) : clean);
  const cut = base.slice(0, MAX_NAME_CHARS - keepExt.length).join("").replace(/[.\s]+$/, "");
  return cut ? cut + keepExt.join("") : fallback;
}

// The stored name gets the extension of the real type, so a renamed JPEG downloads as .jpg.
function nameWithExtension(name: string, mime: ImageMime): string {
  const clean = safeFileName(name, "photo");
  const dot = clean.lastIndexOf(".");
  const ext = dot > 0 ? clean.slice(dot + 1).toLowerCase() : "";
  if (EXTENSIONS[mime].includes(ext)) return clean;
  const base = dot > 0 && /^(?=.*[a-z])[a-z0-9]{2,5}$/i.test(ext) ? clean.slice(0, dot) : clean;
  return safeFileName(`${base}.${EXTENSIONS[mime][0]}`, `photo.${EXTENSIONS[mime][0]}`);
}

export type ImageUpload = { bytes: Uint8Array; declaredMime?: string | null; size: number; name?: string | null };
export type ImageValidation =
  | { ok: true; mime: ImageMime; name: string; error?: undefined }
  | { ok: false; mime: null; error: string };

const fail = (error: string): ImageValidation => ({ ok: false, mime: null, error });

export function validateImageUpload({ bytes, declaredMime, size, name }: ImageUpload): ImageValidation {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) return fail("Файл пустой. Выберите другое фото");
  if (bytes.byteLength > MAX_IMAGE_BYTES || size > MAX_IMAGE_BYTES)
    return fail("Фото больше 10 МБ. Сожмите его или выберите другое");
  // `size` is what the browser reported; fewer bytes than that means the upload was cut off.
  if (size !== bytes.byteLength) return fail("Файл загрузился не полностью. Попробуйте ещё раз");
  const declared = String(declaredMime ?? "").trim().toLowerCase();
  // Phones often send HEIC as an empty type or octet-stream; anything else that is not an image is refused outright.
  if (declared && declared !== "application/octet-stream" && !declared.startsWith("image/"))
    return fail("Можно загрузить только фото: JPG, PNG, WebP или HEIC");
  const mime = sniffImage(bytes);
  if (!mime) return fail("Можно загрузить только фото: JPG, PNG, WebP или HEIC");
  return { ok: true, mime, name: nameWithExtension(name ?? "", mime) };
}
