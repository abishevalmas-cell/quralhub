import { PART_TYPES } from "./parts";
import { isPlacementWord } from "./placement";
import { hasCjk, normalizeText, STOPWORDS, toWord, tokenize, wordQuality, type Word } from "./text";
import type { PartType } from "./types";

export interface PartMatch {
  partType: PartType;
  // Higher is better; roughly the number of matched letters plus a bonus per extra phrase word.
  score: number;
  // The dictionary entry (synonym, name or EPC hint) that matched.
  matched: string;
}

const MAX_MATCHES = 5;
const MAX_TOKENS = 40;
// A phrase may have up to two unrelated words inside it: "поворотник на левом зеркале".
const PHRASE_SLACK = 2;
const PHRASE_BONUS = 3;
// Words after "с", "без", "для", "под" describe the part instead of naming it: "бампер с парктрониками"
// is a bumper, "лобовое стекло с камерой" is a windshield. They may complete a phrase but add no score,
// and a match made of such words alone is kept only as a low-ranked alternative.
const MODIFIER_PREPOSITIONS = new Set(["с", "со", "без", "для", "под"]);
const MODIFIER_ONLY = 0.1;
// When no phrase matches completely, one word of a phrase still suggests candidates: "фильтр" lists
// the filters, "датчик" the sensors. Such matches score at half weight.
const PARTIAL = 0.5;
const PARTIAL_MIN_WEIGHT = 5;

interface Term {
  source: string;
  words: Word[];
}

interface IndexedPart {
  part: PartType;
  terms: Term[];
  cjk: string[];
}

interface QueryToken extends Word {
  modifier: boolean;
  placement: boolean;
}

interface Hit {
  score: number;
  matched: string;
}

let index: IndexedPart[] | null = null;

const contentWords = (normalized: string) => tokenize(normalized).filter((t) => !STOPWORDS.has(t));

// Chinese is written without spaces and often mixed with Latin: "ABS泵", "VVT电磁阀".
const compact = (s: string) => normalizeText(s).replace(/ /g, "");

// Names are written for people: "Пневмобаллон (пневмостойка)" means either word, and
// "Направляющая (уплотнитель) стекла" means "направляющая стекла" or "уплотнитель стекла".
function nameVariants(name: string): string[] {
  const m = /^(.*?)\s*\(([^)]*)\)\s*(.*)$/.exec(name);
  if (!m) return [name];
  const [, before, inside, after] = m;
  return [`${before} ${after}`.trim(), after ? `${inside} ${after}` : inside];
}

function buildIndex(): IndexedPart[] {
  return PART_TYPES.map((part) => {
    const names = [part.ru, part.en].flatMap(nameVariants);
    const terms: Term[] = [];
    const cjk: string[] = [];
    const seen = new Set<string>();
    for (const source of [part.zh, ...part.synonyms, ...names, ...part.epcHints]) {
      if (!source) continue;
      if (hasCjk(source)) {
        cjk.push(compact(source));
        continue;
      }
      const words = contentWords(normalizeText(source));
      const key = words.join(" ");
      if (!words.length || seen.has(key)) continue;
      seen.add(key);
      terms.push({ source, words: words.map(toWord) });
    }
    return { part, terms, cjk };
  });
}

function queryTokens(normalized: string): QueryToken[] {
  const tokens: QueryToken[] = [];
  let modifier = false;
  for (const t of tokenize(normalized)) {
    // A leading "с" ("с камерой зеркало") has nothing to modify yet.
    if (MODIFIER_PREPOSITIONS.has(t)) {
      if (tokens.length) modifier = true;
      continue;
    }
    if (STOPWORDS.has(t)) continue;
    tokens.push({ ...toWord(t), modifier, placement: isPlacementWord(t) });
    if (tokens.length >= MAX_TOKENS) break;
  }
  return tokens;
}

const weight = (w: Word) => (w.text.length <= 3 ? w.text.length + 1 : w.stem.length);

// Best assignment of distinct query tokens to all words of the term within a compact window.
function matchTerm(term: Term, tokens: QueryToken[]): number {
  const n = term.words.length;
  const candidates = term.words.map((w) =>
    tokens.map((t, j) => ({ j, q: wordQuality(t, w) })).filter((c) => c.q > 0),
  );
  if (candidates.some((c) => !c.length)) return 0;
  const used: number[] = [];
  let best = 0;
  const visit = (i: number, head: number, heads: number, mod: number, lo: number, hi: number) => {
    if (i === n) {
      let total = MODIFIER_ONLY * mod;
      if (heads) {
        const ordered = used.every((j, k) => k === 0 || j > used[k - 1]);
        total = head + PHRASE_BONUS * (heads - 1) + (heads > 1 && ordered ? 0.5 : 0);
      }
      if (total > best) best = total;
      return;
    }
    for (const { j, q } of candidates[i]) {
      if (used.includes(j)) continue;
      const nlo = Math.min(lo, j);
      const nhi = Math.max(hi, j);
      if (nhi - nlo + 1 > n + PHRASE_SLACK) continue;
      const s = q * weight(term.words[i]);
      used.push(j);
      if (tokens[j].modifier) visit(i + 1, head, heads, mod + s, nlo, nhi);
      else visit(i + 1, head + s, heads + 1, mod, nlo, nhi);
      used.pop();
    }
  };
  visit(0, 0, 0, 0, Infinity, -Infinity);
  return best;
}

function matchPartial(entry: IndexedPart, tokens: QueryToken[]): Hit | null {
  let best: Hit | null = null;
  for (const term of entry.terms) {
    if (term.words.length < 2) continue;
    for (const w of term.words) {
      if (weight(w) < PARTIAL_MIN_WEIGHT) continue;
      for (const t of tokens) {
        // "передний левый" alone must not suggest "рычаг передней подвески".
        if (t.placement) continue;
        const q = wordQuality(t, w);
        if (q < 0.9) continue;
        const score = PARTIAL * q * weight(w) * (t.modifier ? MODIFIER_ONLY : 1);
        if (!best || score > best.score) best = { score, matched: term.source };
      }
    }
  }
  return best;
}

function matchCjk(entry: IndexedPart, cjkQuery: string): Hit | null {
  let best: Hit | null = null;
  for (const term of entry.cjk) {
    let score = 0;
    if (cjkQuery.includes(term)) score = 3 * term.length;
    else if (cjkQuery.length >= 2 && term.includes(cjkQuery)) score = 2 * cjkQuery.length;
    if (score && (!best || score > best.score)) best = { score, matched: term };
  }
  return best;
}

const toMatches = (hits: [IndexedPart, Hit][]): PartMatch[] =>
  hits
    .map(([entry, hit]) => ({ partType: entry.part, score: Math.round(hit.score * 100) / 100, matched: hit.matched }))
    // Array.prototype.sort is stable, so equal scores keep dictionary order.
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MATCHES);

export interface Ranking {
  matches: PartMatch[];
  // True when no phrase matched completely and the matches are guesses from one word ("фильтр").
  partial: boolean;
}

// Ranks part types for free text. The text is normalized here, so raw input is fine.
export function rankParts(text: string): Ranking {
  index ??= buildIndex();
  const normalized = normalizeText(text);
  const tokens = queryTokens(normalized);
  const cjkQuery = hasCjk(normalized) ? compact(normalized) : "";
  if (!tokens.length && !cjkQuery) return { matches: [], partial: false };
  const hits: [IndexedPart, Hit][] = [];
  for (const entry of index) {
    let best: Hit | null = null;
    for (const term of tokens.length ? entry.terms : []) {
      const score = matchTerm(term, tokens);
      if (score > 0 && (!best || score > best.score)) best = { score, matched: term.source };
    }
    const cjk = cjkQuery ? matchCjk(entry, cjkQuery) : null;
    if (cjk && (!best || cjk.score > best.score)) best = cjk;
    if (best) hits.push([entry, best]);
  }
  if (hits.length || !tokens.length) return { matches: toMatches(hits), partial: false };
  for (const entry of index) {
    const partial = matchPartial(entry, tokens);
    if (partial) hits.push([entry, partial]);
  }
  return { matches: toMatches(hits), partial: hits.length > 0 };
}

export const matchParts = (text: string): PartMatch[] => rankParts(text).matches;
