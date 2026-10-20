import { BRANDS, childBrands, getBrand } from "./brands";
import { MODEL_ROWS } from "./data/models";
import { compact, latinPrefixes, rawTokens, spans, tokens } from "./text";
import type { Brand, BrandId, CarModel } from "./types";

export { BRANDS, childBrands, getBrand } from "./brands";
export {
  BODY_TYPES,
  BRAND_IDS,
  CAR_COLOR_IDS,
  ENGINE_POWERTRAINS,
  HV_POWERTRAINS,
  MARKETS,
  MARKET_LABELS,
  PLUG_IN_POWERTRAINS,
  POWERTRAINS,
  POWERTRAIN_LABELS,
  type BodyType,
  type Brand,
  type BrandId,
  type CarColorId,
  type CarModel,
  type CatalogStatus,
  type Market,
  type Powertrain,
} from "./types";

// The catalog is shared by every request in the process, so a caller must not be able to change it.
function freeze(model: CarModel): CarModel {
  Object.freeze(model.aliases);
  Object.freeze(model.powertrains);
  Object.freeze(model.popularIn);
  return Object.freeze(model);
}

export const MODELS: readonly CarModel[] = Object.freeze(MODEL_ROWS.map(freeze));

const BY_ID = new Map(MODELS.map((m) => [m.id, m]));
const ORDER = new Map(MODELS.map((m, i) => [m.id, i]));

export function getModel(id: string | null | undefined): CarModel | null {
  return (id && BY_ID.get(id)) || null;
}

/** Models of exactly this brand, most common first. Sub-brands (Haval under Great Wall) have their own id. */
export function modelsByBrand(brandId: string | null | undefined): CarModel[] {
  return MODELS.filter((m) => m.brandId === brandId);
}

/** "BYD Song Plus DM-i". */
export const modelTitle = (model: Pick<CarModel, "brand" | "model">) => `${model.brand} ${model.model}`;

/** "с 2021" or "2016–2022". */
export const modelYears = (model: Pick<CarModel, "yearFrom" | "yearTo">) =>
  model.yearTo === null ? `с ${model.yearFrom}` : `${model.yearFrom}–${model.yearTo}`;

const unique = (list: string[]) => [...new Set(list.filter(Boolean))];

const MODEL_VARIANTS = new Map(
  MODELS.map((m) => [m.id, unique([m.model, m.modelZh ?? "", ...m.aliases].map(compact))] as const),
);
const BRAND_VARIANTS = new Map(BRANDS.map((b) => [b.id, unique([b.name, b.nameZh, ...b.aliases].map(compact))] as const));

/** Comparable forms of a model's names (model, Chinese name, aliases), as used by findModel. */
export function modelVariants(model: CarModel): readonly string[] {
  return MODEL_VARIANTS.get(model.id) ?? [];
}

const longestIn = (variants: readonly string[], found: Set<string>, minLength = 1) =>
  variants.reduce((best, v) => (v.length >= minLength && v.length > best && found.has(v) ? v.length : best), 0);

function brandHits(found: Set<string>): Map<BrandId, number> {
  const hits = new Map<BrandId, number>();
  for (const brand of BRANDS) {
    const length = longestIn(BRAND_VARIANTS.get(brand.id) ?? [], found);
    if (length) hits.set(brand.id, length);
  }
  return hits;
}

/** The brand named in a decoded or typed string; null when none or when two unrelated brands tie. */
export function findBrand(text: string | null | undefined): Brand | null {
  const hits = brandHits(spans(tokens(text)));
  // A sub-brand wins over its group: "Changan Deepal" is a Deepal, "Great Wall Haval" is a Haval.
  for (const id of [...hits.keys()]) {
    const parent = getBrand(id)?.parent;
    if (parent) hits.delete(parent);
  }
  if (!hits.size) return null;
  const best = Math.max(...hits.values());
  const top = [...hits].filter(([, length]) => length === best);
  return top.length === 1 ? getBrand(top[0][0]) : null;
}

function parseYear(year: number | string | null | undefined): number | null {
  const match = /(19|20)\d{2}/.exec(String(year ?? ""));
  return match ? Number(match[0]) : null;
}

// 2: the year is inside the model's range; 1: one year off (model year vs build date); 0: outside; null: unknown.
function yearFit(model: CarModel, year: number | null): number | null {
  if (year === null) return null;
  const to = model.yearTo ?? Infinity;
  if (year >= model.yearFrom && year <= to) return 2;
  return year >= model.yearFrom - 1 && year <= to + 1 ? 1 : 0;
}

// Without a known brand only long, distinctive names count: "Monjaro" yes, "L6" or "001" no.
const BRANDLESS_MIN_LENGTH = 4;

// Words of a decode that never name the model: engine size ("1.5L", "2.0TD"), seats ("6 seats", "7座"), a year
// and the drive ("4WD", "4x4").
const NOT_MODEL = [
  /\d[.,]\d\s*[a-z]*/gi,
  /\b\d+\s*(seats?|seater|мест\S*)/gi,
  /\d+\s*座/g,
  /\b(19|20)\d{2}\b/g,
  /\b([24]wd|4x[24])\b/gi,
];

// A word right after a matched name that makes it another model: "Coupe" (H6 Coupe), "e+" (Tiggo 8 Pro e+).
const OTHER_MODEL_WORDS = new Set(["coupe", "e"]);
// Words that are a model of their own in some brands (Tiggo 8 → Tiggo 8 Pro, CS55 → CS55 Plus) and a trim in
// others (Li L9 Pro). They make a match unsafe only in a brand whose model names use them.
const SUFFIX_WORDS = new Set(["plus", "pro", "max", "l", "s"]);

type Candidate = { model: CarModel; length: number; fit: number };

const byRank = (a: Candidate, b: Candidate) =>
  b.length - a.length ||
  b.fit - a.fit ||
  Number(b.model.popular) - Number(a.model.popular) ||
  (ORDER.get(a.model.id) ?? 0) - (ORDER.get(b.model.id) ?? 0);

/** Where a glued name occurs in a token list: [first, last] token indexes of each occurrence. */
function occurrences(list: readonly string[], variant: string): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < list.length; i++) {
    let joined = "";
    for (let j = i; j < list.length && joined.length < variant.length; j++) {
      joined += list[j];
      if (joined === variant) out.push([i, j]);
    }
  }
  return out;
}

const NAME_WORDS = new Map(
  MODELS.map((m) => [m.id, new Set([m.model, ...m.aliases].flatMap((name) => tokens(name).slice(1)))] as const),
);

/**
 * True when the text goes on with a model code after the matched name, so it names another model that only starts
 * the same way: "Seal 05" is not the Seal, "Emgrand X7" not the Emgrand, "Tiggo 8 Pro e+" not the Tiggo 8 Pro.
 * Tokens covered by another name of the same model or by the brand ("Yuan UP/Atto 2", "Galaxy E5/EX5") are skipped.
 */
function continuesWithCode(list: readonly string[], model: CarModel, longest: number, pool: readonly CarModel[], brandForms: readonly string[]): boolean {
  const covered = new Set<number>();
  const cover = (variant: string) => {
    for (const [a, b] of occurrences(list, variant)) for (let k = a; k <= b; k++) covered.add(k);
  };
  for (const v of modelVariants(model)) cover(v);
  for (const v of brandForms) cover(v);
  const familyWords = new Set(pool.flatMap((m) => [...(NAME_WORDS.get(m.id) ?? [])]));
  const unsafeAfter = (end: number) => {
    let k = end + 1;
    while (k < list.length && covered.has(k)) k++;
    const next = list[k];
    if (next === undefined) return false;
    const after = list[k + 1];
    if (/^\d+$/.test(next)) return true;
    if (/^[a-z]{1,3}$/.test(next) && after !== undefined && /^\d+$/.test(after)) return true;
    if (OTHER_MODEL_WORDS.has(next)) return true;
    return SUFFIX_WORDS.has(next) && familyWords.has(next) && !(NAME_WORDS.get(model.id)?.has(next) ?? false);
  };
  const ends = modelVariants(model)
    .filter((v) => v.length === longest)
    .flatMap((v) => occurrences(list, v).map(([, b]) => b));
  return ends.length > 0 && ends.every(unsafeAfter);
}

/**
 * The catalog model behind a decoded or typed brand and model, e.g. ("BYD", "Song Plus New Energy DM-i") →
 * byd-song-plus-dmi, ("Geely Galaxy", "Galaxy E5/EX5") → geely-galaxy-e5. The longest matching name wins, so
 * "Tiggo 7 Pro Max" is not taken for "Tiggo 7 Pro"; the year breaks ties between generations. Returns null for an
 * unknown brand or model, for a year outside the model's years, and for a name that goes on with a model code the
 * catalog does not have ("Seal 05", "Emgrand X7", "H6 Coupe"). The result picks an illustration and an assortment;
 * it never confirms a fitment.
 */
export function findModel(
  brand: string | null | undefined,
  modelText: string | null | undefined,
  year?: number | string | null,
): CarModel | null {
  const cleaned = NOT_MODEL.reduce((text, re) => text.replace(re, " "), String(modelText ?? ""));
  const list = tokens(`${brand ?? ""} ${cleaned}`);
  if (!list.length) return null;
  const found = spans(list);
  const hits = brandHits(found);
  let pool: readonly CarModel[] = MODELS;
  const family = new Set<BrandId>();
  if (hits.size) {
    for (const id of hits.keys()) {
      family.add(id);
      for (const child of childBrands(id)) family.add(child.id);
    }
    pool = MODELS.filter((m) => family.has(m.brandId));
  } else if (tokens(brand).length) {
    // A brand we do not know: never guess a model of another brand.
    return null;
  }
  const minLength = hits.size ? 1 : BRANDLESS_MIN_LENGTH;
  const y = parseYear(year);
  const ranked = pool
    .map((model) => ({ model, length: longestIn(modelVariants(model), found, minLength), fit: yearFit(model, y) }))
    // A known year more than one year outside the model's years is another generation or another car.
    .filter((c) => c.length > 0 && c.fit !== 0)
    .map((c): Candidate => ({ ...c, fit: c.fit ?? 0 }))
    .sort(byRank);
  if (!ranked.length) return null;
  const [first, second] = ranked;
  if (!hits.size && second && first.length === second.length && first.fit === second.fit && first.model.brandId !== second.model.brandId) {
    return null;
  }
  const brandIds = family.size ? [...family] : [first.model.brandId];
  const brandForms = brandIds.flatMap((id) => BRAND_VARIANTS.get(id) ?? []);
  const familyPool = family.size ? pool : MODELS.filter((m) => m.brandId === first.model.brandId);
  return continuesWithCode(list, first.model, first.length, familyPool, brandForms) ? null : first.model;
}

type SearchWords = { model: Set<string>; brand: Set<string> };

const SEARCH_WORDS = new Map(
  MODELS.map((m) => {
    const brand = getBrand(m.brandId);
    const words = (names: string[]) => new Set(names.flatMap((n) => tokens(n)));
    const entry: SearchWords = {
      model: words([m.model, m.modelZh ?? "", ...m.aliases]),
      brand: words([brand?.name ?? "", brand?.nameZh ?? "", ...(brand?.aliases ?? [])]),
    };
    return [m.id, entry] as const;
  }),
);

const startsAny = (words: Set<string>, prefix: string) => [...words].some((w) => w.startsWith(prefix));

// A word of the model name counts more than a word of the brand: "galaxy" finds Galaxy models before other Geely.
// Only the last word may be unfinished; a single letter elsewhere must match exactly, so "т2" is not "Tiggo 2".
function wordScore(words: SearchWords, option: string, last: boolean): number {
  if (words.model.has(option)) return 3;
  if (words.brand.has(option)) return 2;
  if (!last && option.length < 2) return 0;
  if (startsAny(words.model, option)) return 1;
  return startsAny(words.brand, option) ? 0.5 : 0;
}

/**
 * Models for a search box: every word of the query must start a word of the model or brand name, in Latin,
 * Chinese or common Russian spelling ("тигго 7 про", "宋", "monj"). Exact names rank first, then popular models.
 */
export function searchModels(query: string | null | undefined, limit = 20): CarModel[] {
  const alternatives = rawTokens(query).map(latinPrefixes);
  if (!alternatives.length) return [];
  const whole = compact(query);
  const scored: { model: CarModel; score: number }[] = [];
  for (const model of MODELS) {
    const words = SEARCH_WORDS.get(model.id);
    if (!words) continue;
    let score = 0;
    for (const [index, options] of alternatives.entries()) {
      const best = Math.max(...options.map((o) => wordScore(words, o, index === alternatives.length - 1)));
      if (!best) {
        score = 0;
        break;
      }
      score += best;
    }
    if (!score) continue;
    const brandForms = BRAND_VARIANTS.get(model.brandId) ?? [];
    const names = modelVariants(model).flatMap((v) => [v, ...brandForms.map((b) => b + v)]);
    if (names.includes(whole)) score += 10;
    else if (whole.length >= 2 && names.some((n) => n.startsWith(whole))) score += 4;
    scored.push({ model, score });
  }
  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.model.popular) - Number(a.model.popular) ||
        (ORDER.get(a.model.id) ?? 0) - (ORDER.get(b.model.id) ?? 0),
    )
    .slice(0, Math.max(0, limit))
    .map((s) => s.model);
}
