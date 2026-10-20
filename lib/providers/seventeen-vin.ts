import "server-only";
import { createHash } from "node:crypto";
import {
  PROVIDER_MESSAGE_MAX,
  categoriesFailure,
  decodeFailure,
  partsFailure,
  type CatalogPart,
  type CategoriesInput,
  type CategoriesResult,
  type Category,
  type DecodeResult,
  type PartsInput,
  type PartsProvider,
  type PartsResult,
  type ProviderMeta,
  type ProviderResult,
  type ProviderStatus,
  type VehicleCandidate,
} from "./types";
import {
  OE_HINT,
  VIN_HINT,
  isValidEpc,
  isValidLevel,
  maskVin,
  maskVinsIn,
  normalizeCode,
  normalizeOe,
  normalizeOeInput,
  normalizeVinInput,
} from "./validate";

export const ENDPOINT_17VIN = "https://api.17vin.com:8443";
export const TIMEOUT_MS_17VIN = 20_000;
export const MAX_RESPONSE_BYTES_17VIN = 2_000_000;

const IMAGE_ORIGIN = "https://images.17vin.com";
const IMAGE_HOSTS = ["resource.17vin.com", "images.17vin.com"];
const OK_MESSAGE = "Ответ 17VIN. Применяемость проверяет специалист";
const NO_NAME = "Название не предоставлено";

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

const md5 = (value: string) => createHash("md5").update(value, "utf8").digest("hex");

// 17VIN signing: token = md5(md5(user) + md5(password) + path with query), appended after the query.
export function sign17(pathWithQuery: string, user: string, password: string): string {
  const token = md5(md5(user) + md5(password) + pathWithQuery);
  return ENDPOINT_17VIN + pathWithQuery + "&user=" + encodeURIComponent(user) + "&token=" + token;
}

export function path17(epc: string, params: [string, string][]): string {
  return "/" + epc + "?" + params.map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&");
}

type Raw = Record<string, unknown>;
const isRecord = (value: unknown): value is Raw => typeof value === "object" && value !== null && !Array.isArray(value);

// Normalized answers are stored in provider_cache (jsonb). Postgres rejects NUL and lone surrogates there,
// so a paid answer carrying one would never be cached; slicing must not split a surrogate pair either.
function text(value: unknown, max = 500): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const clean = String(value)
    .toWellFormed()
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim();
  if (clean.length <= max) return clean;
  const end = /[\uD800-\uDBFF]/.test(clean[max - 1]) ? max - 1 : max;
  return clean.slice(0, end).trimEnd();
}

// Codes are sent back to 17VIN on the next request, so they are taken exactly or rejected, never trimmed to fit.
const codeOf = (value: unknown) => normalizeCode(typeof value === "number" ? String(value) : value);

const pick = (x: Raw, ...keys: string[]) => keys.map((k) => x[k]).find((v) => text(v) !== "");
const nameOf = (x: Raw) => text(pick(x, "name_en", "Part_name_en", "name_zh", "Part_name_zh", "std_name_en", "std_name_zh"));

function fitOf(value: unknown): boolean | null {
  if (value === 1 || value === "1" || value === true) return true;
  if (value === 0 || value === "0" || value === false) return false;
  return null;
}

export type ImageKind = "diagram" | "vehicle" | "part";

// Only images.17vin.com is allowed. Diagrams are relative to img/{epc}/, vehicle photos to img/car/all/.
export function image17(value: unknown, kind: ImageKind, epc?: string): string | null {
  const raw = text(value, 1000).replaceAll("\\", "/").split(",")[0].trim();
  if (!raw) return null;
  if (raw.includes("..") || raw.includes("?") || raw.includes("#")) return null;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (!IMAGE_HOSTS.includes(url.hostname) || url.username || url.password || url.port) return null;
      return url.pathname.length > 1 ? IMAGE_ORIGIN + url.pathname : null;
    } catch {
      return null;
    }
  }
  // Protocol-relative URLs and other schemes (javascript:, data:) point elsewhere.
  if (raw.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(raw)) return null;
  if (kind === "diagram" && !isValidEpc(epc)) return null;
  const prefix = kind === "vehicle" ? "img/car/all/" : kind === "part" ? "" : `img/${epc}/`;
  // raw comes from text(), which already repaired lone surrogates, so encodeURIComponent cannot throw here.
  const path = (prefix + raw.replace(/^\/+/, "")).split("/").map(encodeURIComponent).join("/");
  return IMAGE_ORIGIN + "/" + path;
}

const meta = (status: ProviderStatus, message: string, providerCode?: number): ProviderMeta => ({
  status,
  message,
  source: "provider",
  ...(providerCode !== undefined ? { providerCode } : {}),
});
const malformed = (message: string) => meta("malformed", message);

// Enough to mask every VIN in the part that can survive the final cap: a masked VIN is shorter than the original.
const MESSAGE_SCAN = 4000;

// The provider's own msg is kept for diagnostics. It can echo the request, so every VIN-shaped token and any
// other run of 17 or more letters and digits (a VIN glued to other text, a token) is masked before it is kept.
export function providerMessageOf(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const scanned = text(value.slice(0, MESSAGE_SCAN), MESSAGE_SCAN);
  const masked = maskVinsIn(scanned).replace(/[A-Za-z0-9]{17,}/g, (run) => maskVin(run.toUpperCase()));
  return text(masked, PROVIDER_MESSAGE_MAX) || undefined;
}

const withMessage = <T extends ProviderMeta>(result: T, providerMessage: string | undefined): T =>
  providerMessage ? { ...result, providerMessage } : result;

// 1006 is documented as an internal error, but 17VIN answers it with msg "query no result" when nothing is found.
const NO_RESULT_RE = /query\s*no\s*result/i;

const CODES: Record<number, [ProviderStatus, string]> = {
  0: ["empty", "17VIN: нет данных либо неизвестная ошибка поставщика (код 0)"],
  1001: ["invalid", "17VIN отклонил параметры запроса (код 1001)"],
  1002: ["auth", "17VIN требует авторизации (код 1002)"],
  1003: ["unsupported", "17VIN не поддерживает каталог этой марки (код 1003)"],
  1004: ["auth", "17VIN отклонил подпись запроса (код 1004)"],
  1005: ["quota_or_expired", "Лимит 17VIN исчерпан либо доступ истёк (код 1005)"],
  1006: ["provider_error", "17VIN: нет результата или внутренняя ошибка (код 1006)"],
  1007: ["unsupported", "Метод 17VIN пока недоступен (код 1007)"],
};

export function providerCodeMeta(code: number, providerMessage?: string): ProviderMeta {
  if (code === 1006 && providerMessage && NO_RESULT_RE.test(providerMessage))
    return meta("empty", "17VIN: по запросу ничего не найдено (код 1006)", code);
  const known = CODES[code];
  return known ? meta(known[0], known[1], code) : meta("provider_error", `Неизвестный код 17VIN: ${code}`, code);
}

type Envelope = { ok: true; data: unknown; providerMessage?: string } | { ok: false; meta: ProviderMeta };

function envelope(raw: unknown): Envelope {
  if (!isRecord(raw)) return { ok: false, meta: malformed("Некорректная структура ответа 17VIN") };
  const providerMessage = providerMessageOf(raw.msg);
  const code = typeof raw.code === "string" && /^\d{1,9}$/.test(raw.code) ? Number(raw.code) : raw.code;
  // provider_calls.provider_code is a 32-bit integer; anything outside that range is not a real 17VIN code.
  if (typeof code !== "number" || !Number.isInteger(code) || Math.abs(code) > 2_147_483_647)
    return { ok: false, meta: withMessage(malformed("Некорректная структура ответа 17VIN"), providerMessage) };
  if (code !== 1) return { ok: false, meta: withMessage(providerCodeMeta(code, providerMessage), providerMessage) };
  return { ok: true, data: raw.data, ...(providerMessage ? { providerMessage } : {}) };
}

function candidateOf(m: Raw, index: number): VehicleCandidate {
  return {
    id: text(pick(m, "Js_id", "Id"), 80) || `candidate-${index + 1}`,
    brand: text(pick(m, "Brand_en", "Brand")),
    model: text(pick(m, "Model_en", "Model")),
    year: text(m.Model_year, 10),
    version: text(pick(m, "Sales_version_en", "Sales_version")),
    // "Model_detial_en" and "Fule_type_en" are the provider's own spellings.
    description: text(pick(m, "Model_detail_en", "Model_detial_en", "Model_detail"), 1000),
    engine: text(pick(m, "Engine_no_en", "Engine_no"), 100),
    fuel: text(pick(m, "Fuel_type_en", "Fule_type_en", "Fuel_type"), 100),
    drive: text(pick(m, "Driving_mode_en", "Driving_mode"), 100),
    epcId: text(m.Epc_id, 80),
    image: image17(m.Img_adress, "vehicle"),
  };
}

export function normalizeDecode(raw: unknown): DecodeResult {
  const env = envelope(raw);
  if (!env.ok) return decodeFailure(env.meta);
  const d = env.data;
  const fail = (message: string) => decodeFailure(withMessage(malformed(message), env.providerMessage));
  if (!isRecord(d) || !Array.isArray(d.model_list)) return fail("В ответе VIN нет списка моделей");
  if (d.model_list.length > 500) return fail("Слишком много вариантов модели");
  // Ids must be unique, or choosing one trim would silently select another one with the same id.
  const seen = new Set<string>();
  const candidates = d.model_list.filter(isRecord).map((m, i) => {
    const candidate = candidateOf(m, i);
    const base = candidate.id;
    for (let n = i + 1; seen.has(candidate.id); n++) candidate.id = `${base}-${n}`;
    seen.add(candidate.id);
    return candidate;
  });
  // Checked untrimmed: cutting an over-long value to 60 characters could produce a valid but wrong catalog.
  const epc = typeof d.epc === "string" ? d.epc.trim() : "";
  const ambiguous = candidates.length > 1;
  return {
    ...meta(candidates.length ? "success" : "empty", candidates.length ? OK_MESSAGE : "17VIN не нашёл модель по этому VIN", 1),
    ...(ambiguous ? { message: "Ответ 17VIN: несколько комплектаций. Выберите свою или оставьте проверку специалисту" } : {}),
    ...(env.providerMessage ? { providerMessage: env.providerMessage } : {}),
    ...(isValidEpc(epc) ? { epc } : {}),
    ...(text(d.epc_id, 80) ? { epcId: text(d.epc_id, 80) } : {}),
    ...(text(d.matching_mode, 80) ? { matchingMode: text(d.matching_mode, 80) } : {}),
    ...(text(d.build_date, 30) ? { buildDate: text(d.build_date, 30) } : {}),
    ...(text(pick(d, "made_in_en", "made_in_cn"), 80) ? { manufacturedIn: text(pick(d, "made_in_en", "made_in_cn"), 80) } : {}),
    candidates,
    ambiguous,
  };
}

export function normalizeCategories(raw: unknown, epc: string): CategoriesResult {
  const env = envelope(raw);
  if (!env.ok) return categoriesFailure(env.meta);
  const d = env.data;
  const fail = (message: string) => categoriesFailure(withMessage(malformed(message), env.providerMessage));
  if (!isRecord(d) || !Array.isArray(d.catalist)) return fail("В ответе нет списка групп");
  if (d.catalist.length > 3000) return fail("Слишком много групп в ответе");
  const categories: Category[] = [];
  for (const x of d.catalist) {
    const code = isRecord(x) ? codeOf(x.cata_code) : null;
    const level = isRecord(x) ? Number(x.cata_level) : NaN;
    if (!isRecord(x) || !code || !isValidLevel(level)) return fail("Некорректные коды или уровни групп");
    categories.push({
      code,
      level,
      last: Number(x.is_last) === 1,
      name: nameOf(x) || code,
      remark: text(pick(x, "remark_en", "remark_zh"), 1000),
      diagram: image17(x.illustration_img_address, "diagram", epc),
      providerFit: fitOf(x.is_fit_for_this_vin ?? x.Is_fit_for_this_vin),
    });
  }
  return withMessage(
    { ...meta(categories.length ? "success" : "empty", categories.length ? OK_MESSAGE : "17VIN не вернул групп", 1), categories },
    env.providerMessage,
  );
}

function partOf(x: Raw, epc: string | undefined, groupDiagram: unknown): CatalogPart {
  const oe = text(pick(x, "partnumber_original", "Partnumber_Original", "partnumber", "Partnumber"), 100);
  return {
    oe,
    normalizedOe: normalizeOe(oe),
    name: nameOf(x) || NO_NAME,
    nameZh: text(pick(x, "name_zh", "Part_name_zh")),
    engineerPartNumber: text(x.engineer_partnumber, 160),
    modelOptional: text(x.model_optional, 1000),
    modelNotOptional: text(x.model_not_optional, 1000),
    callout: text(x.callout, 50),
    quantity: text(x.qty, 50),
    remark: text(pick(x, "remark_en", "remark_zh"), 1000),
    replacement: text(x.replacement, 1000),
    beginDate: text(x.begin_date, 30),
    endDate: text(x.end_date, 30),
    diagram: epc ? image17(text(x.illustration_img_address) || groupDiagram, "diagram", epc) : null,
    image: image17(x.Part_img, "part"),
    providerFit: fitOf(x.is_fit_for_this_vin ?? x.Is_fit_for_this_vin),
    compatibility: "requires_review",
  };
}

function partsResult(items: unknown, epc: string | undefined, groupDiagram: unknown, providerMessage?: string): PartsResult {
  const fail = (message: string) => partsFailure(withMessage(malformed(message), providerMessage));
  if (!Array.isArray(items)) return fail("В ответе нет списка деталей");
  if (items.length > 3000) return fail("Слишком много деталей в ответе");
  // A row without an OE number cannot confirm a fit, and its empty normalizedOe would "match" a request without OE.
  const parts = items
    .filter(isRecord)
    .map((x) => partOf(x, epc, groupDiagram))
    .filter((part) => part.normalizedOe !== "");
  return withMessage(
    { ...meta(parts.length ? "success" : "empty", parts.length ? OK_MESSAGE : "17VIN не вернул деталей", 1), parts },
    providerMessage,
  );
}

export function normalizeParts(raw: unknown, epc: string): PartsResult {
  const env = envelope(raw);
  if (!env.ok) return partsFailure(env.meta);
  const d = env.data;
  return isRecord(d)
    ? partsResult(d.partlist, epc, d.imgaddress, env.providerMessage)
    : partsFailure(withMessage(malformed("В ответе нет списка деталей"), env.providerMessage));
}

export function normalizeOeSearch(raw: unknown): PartsResult {
  const env = envelope(raw);
  return env.ok ? partsResult(env.data, undefined, undefined, env.providerMessage) : partsFailure(env.meta);
}

type Transport = { ok: true; raw: unknown } | { ok: false; meta: ProviderMeta };

function httpMeta(status: number): ProviderMeta {
  if (status === 429) return meta("rate_limit", "17VIN ограничил частоту запросов (HTTP 429). Повторите позже");
  if (status === 401 || status === 403) return meta("auth", `17VIN отклонил доступ (HTTP ${status})`);
  if (status === 502 || status === 503 || status === 504) return meta("network", `17VIN временно недоступен (HTTP ${status})`);
  return meta("provider_error", `17VIN вернул HTTP ${status}`);
}

class Deadline extends Error {}

// One attempt only: 17VIN calls are paid, so failures are reported, never retried here.
export async function fetch17(url: string, fetcher: FetchLike, timeoutMs: number, maxBytes: number): Promise<Transport> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  // The deadline also covers fetchers that ignore the abort signal and the time spent reading the body.
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Deadline());
    }, timeoutMs);
  });
  deadline.catch(() => undefined);
  const race = <T>(promise: Promise<T>) => Promise.race([promise, deadline]);
  const tooLarge = { ok: false as const, meta: malformed(`Ответ 17VIN больше ${(maxBytes / 1e6).toLocaleString("ru-RU")} МБ`) };
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await race(
      fetcher(url, {
        signal: controller.signal,
        redirect: "error",
        // A signed URL must never land in the Next.js data cache: it carries the token and the answer is paid.
        cache: "no-store",
        headers: { accept: "application/json" },
      }),
    );
    if (!response.ok) {
      response.body?.cancel().catch(() => undefined);
      return { ok: false, meta: httpMeta(response.status) };
    }
    const declared = Number(response.headers.get("content-length") ?? NaN);
    if (Number.isFinite(declared) && declared > maxBytes) {
      response.body?.cancel().catch(() => undefined);
      return tooLarge;
    }
    reader = response.body?.getReader();
    if (!reader) return { ok: false, meta: malformed("Пустой ответ 17VIN") };
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const chunk = await race(reader.read());
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) {
        reader.cancel().catch(() => undefined);
        controller.abort();
        return tooLarge;
      }
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(size);
    let at = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, at);
      at += chunk.byteLength;
    }
    try {
      // TextDecoder drops a leading UTF-8 byte order mark, so a BOM-prefixed answer still parses.
      return { ok: true, raw: JSON.parse(new TextDecoder().decode(bytes)) };
    } catch {
      return { ok: false, meta: malformed("17VIN вернул некорректный JSON") };
    }
  } catch (error) {
    // A fetcher that ignores the abort signal would otherwise keep the stream open after the deadline.
    reader?.cancel().catch(() => undefined);
    // The original error is not echoed: it can contain the signed URL with the token.
    if (error instanceof Deadline || controller.signal.aborted)
      return { ok: false, meta: meta("timeout", `17VIN не ответил за ${Math.round(timeoutMs / 1000)} с. Повтор не выполнялся`) };
    return { ok: false, meta: meta("network", "Не удалось соединиться с 17VIN. Автоматический повтор отключён") };
  } finally {
    clearTimeout(timer);
  }
}

export const VIN_DIRECT_METHODS = [5101, 5102, 5103, 5104, 5105] as const;
export type VinDirectMethod = (typeof VIN_DIRECT_METHODS)[number];
export type VinDirectResult = ProviderResult<{ categories: Category[]; parts: CatalogPart[] }>;

export type SeventeenVinOptions = {
  user: string;
  password: string;
  fetch?: FetchLike;
  timeoutMs?: number;
  maxBytes?: number;
};

const invalid = (message: string) => meta("invalid", message);

export class SeventeenVinProvider implements PartsProvider {
  readonly name = "17vin";
  readonly mode = "live" as const;
  // ES private fields keep credentials out of JSON.stringify and console output.
  readonly #user: string;
  readonly #password: string;
  readonly #fetch: FetchLike;
  readonly #timeoutMs: number;
  readonly #maxBytes: number;

  constructor(options: SeventeenVinOptions) {
    this.#user = options.user;
    this.#password = options.password;
    this.#fetch = options.fetch ?? ((url, init) => fetch(url, init));
    this.#timeoutMs = options.timeoutMs ?? TIMEOUT_MS_17VIN;
    this.#maxBytes = options.maxBytes ?? MAX_RESPONSE_BYTES_17VIN;
  }

  async decodeVin(input: string): Promise<DecodeResult> {
    const vin = normalizeVinInput(input);
    if (!vin) return decodeFailure(invalid(VIN_HINT));
    const sent = await this.#send(path17("", [["vin", vin]]));
    return sent.ok ? normalizeDecode(sent.raw) : decodeFailure(sent.meta);
  }

  async categories(input: CategoriesInput): Promise<CategoriesResult> {
    const vin = normalizeVinInput(input.vin);
    const parent = input.level > 1 ? normalizeCode(input.parentCode) : null;
    if (!vin || !isValidEpc(input.epc) || !isValidLevel(input.level) || (input.level > 1 && !parent))
      return categoriesFailure(invalid("Некорректный VIN, каталог или группа"));
    const params: [string, string][] = [
      ["action", `cata${input.level}`],
      ["vin", vin],
    ];
    if (input.level === 2 && parent) params.push(["cata1_code", parent]);
    if (input.level === 3 && parent) params.push(["cata2_code", parent]);
    // Method 5104 (cata4 + cata3_code) is seen in a third-party client, not yet in the official docs.
    if (input.level === 4 && parent) params.push(["cata3_code", parent]);
    const sent = await this.#send(path17(input.epc, params));
    return sent.ok ? normalizeCategories(sent.raw, input.epc) : categoriesFailure(sent.meta);
  }

  async parts(input: PartsInput): Promise<PartsResult> {
    const vin = normalizeVinInput(input.vin);
    const code = normalizeCode(input.categoryCode);
    if (!vin || !isValidEpc(input.epc) || !isValidLevel(input.level) || !code)
      return partsFailure(invalid("Некорректный VIN, каталог или группа"));
    const sent = await this.#send(
      path17(input.epc, [
        ["action", "part"],
        ["vin", vin],
        ["last_cata_code", code],
        ["last_cata_code_level", String(input.level)],
      ]),
    );
    return sent.ok ? normalizeParts(sent.raw, input.epc) : partsFailure(sent.meta);
  }

  async searchOe(input: string): Promise<PartsResult> {
    const oe = normalizeOeInput(input);
    if (!oe) return partsFailure(invalid(OE_HINT));
    const sent = await this.#send(
      path17("", [
        ["action", "search_epc"],
        ["query_part_number", oe],
        ["query_match_type", "exact"],
      ]),
    );
    return sent.ok ? normalizeOeSearch(sent.raw) : partsFailure(sent.meta);
  }

  // EXTENSION POINT: VIN-direct catalog methods 5101–5105.
  // On 2026-10-12 17VIN said the catalog can be read directly by VIN through methods 5101–5105, so choosing one
  // trim must never block catalog access. The request format (path, action names, parameters) is not confirmed
  // yet, so this stub sends nothing and reports not_configured. Once confirmed: build the path with path17(),
  // send it through this.#send() and add a normalizer next to normalizeCategories()/normalizeParts().
  async vinDirect(method: VinDirectMethod, input: { vin: string; code?: string }): Promise<VinDirectResult> {
    const label = `${method}${input.code ? "/" + input.code : ""}`;
    return {
      ...meta("not_configured", `Метод 17VIN ${label} ещё не подключён: формат запроса не подтверждён поставщиком`),
      categories: [],
      parts: [],
    };
  }

  async #send(path: string): Promise<Transport> {
    if (!this.#user || !this.#password) return { ok: false, meta: meta("not_configured", "Доступ к 17VIN не настроен на сервере") };
    return fetch17(sign17(path, this.#user, this.#password), this.#fetch, this.#timeoutMs, this.#maxBytes);
  }
}
