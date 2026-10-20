import { findVin, oePiece } from "./codes";
import { rankParts, type PartMatch } from "./match";
import { detectPlacement } from "./placement";
import { detectQty } from "./qty";
import { hasCjk, normalizeText, tokenize } from "./text";
import type { Axis, Position, Side } from "./types";

export { matchParts, type PartMatch } from "./match";

export type QueryKind = "empty" | "vin" | "oe" | "text";

export interface ParsedQuery {
  // "vin" when the input contains a VIN (possibly with text, e.g. "фара LGX…"), else "oe" when it contains
  // a part number, else "text". Matches, axis and side are filled from the remaining text in every case.
  // A "vin" query may carry only vinLike (a VIN with a typo), so check vinCandidate before using it.
  kind: QueryKind;
  // Whole input lowercased, ё→е, Kazakh/Uzbek letters folded, punctuation replaced by spaces.
  // It still contains the VIN: do not log it (CLAUDE.md, privacy).
  normalized: string;
  // Same as normalized, but without the VIN and OE tokens; this is what part matching ran on.
  text: string;
  // 17 characters of the ISO 3779 alphabet. The check digit is not verified here: use lib/vin.
  vinCandidate?: string;
  // 17 Latin letters and digits in one token that contain I, O or Q. Pass to validateVin() to explain the typo.
  vinLike?: string;
  oe?: string;
  matches: PartMatch[];
  axis: Axis | null;
  side: Side | null;
  position: Position | null;
  // For the best match: what the customer still has to tell us. Empty when the matches are only
  // guesses from one generic word ("фильтр"): first the customer has to say which part.
  missing: ("axis" | "side")[];
  qty: number | null;
}

// A search box query is a few words. Longer input is cut so a pasted page cannot slow the server down.
const MAX_INPUT = 1000;

const trimPunct = (s: string) => s.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

export function parseQuery(input: string | null | undefined): ParsedQuery {
  const raw = String(input ?? "")
    .slice(0, MAX_INPUT)
    .normalize("NFKC");
  const normalized = normalizeText(raw);
  const empty: ParsedQuery = {
    kind: "empty",
    normalized,
    text: normalized,
    matches: [],
    axis: null,
    side: null,
    position: null,
    missing: [],
    qty: null,
  };
  if (!normalized) return empty;

  const rawTokens = raw
    .split(/[\s,;:]+/)
    .map(trimPunct)
    .filter(Boolean);
  const vin = findVin(rawTokens);
  const consumed = new Set(vin.used);
  let oe: string | undefined;
  for (let i = 0; i < rawTokens.length && !oe; i++) {
    if (consumed.has(i)) continue;
    const piece = oePiece(rawTokens[i]);
    if (piece) {
      oe = piece;
      consumed.add(i);
    }
  }

  const rest = rawTokens.filter((_, i) => !consumed.has(i)).join(" ");
  const text = normalizeText(rest);
  const tokens = tokenize(text);
  const cjk = [...text].filter((c) => hasCjk(c)).join("");
  const { matches, partial } = rankParts(text);
  const { axis, side, position } = detectPlacement(tokens, cjk, rest);
  const best = partial ? undefined : matches[0]?.partType;
  const missing: ("axis" | "side")[] = [];
  if (best?.needsAxis && !axis) missing.push("axis");
  if (best?.needsSide && !side) missing.push("side");

  const result: ParsedQuery = {
    ...empty,
    kind: vin.vin || vin.vinLike ? "vin" : oe ? "oe" : "text",
    text,
    matches,
    axis,
    side,
    position,
    missing,
    qty: detectQty(tokens, raw),
  };
  if (vin.vin) result.vinCandidate = vin.vin;
  if (vin.vinLike) result.vinLike = vin.vinLike;
  if (oe) result.oe = oe;
  return result;
}
