import { STOPWORDS } from "./text";

const UNITS = "шт|штук|штуки|штука|pcs|pc|дана|dona|комплект|комплекта|комплектов|компл|кмпл";
const UNIT_SUFFIX = new RegExp(`^(\\d{1,3})(${UNITS})$`);
const UNIT_WORD = new RegExp(`^(${UNITS})$`);
const NUMBER_WORDS: Record<string, number> = {
  один: 1,
  одна: 1,
  одну: 1,
  два: 2,
  две: 2,
  пара: 2,
  пару: 2,
  пары: 2,
  оба: 2,
  обе: 2,
  три: 3,
  четыре: 4,
};
// "5-я дверь", "3 ряд", "12 вольт", "16 дюймов", "4 литра": an ordinal or a measure, not a count.
// "дверь" is here because a count would say "2 двери"; "5 дверь" is the tailgate.
const NOT_A_COUNT =
  /^(?:я|й|е|ая|ой|ый|ий|ое|ее|го|ого|его|л|мл|кг|г|гр|мм|см|км|ач|квт|лет|мест|дверь)$|^(?:ряд|вольт|дюйм|радиус|литр|тыс|год|поколен|местн|ступенч|скоростн)/;

const sane = (n: number) => (Number.isInteger(n) && n >= 1 && n <= 100 ? n : null);
const countable = (next: string | undefined) => !!next && !STOPWORDS.has(next) && !NOT_A_COUNT.test(next);

// Tokens are normalized; rawText is only used for "×4" and "*4", whose signs normalization removes.
export function detectQty(tokens: string[], rawText: string): number | null {
  for (let i = 0; i < tokens.length; i++) {
    const m = UNIT_SUFFIX.exec(tokens[i]);
    if (m) return sane(Number(m[1]));
    if (/^\d{1,3}$/.test(tokens[i]) && UNIT_WORD.test(tokens[i + 1] ?? "")) return sane(Number(tokens[i]));
  }
  const times = /[×*]\s*(\d{1,2})(?!\d)/.exec(rawText);
  if (times) return sane(Number(times[1]));
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    // Cyrillic "х2" is always a multiplier; Latin "x2" only after a Russian word, since X5 or X70 is a model.
    const cyr = /^х(\d)$/.exec(t);
    if (cyr) return sane(Number(cyr[1]));
    const lat = /^x([2-9])$/.exec(t);
    if (lat && i > 0 && /[а-я]/.test(tokens[i - 1])) return sane(Number(lat[1]));
  }
  if (/^\d{1,2}$/.test(tokens[0] ?? "") && /^[а-я]/.test(tokens[1] ?? "") && countable(tokens[1]))
    return sane(Number(tokens[0]));
  for (let i = 0; i < tokens.length; i++) {
    const n = NUMBER_WORDS[tokens[i]];
    // "две фары" is a quantity, "три в одном" is a name.
    if (n && countable(tokens[i + 1])) return n;
  }
  return null;
}
