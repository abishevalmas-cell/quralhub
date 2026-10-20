import { getPartType, parseQuery, type Axis, type ParsedQuery, type PartType, type Side } from "@/lib/taxonomy";
import {
  VIN_LENGTH,
  WMI_TABLE,
  fromRussianLayout,
  hasUnmappedCyrillic,
  modelYear,
  normalizeVin,
  validateVin,
  wmiInfo,
  type VinIssue,
  type WmiConfidence,
} from "@/lib/vin";

// What the home search box understood from the input. Pure and client-safe: it runs on every keystroke.

export const SEARCH_MAX_LENGTH = 300;

export type VinView = {
  kind: "vin";
  // Normalized: uppercase, separators removed, Cyrillic lookalikes replaced.
  vin: string;
  length: number;
  complete: boolean;
  ok: boolean;
  // Length errors are held back while fewer than 17 characters are typed: the customer is still typing.
  errors: VinIssue[];
  warnings: VinIssue[];
  suggestions: string[];
  // From the WMI (positions 1–3): a hint, never the model. brands lists the options when the maker has several.
  maker: string | null;
  brands: string[];
  confidence: WmiConfidence | "unknown";
  china: boolean;
  year: number | null;
  // A part named next to the VIN ("фара LGX…"): it is ordered after the car is in the garage.
  part: PartType | null;
  // Short input that may be either the start of a VIN or a part number.
  oe: string | null;
};

export type OeView = { kind: "oe"; oe: string; part: PartType | null; axis: Axis | null; side: Side | null; text: string };

export type TextView = {
  kind: "text";
  text: string;
  matches: PartType[];
  // The best match when it is clearly ahead; null means the customer picks.
  preselected: string | null;
  axis: Axis | null;
  side: Side | null;
};

export type SearchView = { kind: "empty" } | VinView | OeView | TextView;

const MAX_MATCHES = 4;
const LATIN_VIN = /^[A-Z0-9]+$/;
const PLAIN = /^[\p{L}\p{N}\s]+$/u;
const LENGTH_ONLY = new Set(["length", "empty"]);

// The same rule as the request form: one generic word ("фильтр") or two close candidates means
// the customer has to say which part it is.
function preselect(parsed: ParsedQuery): string | null {
  const [top, second] = parsed.matches;
  if (!top) return null;
  const p = top.partType;
  const guessOnly =
    (p.needsAxis && !parsed.axis && !parsed.missing.includes("axis")) || (p.needsSide && !parsed.side && !parsed.missing.includes("side"));
  const close = Boolean(second && second.score >= top.score * 0.85);
  return guessOnly || close ? null : p.id;
}

// A VIN still being typed ("LGXTX…"): only the alphabet of a VIN and a known WMI at the start, so model names
// and part numbers with dashes stay text. A whole VIN typed on the Russian layout ("ДПЧ…") counts too.
function typedVin(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 40 || !PLAIN.test(trimmed)) return null;
  const compact = normalizeVin(trimmed);
  const length = [...compact].length;
  if (LATIN_VIN.test(compact) && length >= 3 && length <= VIN_LENGTH + 3 && Object.hasOwn(WMI_TABLE, compact.slice(0, 3)))
    return compact;
  if (hasUnmappedCyrillic(trimmed)) {
    const retyped = fromRussianLayout(trimmed);
    if (retyped.length === VIN_LENGTH && LATIN_VIN.test(retyped) && /\d/.test(retyped)) return trimmed;
  }
  return null;
}

function vinView(input: string, parsed: ParsedQuery, now: Date): VinView {
  const check = validateVin(input);
  const length = [...check.vin].length;
  const complete = length === VIN_LENGTH;
  const info = wmiInfo(check.vin);
  const typing = length < VIN_LENGTH;
  const preselected = preselect(parsed);
  return {
    kind: "vin",
    vin: check.vin,
    length,
    complete,
    ok: check.ok,
    errors: typing ? check.errors.filter((e) => !LENGTH_ONLY.has(e.code)) : check.errors,
    warnings: check.warnings,
    suggestions: check.suggestions.filter((s) => s !== check.vin),
    maker: info.brands.length === 1 ? info.brands[0] : info.maker,
    brands: info.brands.length > 1 ? info.brands : [],
    confidence: info.confidence,
    china: info.region === "China",
    year: complete ? modelYear(check.vin, now) : null,
    part: parsed.kind === "vin" && preselected ? getPartType(preselected) : null,
    oe: parsed.kind === "oe" ? (parsed.oe ?? null) : null,
  };
}

export function analyzeQuery(raw: string | null | undefined, now: Date = new Date()): SearchView {
  const input = String(raw ?? "").slice(0, SEARCH_MAX_LENGTH);
  const parsed = parseQuery(input);
  if (parsed.kind === "empty") return { kind: "empty" };
  if (parsed.kind === "vin") return vinView(parsed.vinCandidate ?? parsed.vinLike ?? input, parsed, now);
  const typed = typedVin(input);
  if (typed) return vinView(typed, parsed, now);
  const preselected = preselect(parsed);
  if (parsed.kind === "oe" && parsed.oe)
    return {
      kind: "oe",
      oe: parsed.oe,
      part: getPartType(preselected),
      axis: parsed.axis,
      side: parsed.side,
      text: parsed.text,
    };
  return {
    kind: "text",
    text: parsed.text,
    matches: parsed.matches.slice(0, MAX_MATCHES).map((m) => m.partType),
    preselected,
    axis: parsed.axis,
    side: parsed.side,
  };
}

export type MissingPlacement = { axis: boolean; side: boolean; hint: string | null };

// Same wording as the request form, so the customer reads the same reason in both places.
export function missingPlacement(part: PartType | null, axis: Axis | null, side: Side | null): MissingPlacement {
  const needAxis = Boolean(part?.needsAxis && !axis);
  const needSide = Boolean(part?.needsSide && !side);
  const hint =
    needAxis && needSide
      ? "Укажите ось и сторону: у передней и задней, левой и правой детали разные номера."
      : needAxis
        ? "Укажите ось: у передней и задней детали разные номера."
        : needSide
          ? "Укажите сторону: у левой и правой детали разные номера."
          : null;
  return { axis: needAxis, side: needSide, hint };
}
