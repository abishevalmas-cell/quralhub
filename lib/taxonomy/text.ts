// Kazakh and Uzbek Cyrillic letters are folded to their Russian look-alikes: people type on whatever
// layout they have, so "қозғалтқыш" and "козгалткыш" must match. Hard sign is folded to soft sign
// because "подъемник" and "подьемник" are both common.
const FOLD: Record<string, string> = {
  ё: "е",
  ъ: "ь",
  ә: "а",
  ғ: "г",
  қ: "к",
  ң: "н",
  ө: "о",
  ұ: "у",
  ү: "у",
  һ: "х",
  і: "и",
  ў: "у",
  ҳ: "х",
};
const FOLD_RE = /[ёъәғқңөұүһіўҳ]/g;
// Uzbek Latin writes oʻ and gʻ with a turned comma or an apostrophe; drop them so "o'ng" and "ong" match.
const APOSTROPHES = /[ʻʼ’‘'`´]/g;
const NON_WORD = /[^\p{L}\p{N}]+/gu;
const CJK = /[㐀-鿿豈-﫿]/;

export const hasCjk = (s: string) => CJK.test(s);
export const isCyrillic = (s: string) => /[а-я]/.test(s);

export function normalizeText(input: string | null | undefined): string {
  return String(input ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(APOSTROPHES, "")
    .replace(FOLD_RE, (c) => FOLD[c])
    .replace(NON_WORD, " ")
    .trim();
}

export const tokenize = (normalized: string) => (normalized ? normalized.split(" ") : []);

// Words that carry no information about the part: requests, verbs, filler, generic "car".
export const STOPWORDS = new Set(
  (
    "в во на для от с со к ко и или по под над из у до за а но же ли не ни бы мне нам нужен нужна нужно нужны надо есть " +
    "ищу ищем куплю купить продам цена цену стоимость сколько стоит подскажите пожалуйста здравствуйте привет добрый день " +
    "интересует интересуют замена заменить поменять менять сломал сломался сломалась разбил разбила разбит разбита разбито " +
    "треснул треснула треснуло оригинал оригинальный оригинальная аналог новый новая новое новые бу б шт штук штука штуки " +
    "комплект пара пару мой моя моей мою машина машины машину авто автомобиль автомобиля без артикул вин " +
    "the a an of for and or to with assy assembly oe oem vin"
  ).split(" "),
);

// Inflectional endings of Russian nouns and adjectives, longest first.
const ENDINGS = [
  "ями",
  "ами",
  "ого",
  "его",
  "ому",
  "ему",
  "ыми",
  "ими",
  "иях",
  "иям",
  "ией",
  "ия",
  "ие",
  "ий",
  "ой",
  "ей",
  "ый",
  "ая",
  "яя",
  "ое",
  "ее",
  "ые",
  "ую",
  "юю",
  "ых",
  "их",
  "ым",
  "им",
  "ом",
  "ем",
  "ам",
  "ям",
  "ах",
  "ях",
  "ов",
  "ев",
  "ью",
  "ию",
  "а",
  "я",
  "ы",
  "и",
  "у",
  "ю",
  "е",
  "о",
  "ь",
  "й",
];
const ENDING_SET = new Set(ENDINGS);

export function stem(word: string): string {
  if (isCyrillic(word)) {
    for (const ending of ENDINGS) {
      if (word.endsWith(ending) && word.length - ending.length >= 3) return word.slice(0, -ending.length);
    }
    return word;
  }
  // Latin: plural "s" only ("brakes" → "brake"; "glass" and "abs" stay).
  if (word.length > 4 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

// Optimal string alignment distance with an early exit once it exceeds `max`.
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    rows.push(new Array<number>(b.length + 1).fill(0));
    rows[i][0] = i;
  }
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, rows[i - 2][j - 2] + 1);
      rows[i][j] = v;
      best = Math.min(best, v);
    }
    if (best > max) return max + 1;
  }
  return rows[a.length][b.length];
}

// Unstressed о and а sound the same, so people write "калодки", "тармазные", "амартизатор".
// е/и is not folded: it would merge "щеток" (wipers) with "щиток" (instrument cluster).
export const foldVowels = (s: string) => s.replace(/о/g, "а");

export interface Word {
  text: string;
  stem: string;
  // Stem with folded vowels, precomputed because wordQuality runs for every token and dictionary word.
  folded: string;
}

export function toWord(text: string): Word {
  const s = stem(text);
  return { text, stem: s, folded: foldVowels(s) };
}

// How well a query token matches one dictionary word: 1 exact, 0 none.
export function wordQuality(token: Word, word: Word): number {
  if (token.text === word.text) return 1;
  // Short words and abbreviations (акб, гур, abs, птф) must match exactly.
  if (word.text.length <= 3 || token.text.length <= 3) return 0;
  if (token.stem === word.stem) return 0.95;
  if (token.text.startsWith(word.stem) && ENDING_SET.has(token.text.slice(word.stem.length))) return 0.9;
  // Fleeting vowel in the genitive plural: колодок/колодк-, втулок/втулк-, подушек/подушк-.
  if (
    word.stem.endsWith("к") &&
    token.text.length === word.stem.length + 1 &&
    /[ое]к$/.test(token.text) &&
    token.text.slice(0, -2) === word.stem.slice(0, -1)
  )
    return 0.9;
  if (word.stem.length >= 4 && token.folded === word.folded && isCyrillic(word.stem)) return 0.8;
  // Typos: one edit for stems of 7+ letters, two for 10+. Shorter words collide too often
  // (колодки/колонки), and a typo in the first letter is rare enough to require it to match.
  if (word.stem.length >= 7 && token.stem.length >= 6 && token.text[0] === word.text[0]) {
    const max = word.stem.length >= 10 ? 2 : 1;
    if (editDistance(token.stem, word.stem, max) <= max) return 0.75;
  }
  return 0;
}
