import { describe, expect, it } from "vitest";
import { VIN_CHARSET, fromRussianLayout, hasCyrillicLookalikes, hasUnmappedCyrillic, normalizeVin } from "@/lib/vin";
import { VINS } from "./fixtures";

describe("normalizeVin", () => {
  it("uppercases and strips spaces, dashes and dots", () => {
    expect(normalizeVin("lgx ce4-cb4.r0 999 001")).toBe(VINS.bydLgx);
    expect(normalizeVin("  LGX-CE4CB4-R0999001  ")).toBe(VINS.bydLgx);
    expect(normalizeVin("LGX.CE4.CB4.R0999001")).toBe(VINS.bydLgx);
  });

  it("strips tabs, newlines, NBSP, zero-width spaces and unicode dashes", () => {
    // NBSP, zero-width space, en dash, em dash.
    expect(normalizeVin("LGX\tCE4\nCB4\u00a0R0\u200b999\u2013001\u2014")).toBe(VINS.bydLgx);
    // BOM, minus sign, figure dash, non-breaking hyphen, narrow NBSP, ideographic space.
    expect(normalizeVin("\ufeffLGX\u2012CE4\u2011CB4\u202fR0\u3000999001\u2212")).toBe(VINS.bydLgx);
  });

  it("strips invisible characters copied from messengers and PDFs", () => {
    // Soft hyphen, left-to-right mark, right-to-left override, word joiner, zero-width joiner.
    expect(normalizeVin("LGX\u00adCE4\u200eCB4\u202eR0\u2060999\u200d001")).toBe(VINS.bydLgx);
    // Control characters such as ESC must never reach a log line.
    expect(normalizeVin("\u001b[31mLGX")).toBe("[31MLGX");
    expect(normalizeVin("LGX\u0000\u0007\u007f\u0085CE4")).toBe("LGXCE4");
  });

  it("strips middle dots and the ideographic full stop", () => {
    expect(normalizeVin("LGX\u00b7CE4CB4\u3002R0999001")).toBe(VINS.bydLgx);
  });

  it("turns full-width characters into ASCII", () => {
    expect(normalizeVin("ＬＧＸＣＥ４ＣＢ４Ｒ０９９９００１")).toBe(VINS.bydLgx);
    expect(normalizeVin("LGX\uff0dCE4\uff0eCB4R0999001")).toBe(VINS.bydLgx);
  });

  it("replaces Cyrillic lookalikes typed on a Russian or Kazakh layout", () => {
    // С, Е, С and В are Cyrillic here; the guard keeps the test honest if an editor "fixes" them to Latin.
    const typed = "LGXСЕ4СВ4R0999001";
    expect([...typed].filter((c) => /\p{Script=Cyrillic}/u.test(c))).toEqual(["С", "Е", "С", "В"]);
    expect(normalizeVin(typed)).toBe(VINS.bydLgx);
    expect(normalizeVin("lgxсе4св4r0999001")).toBe(VINS.bydLgx);
    expect(normalizeVin("АВЕКМНОРСТУХІҮ")).toBe("ABEKMHOPCTYXIY");
    expect(normalizeVin("авекмнорстухіү")).toBe("ABEKMHOPCTYXIY");
    expect(hasCyrillicLookalikes("LGXСЕ4")).toBe(true);
    expect(hasCyrillicLookalikes("lgxсе4")).toBe(true);
    expect(hasCyrillicLookalikes(VINS.bydLgx)).toBe(false);
    expect(hasCyrillicLookalikes(null)).toBe(false);
  });

  it("keeps characters it cannot map so validation can report them", () => {
    expect(normalizeVin("LGX/Ж*")).toBe("LGX/Ж*");
    expect(normalizeVin("LGX_ÁŁ")).toBe("LGX_ÁŁ");
    expect(hasCyrillicLookalikes("Ж")).toBe(false);
  });

  it("handles empty and missing input", () => {
    expect(normalizeVin("")).toBe("");
    expect(normalizeVin(null)).toBe("");
    expect(normalizeVin(undefined)).toBe("");
    expect(normalizeVin(" - . ")).toBe("");
    expect(normalizeVin("\u200b\u00ad\ufeff")).toBe("");
  });

  it("is idempotent", () => {
    for (const input of [" lgx-ce4cb4.r0 999 001 ", "LGXСЕ4", "ДПЧ\u00ad1", "LGX/Ж*"]) {
      const once = normalizeVin(input);
      expect(normalizeVin(once), input).toBe(once);
    }
  });

  it("charset excludes I, O and Q", () => {
    expect(VIN_CHARSET.test(VINS.bydLgx)).toBe(true);
    for (const c of ["I", "O", "Q", "a", "-", "Ж"]) expect(VIN_CHARSET.test(`LGX${c}`)).toBe(false);
  });
});

describe("hasUnmappedCyrillic", () => {
  it("is true only for Cyrillic letters without a Latin twin", () => {
    expect(hasUnmappedCyrillic("ДПЧ")).toBe(true);
    expect(hasUnmappedCyrillic("LGXCE4CИ4")).toBe(true);
    expect(hasUnmappedCyrillic("LGXСЕ4СВ4R0999001")).toBe(false);
    expect(hasUnmappedCyrillic(VINS.bydLgx)).toBe(false);
    expect(hasUnmappedCyrillic(undefined)).toBe(false);
  });
});

describe("fromRussianLayout", () => {
  it("maps every letter key of the ЙЦУКЕН layout to QWERTY", () => {
    expect(fromRussianLayout("ЙЦУКЕНГШЩЗФЫВАПРОЛДЯЧСМИТЬ")).toBe("QWERTYUIOPASDFGHJKLZXCVBNM");
    expect(fromRussianLayout("йцукенгшщзфывапролдячсмить")).toBe("QWERTYUIOPASDFGHJKLZXCVBNM");
  });

  it("maps punctuation keys too, so Ю typed for a dot disappears", () => {
    expect(fromRussianLayout("ХЪЖЭБЁ")).toBe("[];',`");
    expect(fromRussianLayout("ДПЧюСУ4")).toBe("LGXCE4");
  });

  it("recovers a VIN typed without switching the layout", () => {
    // LGXCE4CB4R0999001 typed on the Russian layout.
    expect(fromRussianLayout("ДПЧСУ4СИ4К0999001")).toBe(VINS.bydLgx);
    // Mixed: LGX and R in Latin, the rest on the Russian layout.
    expect(fromRussianLayout("LGXсу4си4R0999001")).toBe(VINS.bydLgx);
  });

  it("keeps Latin, digits and empty input as they are", () => {
    expect(fromRussianLayout(VINS.bydLgx)).toBe(VINS.bydLgx);
    expect(fromRussianLayout(null)).toBe("");
  });
});
