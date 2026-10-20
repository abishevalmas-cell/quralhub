import { hasValidCheckDigit } from "./check-digit";
import { vinRegion } from "./manufacturer";
import {
  VIN_CHARSET,
  VIN_LENGTH,
  fromRussianLayout,
  hasCyrillicLookalikes,
  hasUnmappedCyrillic,
  normalizeVin,
} from "./normalize";
import { isModelYearCode } from "./year";

export type VinIssueCode =
  | "empty"
  | "length"
  | "forbidden_letters"
  | "charset"
  | "check_digit"
  | "model_year"
  | "cyrillic"
  | "keyboard_layout";

export interface VinIssue {
  code: VinIssueCode;
  message: string;
}

export interface VinValidation {
  ok: boolean;
  vin: string;
  errors: VinIssue[];
  warnings: VinIssue[];
  suggestions: string[];
}

const FORBIDDEN_FIX: Record<string, string> = { O: "0", Q: "0", I: "1" };
const FORBIDDEN_RE = /[IOQ]/g;
const HAS_FORBIDDEN = /[IOQ]/;

// Pasting a whole message must not turn into a page-long error, so lists in messages are cut short.
const MAX_LISTED = 5;

export const CHECK_DIGIT_MESSAGE = "Контрольная цифра не сходится: проверьте 9-й символ или пришлите фото техпаспорта";

function list(items: string[]): string {
  const shown = items.slice(0, MAX_LISTED).join(", ");
  return items.length > MAX_LISTED ? `${shown} и ещё ${items.length - MAX_LISTED}` : shown;
}

function lengthHint(length: number): string {
  const extra = length - VIN_LENGTH;
  if (extra === -1) return "Похоже, пропущен один символ";
  if (extra === 1) return "Похоже, есть лишний символ";
  return extra < 0 ? `Не хватает символов: ${-extra}` : `Лишних символов: ${extra}`;
}

function inspect(vin: string): { errors: VinIssue[]; warnings: VinIssue[] } {
  const errors: VinIssue[] = [];
  const warnings: VinIssue[] = [];
  // Code points, not UTF-16 units: an emoji is one character for the customer, in the count and in positions.
  const chars = [...vin];
  if (!chars.length) {
    errors.push({ code: "empty", message: "Введите VIN: 17 символов из техпаспорта" });
    return { errors, warnings };
  }

  if (chars.length !== VIN_LENGTH) {
    errors.push({
      code: "length",
      message: `В VIN 17 символов, а введено ${chars.length}. ${lengthHint(chars.length)}`,
    });
  }

  const forbidden = chars.flatMap((c, i) => (FORBIDDEN_FIX[c] ? [`${i + 1}-й символ ${c}`] : []));
  if (forbidden.length) {
    errors.push({
      code: "forbidden_letters",
      message: `В VIN не бывает букв I, O и Q (${list(forbidden)}). Вместо O и Q обычно стоит ноль, вместо I — единица`,
    });
  }

  const invalid = [...new Set(chars.filter((c) => !VIN_CHARSET.test(c) && !FORBIDDEN_FIX[c]))];
  if (invalid.length) {
    errors.push({
      code: "charset",
      message: `Недопустимые символы: ${list(invalid.map((c) => `«${c}»`))}. В VIN только латинские буквы и цифры`,
    });
  }

  if (errors.length) return { errors, warnings };

  // GB 16735 makes the check digit mandatory for Chinese VINs, so a mismatch there is a typo.
  // European makers often leave position 9 arbitrary, so elsewhere it only deserves a warning.
  const china = vinRegion(vin) === "China";
  if (!hasValidCheckDigit(vin)) {
    if (china) errors.push({ code: "check_digit", message: CHECK_DIGIT_MESSAGE });
    else
      warnings.push({
        code: "check_digit",
        message:
          "Контрольная цифра не сходится. У машин, выпущенных не в Китае, так бывает, но проверьте 9-й символ или пришлите фото техпаспорта",
      });
  }
  // GB 16735 also requires a model year code at position 10.
  if (china && !isModelYearCode(vin[9])) {
    warnings.push({
      code: "model_year",
      message: `10-й символ «${vin[9]}» не похож на код модельного года. Проверьте его по техпаспорту`,
    });
  }
  return { errors, warnings };
}

// I, O and Q never appear in a VIN, so each has exactly one likely intended character.
const fixForbidden = (vin: string) => vin.replace(FORBIDDEN_RE, (c) => FORBIDDEN_FIX[c]);

// Letters like Д or Л mean the layout was not switched. Then С, К or Е were most likely meant as C, R or T,
// not as their lookalikes, so the input is read again key by key.
function checkLayout(input: string | null | undefined): { mistake: boolean; retyped: string | null } {
  if (!hasUnmappedCyrillic(input)) return { mistake: false, retyped: null };
  const candidate = fixForbidden(fromRussianLayout(input));
  const errors = inspect(candidate).errors;
  // Only letter keys and digits were pressed: the layout is the problem even if the VIN still has a typo.
  const mistake = errors.every((e) => e.code === "length" || e.code === "check_digit");
  return { mistake, retyped: errors.length === 0 ? candidate : null };
}

export function validateVin(input: string | null | undefined): VinValidation {
  const vin = normalizeVin(input);
  const { errors, warnings } = inspect(vin);
  const suggestions: string[] = [];

  // A candidate is offered only when it passes validation, so a Chinese VIN must also match its check digit.
  if (HAS_FORBIDDEN.test(vin)) {
    const fixed = fixForbidden(vin);
    if (inspect(fixed).errors.length === 0) suggestions.push(fixed);
  }

  const layout = checkLayout(input);
  if (layout.retyped && !suggestions.includes(layout.retyped)) suggestions.push(layout.retyped);
  if (layout.mistake) {
    warnings.unshift({
      code: "keyboard_layout",
      message: layout.retyped
        ? "Похоже, VIN набран в русской раскладке. Проверьте предложенный вариант по техпаспорту"
        : "Похоже, VIN набран в русской раскладке. Переключите клавиатуру на английскую и введите VIN заново",
    });
  } else if (hasCyrillicLookalikes(input) && !hasUnmappedCyrillic(input)) {
    warnings.unshift({
      code: "cyrillic",
      message: "Русские буквы в VIN заменили на такие же латинские. Сверьте результат с техпаспортом",
    });
  }

  return { ok: errors.length === 0, vin, errors, warnings, suggestions };
}
