import { describe, expect, it } from "vitest";
import { CHECK_DIGIT_MESSAGE, makeVin, validateVin } from "@/lib/vin";
import { VINS, setAt } from "./fixtures";

const codes = (issues: { code: string }[]) => issues.map((i) => i.code);

describe("validateVin: valid input", () => {
  it("accepts correct VINs without errors or warnings", () => {
    for (const vin of [VINS.bydLgx, VINS.bydLc0, VINS.geelyL6t, VINS.changanLs6, VINS.liAuto, VINS.checkX, VINS.europe]) {
      expect(validateVin(vin), vin).toEqual({ ok: true, vin, errors: [], warnings: [], suggestions: [] });
    }
  });

  it("returns the normalized VIN", () => {
    const result = validateVin(" lgx-ce4cb4.r0 999 001 ");
    expect(result.ok).toBe(true);
    expect(result.vin).toBe(VINS.bydLgx);
  });

  it("accepts Cyrillic lookalikes and says it replaced them", () => {
    const result = validateVin("LGXСЕ4СВ4R0999001");
    expect(result.ok).toBe(true);
    expect(result.vin).toBe(VINS.bydLgx);
    expect(codes(result.warnings)).toEqual(["cyrillic"]);
    expect(result.warnings[0].message).toMatch(/латинские/);
  });
});

describe("validateVin: length and charset", () => {
  it("reports empty input", () => {
    for (const input of ["", "  ", null, undefined]) {
      const result = validateVin(input);
      expect(result.ok).toBe(false);
      expect(codes(result.errors)).toEqual(["empty"]);
      expect(result.suggestions).toEqual([]);
    }
  });

  it("reports short and long VINs with the count", () => {
    const short = validateVin(VINS.bydLgx.slice(0, 16));
    expect(codes(short.errors)).toEqual(["length"]);
    expect(short.errors[0].message).toContain("введено 16");
    expect(short.errors[0].message).toContain("пропущен");

    const long = validateVin(VINS.bydLgx + "1");
    expect(codes(long.errors)).toEqual(["length"]);
    expect(long.errors[0].message).toContain("введено 18");
    expect(long.errors[0].message).toContain("лишний");
  });

  it("reports I, O and Q with their positions", () => {
    const result = validateVin(setAt(setAt(VINS.europe, 12, "I"), 5, "O"));
    expect(result.ok).toBe(false);
    expect(codes(result.errors)).toEqual(["forbidden_letters"]);
    expect(result.errors[0].message).toContain("5-й символ O");
    expect(result.errors[0].message).toContain("12-й символ I");
  });

  it("reports other characters once each", () => {
    const result = validateVin("LGXCE4CB4R09/9Ж/1");
    expect(codes(result.errors)).toEqual(["charset"]);
    expect(result.errors[0].message).toBe("Недопустимые символы: «/», «Ж». В VIN только латинские буквы и цифры");
  });

  it("reports several problems at once and skips the check digit then", () => {
    const result = validateVin("LGXOE4CB4R0999_1x");
    expect(codes(result.errors)).toEqual(["forbidden_letters", "charset"]);
    expect(codes(result.warnings)).toEqual([]);
    const both = validateVin("LGXQE4CB4R0999");
    expect(codes(both.errors)).toEqual(["length", "forbidden_letters"]);
  });
});

describe("validateVin: suggestions for I, O and Q", () => {
  it("suggests O → 0 when that gives a valid VIN", () => {
    // Position 11 of the fixture is 0; a customer typed the letter O.
    const result = validateVin(setAt(VINS.bydLgx, 11, "O"));
    expect(result.ok).toBe(false);
    expect(result.suggestions).toEqual([VINS.bydLgx]);
  });

  it("suggests Q → 0 and I → 1", () => {
    expect(validateVin(setAt(VINS.bydLgx, 16, "Q")).suggestions).toEqual([VINS.bydLgx]);
    expect(validateVin(setAt(VINS.bydLgx, 17, "I")).suggestions).toEqual([VINS.bydLgx]);
  });

  it("fixes several letters at once, including the check digit itself", () => {
    // LGXCE4CB4R0999001 typed with O at 11, Q at 16 and I at 17.
    expect(validateVin("LGXCE4CB4RO9990QI").suggestions).toEqual([VINS.bydLgx]);
    // L6TCX2E70R0999003 typed with O as the check digit and Q at 11.
    expect(validateVin("L6TCX2E7ORQ999003").suggestions).toEqual([VINS.geelyL6t]);
  });

  it("does not suggest a Chinese VIN whose check digit still fails", () => {
    // The intended character was 1, not 0, so O → 0 breaks the check digit.
    const typed = setAt(VINS.bydLgx, 17, "O");
    const result = validateVin(typed);
    expect(result.ok).toBe(false);
    expect(result.suggestions).toEqual([]);
  });

  it("suggests a non-Chinese VIN even when its check digit fails, because that is only a warning", () => {
    const typed = setAt(VINS.europe, 17, "O");
    const suggestion = setAt(VINS.europe, 17, "0");
    expect(validateVin(typed).suggestions).toEqual([suggestion]);
    expect(codes(validateVin(suggestion).warnings)).toEqual(["check_digit"]);
  });

  it("does not suggest when the length is wrong", () => {
    expect(validateVin(setAt(VINS.bydLgx, 11, "O").slice(0, 16)).suggestions).toEqual([]);
  });

  it("works with lowercase o typed by the customer", () => {
    expect(validateVin(setAt(VINS.bydLgx, 11, "o").toLowerCase()).suggestions).toEqual([VINS.bydLgx]);
  });

  it("chains with Cyrillic О", () => {
    const result = validateVin(setAt(VINS.bydLgx, 11, "О"));
    expect(codes(result.warnings)).toEqual(["cyrillic"]);
    expect(result.suggestions).toEqual([VINS.bydLgx]);
  });
});

describe("validateVin: check digit", () => {
  it("is an error for Chinese VINs starting with L", () => {
    const result = validateVin(setAt(VINS.bydLgx, 9, "5"));
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([{ code: "check_digit", message: CHECK_DIGIT_MESSAGE }]);
    expect(CHECK_DIGIT_MESSAGE).toBe(
      "Контрольная цифра не сходится: проверьте 9-й символ или пришлите фото техпаспорта",
    );
    expect(result.suggestions).toEqual([]);
  });

  it("is an error for Chinese VINs starting with H", () => {
    const result = validateVin(setAt(VINS.liAuto, 9, "X"));
    expect(result.ok).toBe(false);
    expect(codes(result.errors)).toEqual(["check_digit"]);
  });

  it("is an error when another character was mistyped in a Chinese VIN", () => {
    const result = validateVin(setAt(VINS.bydLc0, 14, "8"));
    expect(codes(result.errors)).toEqual(["check_digit"]);
  });

  it("is an error when position 9 holds a letter", () => {
    expect(codes(validateVin(setAt(VINS.bydLgx, 9, "A")).errors)).toEqual(["check_digit"]);
  });

  it("is only a warning outside China", () => {
    for (const vin of [VINS.europe, VINS.russia]) {
      const result = validateVin(setAt(vin, 9, vin[8] === "1" ? "2" : "1"));
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
      expect(codes(result.warnings)).toEqual(["check_digit"]);
      expect(result.warnings[0].message).toMatch(/не в Китае/);
    }
  });

  it("accepts X and 0 as check digits", () => {
    expect(validateVin(VINS.checkX).ok).toBe(true);
    expect(validateVin(VINS.checkZero).ok).toBe(true);
    expect(validateVin(VINS.checkX.toLowerCase()).ok).toBe(true);
  });
});

describe("validateVin: model year position", () => {
  it("warns when a Chinese VIN has no model year code at position 10", () => {
    for (const c of ["U", "Z", "0"]) {
      const vin = makeVin(`LGXCE4CB*${c}0999001`);
      const result = validateVin(vin);
      expect(result.ok, c).toBe(true);
      expect(codes(result.warnings)).toEqual(["model_year"]);
      expect(result.warnings[0].message).toContain(`«${c}»`);
    }
  });

  it("does not warn outside China, where position 10 is not always the year", () => {
    expect(validateVin(makeVin("WVWZZZ1K*Z0999006")).warnings).toEqual([]);
  });
});

describe("validateVin: messages", () => {
  it("says how many characters are missing or extra", () => {
    const short = validateVin(VINS.bydLgx.slice(0, 10));
    expect(short.errors[0].message).toBe("В VIN 17 символов, а введено 10. Не хватает символов: 7");
    const long = validateVin(VINS.bydLgx + "123");
    expect(long.errors[0].message).toBe("В VIN 17 символов, а введено 20. Лишних символов: 3");
  });

  it("counts an emoji as one character, in the length and in positions", () => {
    // 16 VIN characters plus one emoji: 17 characters for the customer, 18 UTF-16 units.
    const result = validateVin("\u{1F697}" + setAt(VINS.bydLgx, 11, "O").slice(1));
    expect(codes(result.errors)).toEqual(["forbidden_letters", "charset"]);
    expect(result.errors[0].message).toContain("(11-й символ O)");
    expect(result.errors[1].message).toContain("«\u{1F697}»");
  });

  it("does not list invisible characters as invalid", () => {
    const result = validateVin("LGX\u00adCE4CB4\u200eR0999001\u0007");
    expect(result).toEqual({ ok: true, vin: VINS.bydLgx, errors: [], warnings: [], suggestions: [] });
  });

  it("keeps messages short when a long text is pasted", () => {
    const forbidden = validateVin("O".repeat(40));
    expect(forbidden.errors[1].message).toContain("1-й символ O, 2-й символ O, 3-й символ O, 4-й символ O, 5-й символ O и ещё 35)");
    const charset = validateVin("абвгдежзийклмнопрстуфхцчшщ");
    const message = charset.errors.find((e) => e.code === "charset")!.message;
    expect(message).toMatch(/^Недопустимые символы: «Б», «Г», «Д», «Ж», «З» и ещё \d+\./);
    for (const issue of [...validateVin("Ж".repeat(10_000)).errors, ...validateVin("Q".repeat(10_000)).errors]) {
      expect(issue.message.length, issue.code).toBeLessThan(200);
    }
  });

  it("never repeats the VIN in a message", () => {
    // Messages may be logged or sent to a chat; the VIN itself is personal data.
    const inputs = [
      setAt(VINS.bydLgx, 9, "5"),
      setAt(VINS.europe, 9, "5"),
      makeVin("LGXCE4CB*U0999001"),
      setAt(VINS.bydLgx, 11, "O"),
      VINS.bydLgx + "1",
      VINS.bydLgx.slice(0, 16),
      "LGXCE4CB4R09/9Ж/1",
      "LGXСЕ4СВ4R0999001",
      "ДПЧСУ4СИ4К0999001",
    ];
    for (const input of inputs) {
      const result = validateVin(input);
      for (const issue of [...result.errors, ...result.warnings]) {
        expect(issue.message, `${issue.code} for ${input}`).not.toMatch(/[A-HJ-NPR-Z0-9]{8,}/);
      }
    }
  });

  it("writes every message in Russian", () => {
    const results = [
      validateVin(""),
      validateVin("LGXOE4CB4R0999_1x"),
      validateVin(setAt(VINS.bydLgx, 9, "5")),
      validateVin(setAt(VINS.europe, 9, "5")),
      validateVin(makeVin("LGXCE4CB*Z0999001")),
      validateVin("LGXСЕ4СВ4R0999001"),
      validateVin("ДПЧСУ4СИ4К0999001"),
    ];
    for (const issue of results.flatMap((r) => [...r.errors, ...r.warnings])) {
      expect(issue.message, issue.code).toMatch(/[а-яё]{3,}/i);
    }
  });
});

describe("validateVin: keyboard layout", () => {
  it("suggests the VIN when it was typed without switching to English", () => {
    const result = validateVin("ДПЧСУ4СИ4К0999001");
    expect(result.ok).toBe(false);
    expect(codes(result.errors)).toEqual(["charset"]);
    expect(result.suggestions).toEqual([VINS.bydLgx]);
    // The lookalike replacement guessed wrong here, so only the layout warning is shown.
    expect(codes(result.warnings)).toEqual(["keyboard_layout"]);
    expect(result.warnings[0].message).toMatch(/раскладке/);
  });

  it("handles lowercase, mixed Latin and Ю typed for a dot", () => {
    expect(validateVin("дпчсу4си4к0999001").suggestions).toEqual([VINS.bydLgx]);
    expect(validateVin("LGXсу4си4R0999001").suggestions).toEqual([VINS.bydLgx]);
    expect(validateVin("ДПЧюСУ4СИ4ю К0999001").suggestions).toEqual([VINS.bydLgx]);
  });

  it("combines with the O → 0 fix", () => {
    // Щ is the O key: the customer typed the letter O for a zero on the Russian layout.
    expect(validateVin("ДПЧСУ4СИ4КЩ999001").suggestions).toEqual([VINS.bydLgx]);
  });

  it("does not suggest a Chinese VIN whose check digit fails after retyping, but still names the layout", () => {
    const result = validateVin("ДПЧСУ4СИ5К0999001");
    expect(result.suggestions).toEqual([]);
    expect(codes(result.warnings)).toEqual(["keyboard_layout"]);
    expect(result.warnings[0].message).toMatch(/введите VIN заново/);
  });

  it("names the layout when a character is missing as well", () => {
    const result = validateVin("ДПЧСУ4СИ4К099900");
    expect(result.suggestions).toEqual([]);
    expect(codes(result.warnings)).toEqual(["keyboard_layout"]);
  });

  it("does not guess when the input is not a VIN on any layout", () => {
    // П, р, и, в, е and т are letter keys, but the comma and spaces are not, so this is just text.
    const result = validateVin("Привет, где мой заказ");
    expect(result.suggestions).toEqual([]);
    // Unmapped Cyrillic is listed in the charset error; the lookalike warning would only confuse.
    expect(result.warnings).toEqual([]);
  });

  it("leaves lookalike-only input to the lookalike replacement", () => {
    // С, Е, В and Р are lookalikes, nothing else is Cyrillic, so this is not a layout mistake.
    const result = validateVin("LGXСЕ4СВ4R0999001");
    expect(result.ok).toBe(true);
    expect(codes(result.warnings)).toEqual(["cyrillic"]);
  });
});
