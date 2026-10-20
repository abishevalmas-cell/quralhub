import type { Axis, Position, Side } from "./types";

// Tokens are normalized (see normalizeText): Kazakh "алдыңғы" arrives as "алдынгы", Uzbek "орқа" as "орка".
const FRONT =
  /^(передн(ий|яя|ее|юю|ей|его|ему|им|ем|ие|их|ими)?|перед|пер|спереди|передок|front|алдынгы|алдындагы|oldi|oldingi|old|олд|олди|олдинги|олдидаги)$/;
const REAR =
  /^(задн(ий|яя|ее|юю|ей|его|ему|им|ем|ие|их|ими)?|зад|сзади|rear|back|арткы|артындагы|orqa|orqadagi|орка|оркадаги)$/;
const LEFT = /^(лев(ый|ая|ое|ую|ой|ом|ого|ому|ые|ых|ым|ыми|о)?|слева|left|lh|chap|chapdagi|чап|чапдаги)$/;
const RIGHT = /^(прав(ый|ая|ое|ую|ой|ом|ого|ому|ые|ых|ым|ыми|о)?|справа|right|rh|ong|ongdagi|унг|унгдаги)$/;
// Seller shorthand: пл = передний левый, зп = задний правый. "з/п" and "п/л" arrive as two tokens.
const COMBINED: Record<string, [Axis, Side]> = {
  пл: ["front", "left"],
  лп: ["front", "left"],
  пп: ["front", "right"],
  зл: ["rear", "left"],
  лз: ["rear", "left"],
  зп: ["rear", "right"],
  fl: ["front", "left"],
  fr: ["front", "right"],
  rl: ["rear", "left"],
  rr: ["rear", "right"],
  "п л": ["front", "left"],
  "п п": ["front", "right"],
  "з л": ["rear", "left"],
  "з п": ["rear", "right"],
};
const POSITIONS: [Position, RegExp][] = [
  ["upper", /^(верхн\p{L}*|верх|сверху|upper|top)$/u],
  ["lower", /^(нижн\p{L}*|низ|снизу|lower|bottom)$/u],
  ["inner", /^(внутрен\p{L}*|изнутри|inner|inside)$/u],
  ["outer", /^(наружн\p{L}*|внешн\p{L}*|снаружи|outer|outside)$/u],
];
// "зеркало заднего вида", "фонарь заднего хода" say nothing about the axle.
const NOT_AXIS_AFTER = new Set(["вида", "хода", "ход"]);
// Kazakh "оң" (right) folds to "он", which is Russian "he", so it only counts when typed with ң.
const KAZAKH_RIGHT = /(^|[^\p{L}])оң($|[^\p{L}])/u;
// 后视镜 is a mirror ("rear-view"), 售后 is "after-sales": neither names an axle.
const ZH_FRONT = /(?<![售之然以最提目午])前/;
const ZH_REAR = /(?<![售之然以最午])后(?!视镜)/;

export function isPlacementWord(token: string): boolean {
  return (
    FRONT.test(token) ||
    REAR.test(token) ||
    LEFT.test(token) ||
    RIGHT.test(token) ||
    token in COMBINED ||
    POSITIONS.some(([, re]) => re.test(token))
  );
}

export interface Placement {
  axis: Axis | null;
  side: Side | null;
  position: Position | null;
}

const single = <T>(values: Set<T>): T | null => (values.size === 1 ? [...values][0] : null);

// Conflicting words ("левый и правый", 左右) leave the value null.
export function detectPlacement(tokens: string[], cjk: string, raw: string): Placement {
  const axes = new Set<Axis>();
  const sides = new Set<Side>();
  const positions = new Set<Position>();
  const addCombined = (key: string) => {
    const combined = COMBINED[key];
    if (!combined) return false;
    axes.add(combined[0]);
    sides.add(combined[1]);
    return true;
  };
  tokens.forEach((t, i) => {
    const next = tokens[i + 1] ?? "";
    if (FRONT.test(t)) axes.add("front");
    else if (REAR.test(t) && !NOT_AXIS_AFTER.has(next)) axes.add("rear");
    if (LEFT.test(t)) sides.add("left");
    else if (RIGHT.test(t)) sides.add("right");
    // Kazakh: сол жақ / оң жақ (folded to "сол жак" / "он жак").
    if (next.startsWith("жак") && t === "сол") sides.add("left");
    if (next.startsWith("жак") && t === "он") sides.add("right");
    if (!addCombined(t) && t.length === 1) addCombined(`${t} ${next}`);
    for (const [position, re] of POSITIONS) if (re.test(t)) positions.add(position);
  });
  if (KAZAKH_RIGHT.test(raw.toLowerCase())) sides.add("right");
  if (cjk) {
    if (cjk.includes("左")) sides.add("left");
    if (cjk.includes("右")) sides.add("right");
    if (ZH_FRONT.test(cjk)) axes.add("front");
    if (ZH_REAR.test(cjk)) axes.add("rear");
  }
  return { axis: single(axes), side: single(sides), position: single(positions) };
}
