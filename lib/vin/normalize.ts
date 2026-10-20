export const VIN_LENGTH = 17;

// ISO 3779: Latin letters and digits, except I, O and Q (they are too easy to confuse with 1 and 0).
export const VIN_CHARSET = /^[A-HJ-NPR-Z0-9]+$/;

// Whitespace, dots (incl. middle dot and the ideographic full stop), every dash and the minus sign.
// Control (Cc) and format (Cf) characters are invisible but come along when a VIN is copied from a messenger,
// a PDF or a web page: zero-width spaces, soft hyphens, bidi marks, BOM. Left in place they would show up as
// an empty «» in the error message, and they must not reach masked VINs in logs.
const SEPARATORS = /[\s.\u00b7\u3002\p{Pd}\u2212\p{Cc}\p{Cf}]/gu;

// Customers often type a VIN on a Russian or Kazakh keyboard layout. These Cyrillic letters look exactly
// like Latin ones, and a VIN never contains Cyrillic, so replacing them cannot change a correct VIN.
const CYRILLIC_LOOKALIKES: Record<string, string> = {
  А: "A",
  В: "B",
  Е: "E",
  К: "K",
  М: "M",
  Н: "H",
  О: "O",
  Р: "P",
  С: "C",
  Т: "T",
  У: "Y",
  Х: "X",
  І: "I",
  Ү: "Y",
};
const CYRILLIC_LOOKALIKE_RE = new RegExp(`[${Object.keys(CYRILLIC_LOOKALIKES).join("")}]`, "g");
const CYRILLIC_RE = /\p{Script=Cyrillic}/u;

const prepare = (input: string | null | undefined) => String(input ?? "").normalize("NFKC").toUpperCase();

export function normalizeVin(input: string | null | undefined): string {
  return prepare(input)
    .replace(CYRILLIC_LOOKALIKE_RE, (c) => CYRILLIC_LOOKALIKES[c])
    .replace(SEPARATORS, "");
}

export function hasCyrillicLookalikes(input: string | null | undefined): boolean {
  return prepare(input).search(CYRILLIC_LOOKALIKE_RE) >= 0;
}

// Cyrillic that survives normalizeVin has no Latin twin (Д, Л, П, Ч…). The customer most likely forgot
// to switch the keyboard layout, and then the lookalike replacement above guessed wrong as well.
export function hasUnmappedCyrillic(input: string | null | undefined): boolean {
  return CYRILLIC_RE.test(normalizeVin(input));
}

// Keys of the Russian ЙЦУКЕН layout in QWERTY order. Kazakh and Kyrgyz layouts put the same letters on these keys.
const RU_KEYS = "ЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮЁ";
const EN_KEYS = "QWERTYUIOP[]ASDFGHJKL;'ZXCVBNM,.`";

// Reads the input as if it was typed with the Russian layout switched on: "ДПЧ" becomes "LGX".
export function fromRussianLayout(input: string | null | undefined): string {
  const typed = [...prepare(input)].map((c) => {
    const key = RU_KEYS.indexOf(c);
    return key < 0 ? c : EN_KEYS[key];
  });
  return normalizeVin(typed.join(""));
}
