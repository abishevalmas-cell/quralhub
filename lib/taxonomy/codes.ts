// VIN and part number (OE) detection in free text. Deliberately independent of lib/vin: this only finds
// candidates, lib/vin validates them.

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;
const VIN_ANY = /^[A-Z0-9]{17}$/;
// Cyrillic letters that look exactly like Latin ones (Russian or Kazakh keyboard layout).
const LOOKALIKES: Record<string, string> = {
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
const CYRILLIC_UPPER = /[Ѐ-ӿ]/;
const delatinize = (upper: string) => upper.replace(/[Ѐ-ӿ]/g, (c) => LOOKALIKES[c] ?? c);

// ISO 3779 check digit (position 9).
const LETTERS = "ABCDEFGHJKLMNPRSTUVWXYZ";
const LETTER_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 7, 9, 2, 3, 4, 5, 6, 7, 8, 9];
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
const charValue = (c: string) => (/\d/.test(c) ? Number(c) : LETTER_VALUES[LETTERS.indexOf(c)]);
function checkDigitOk(vin: string): boolean {
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += charValue(vin[i]) * WEIGHTS[i];
  const r = sum % 11;
  return vin[8] === (r === 10 ? "X" : String(r));
}

function vinPiece(token: string): string | null {
  const upper = token.toUpperCase();
  if (!/[A-Z0-9]/.test(upper) || upper === "VIN") return null;
  const mapped = delatinize(upper);
  return /^[A-Z0-9]+$/.test(mapped) ? mapped : null;
}

// A VIN typed in groups ("LGW EF4A59 NF123456") is joined from several tokens. Model names and part
// numbers next to each other can add up to 17 characters too ("Chery Tiggo 7 Pro Max",
// "4050023800 Haval H6"), so a joined VIN must end in four digits (ISO 3779 serial) and either have
// a valid check digit or contain no letters-only word longer than four characters (HAVAL, TIGGO).
function joinedVinOk(vin: string, pieces: string[]): boolean {
  if (!VIN_RE.test(vin) || !/\d{4}$/.test(vin)) return false;
  return checkDigitOk(vin) || pieces.every((p) => /\d/.test(p) || p.length <= 4);
}

export interface VinHit {
  // 17 characters of the ISO 3779 alphabet.
  vin?: string;
  // 17 Latin letters and digits in one token that contain I, O or Q: a VIN with a typo.
  vinLike?: string;
  // Indices of the tokens the VIN was taken from.
  used: number[];
}

export function findVin(tokens: string[]): VinHit {
  const pieces = tokens.map(vinPiece);
  let like: { value: string; used: number[] } | null = null;
  for (let i = 0; i < pieces.length; i++) {
    let acc = "";
    for (let j = i; j < pieces.length && pieces[j] && acc.length < 17; j++) {
      acc += pieces[j];
      if (acc.length !== 17 || !/[A-Z]/.test(acc) || !/\d/.test(acc)) continue;
      const used = Array.from({ length: j - i + 1 }, (_, k) => i + k);
      if (j === i) {
        if (VIN_RE.test(acc)) return { vin: acc, used };
        if (VIN_ANY.test(acc) && !like) like = { value: acc, used };
      } else if (joinedVinOk(acc, pieces.slice(i, j + 1) as string[])) {
        return { vin: acc, used };
      }
    }
  }
  return like ? { vinLike: like.value, used: like.used } : { used: [] };
}

const UNIT = /^\d+(\.\d+)?(KM|MM|CM|KW|KWH|WH|AH|MAH|V|W|KG|L|NM|CC|HP|PS|KPA|MPA|BAR|RPM)$/;
const DATE = /^\d{1,4}[.\-]\d{1,2}[.\-]\d{1,4}$/;
const YEAR_RANGE = /^(19|20)\d{2}[.\-]((19|20)\d{2}|\d{2})$/;
// 1.500.000 or 50.000: a price with thousand separators.
const THOUSANDS = /^\d{1,3}(\.\d{3})+$/;
const PHONE = /^([78][.\-]?)?\d{3}[.\-]?\d{3}[.\-]\d{2}[.\-]\d{2}$|^99[68][.\-]?\d{2}[.\-]?\d{3}[.\-]?\d{2}[.\-]?\d{2}$/;
const TIRE = /^\d{3}-?\d{2}Z?R\d{2}C?$/;
const OIL_GRADE = /^\d{1,2}W-?\d{2}$/;
const REFRIGERANT = /^R\d{3,4}[A-Z]{0,2}$/;

// Part-number-like token: 5–25 letters, digits, dashes and dots, at least 3 digits, no Cyrillic.
export function oePiece(token: string): string | null {
  const upper = token.toUpperCase();
  // Without a Latin letter, Cyrillic means a Russian word ("5000км"), not a mistyped part number.
  const mapped = /[A-Z]/.test(upper) ? delatinize(upper) : upper;
  if (CYRILLIC_UPPER.test(mapped)) return null;
  if (mapped.length < 5 || mapped.length > 25) return null;
  if (!/^[A-Z0-9][A-Z0-9.\-]*[A-Z0-9]$/.test(mapped)) return null;
  if ((mapped.match(/\d/g) ?? []).length < 3) return null;
  // Dates, years, prices, units, phone numbers, tire sizes, oil grades and refrigerants are not part numbers.
  for (const re of [DATE, YEAR_RANGE, THOUSANDS, UNIT, PHONE, TIRE, OIL_GRADE, REFRIGERANT]) if (re.test(mapped)) return null;
  // Plain numbers: mileage under 7 digits, KZ/RU (7…, 8…) and UZ/KG (998…, 996…) phone numbers.
  if (/^\d+$/.test(mapped) && (mapped.length < 7 || /^[78]\d{10}$/.test(mapped) || /^99[68]\d{9}$/.test(mapped)))
    return null;
  return mapped;
}
