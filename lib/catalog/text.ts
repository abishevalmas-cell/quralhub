import { normalizeText } from "@/lib/taxonomy/text";

// Text matching for car names. VIN decodes, export names and what people type all spell the same car
// differently: "Song Plus New Energy DM-i", "Song PLUS DM-i", "宋PLUS DM-i", "Сонг Плюс". Everything is reduced
// to tokens: lowercase words, letters split from digits ("tiggo7" → tiggo 7), one token per Chinese character,
// and two names match when one equals a run of the other's tokens glued together ("uni k" ↔ "unik").

// Words that name a trim or a marketing edition, never a model: "Champion Edition", "New Energy", "冠军版".
const NOISE = [/new\s*energy/g, /\bchampion\b/g, /\bedition\b/g, /\bhonou?r\b/g, /新能源/g, /冠军版/g, /荣耀版/g];

const CJK_CHAR = /([㐀-鿿])/g;
const LETTER_DIGIT = /([a-zа-я])(\d)/g;
const DIGIT_LETTER = /(\d)([a-zа-я])/g;
// "DM-i", "UNI-K", "E-HS9": a hyphen inside a model code joins its pieces.
const CODE_HYPHEN = /([a-zа-я0-9])[-‐‑–](?=[a-zа-я0-9])/g;

// Russian spellings people type for brands and models; values are tokens of the Latin names.
export const RU_WORDS: Record<string, string> = {
  бид: "byd",
  биди: "byd",
  бивайди: "byd",
  джили: "geely",
  чери: "chery",
  черри: "chery",
  эксид: "exeed",
  джетур: "jetour",
  жетур: "jetour",
  омода: "omoda",
  джейку: "jaecoo",
  джаеку: "jaecoo",
  тенет: "tenet",
  хавал: "haval",
  хавейл: "haval",
  хавэйл: "haval",
  танк: "tank",
  грейт: "great",
  вол: "wall",
  волл: "wall",
  чанган: "changan",
  чаньань: "changan",
  дипал: "deepal",
  лисян: "lixiang",
  лисянь: "lixiang",
  ли: "li",
  авто: "auto",
  зикр: "zeekr",
  зекр: "zeekr",
  зеекр: "zeekr",
  сяоми: "xiaomi",
  ксиоми: "xiaomi",
  ксяоми: "xiaomi",
  айто: "aito",
  аито: "aito",
  серес: "seres",
  воя: "voyah",
  воях: "voyah",
  хончи: "hongqi",
  хунчи: "hongqi",
  хунцы: "hongqi",
  липмотор: "leapmotor",
  лип: "leap",
  мотор: "motor",
  линк: "lynk",
  ко: "co",
  гак: "gac",
  аион: "aion",
  эйон: "aion",
  кайи: "kaiyi",
  донгфенг: "dongfeng",
  донфенг: "dongfeng",
  дунфэн: "dongfeng",
  бестун: "bestune",
  бестурн: "bestune",
  монжаро: "monjaro",
  кулрей: "coolray",
  кулрэй: "coolray",
  атлас: "atlas",
  тугелла: "tugella",
  эмгранд: "emgrand",
  префейс: "preface",
  окаванго: "okavango",
  галакси: "galaxy",
  старшип: "starship",
  тигго: "tiggo",
  тиго: "tiggo",
  аризо: "arrizo",
  арризо: "arrizo",
  дашинг: "dashing",
  тревеллер: "traveller",
  трэвеллер: "traveller",
  про: "pro",
  макс: "max",
  плюс: "plus",
  плас: "plus",
  сонг: "song",
  цинь: "qin",
  чин: "qin",
  хан: "han",
  танг: "tang",
  сил: "seal",
  силайон: "sealion",
  юань: "yuan",
  атто: "atto",
  дельфин: "dolphin",
  долфин: "dolphin",
  чайка: "seagull",
  сигал: "seagull",
  чазор: "chazor",
  дестроер: "destroyer",
  фрегат: "frigate",
  леопард: "leopard",
  джолион: "jolion",
  дарго: "dargo",
  поер: "poer",
  вингл: "wingle",
  юни: "uni",
  алсвин: "alsvin",
  эадо: "eado",
  хантер: "hunter",
  мега: "mega",
  фри: "free",
  дример: "dreamer",
  дми: "dmi",
  шайн: "shine",
};

// Cyrillic letters typed instead of Latin ones in model codes: "Х70", "Н6", "Т2", "С5", "Л7".
const LOOKALIKE: Record<string, string> = {
  а: "a",
  в: "b",
  г: "g",
  д: "d",
  е: "e",
  з: "z",
  и: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "h",
  о: "o",
  р: "p",
  с: "c",
  т: "t",
  у: "y",
  ф: "f",
  х: "x",
};

/** Tokens before Russian words are mapped to Latin ones. */
export function rawTokens(input: string | null | undefined): string[] {
  let s = String(input ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\+/g, " plus ");
  for (const re of NOISE) s = s.replace(re, " ");
  s = normalizeText(s.replace(CODE_HYPHEN, "$1"));
  s = s.replace(LETTER_DIGIT, "$1 $2").replace(DIGIT_LETTER, "$1 $2").replace(CJK_CHAR, " $1 ");
  return s.split(/\s+/).filter(Boolean);
}

/** A Russian word or a Cyrillic look-alike letter → its Latin token; anything else unchanged. */
export function latinize(token: string): string {
  return RU_WORDS[token] ?? LOOKALIKE[token] ?? token;
}

export function tokens(input: string | null | undefined): string[] {
  return rawTokens(input).map(latinize);
}

/** The comparable form of a name: its tokens glued together ("Song PLUS DM-i" → "songplusdmi"). */
export const compact = (input: string | null | undefined) => tokens(input).join("");

const MAX_SPAN = 48;

/** Every run of consecutive tokens glued together, e.g. [uni, k, idd] → uni, unik, unikidd, k, kidd, idd. */
export function spans(list: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < list.length; i++) {
    let joined = "";
    for (let j = i; j < list.length && joined.length + list[j].length <= MAX_SPAN; j++) {
      joined += list[j];
      out.add(joined);
    }
  }
  return out;
}

/** Latin readings of a Russian word that is still being typed: "монж" → ["monjaro"]. */
export function latinPrefixes(raw: string): string[] {
  const exact = latinize(raw);
  if (exact !== raw || !/[а-я]/.test(raw)) return [exact];
  const found = Object.entries(RU_WORDS)
    .filter(([ru]) => ru.startsWith(raw))
    .map(([, latin]) => latin);
  return found.length ? [...new Set(found)] : [raw];
}
