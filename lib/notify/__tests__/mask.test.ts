import { describe, expect, it } from "vitest";
import { maskPhoneForLog, maskVins } from "@/lib/notify/mask";

// Synthetic VINs with a valid ISO 3779 check digit; never a real customer's.
const VIN = "LTXSYN000R0012345";
const VIN_2 = "LTXSYN002R0012346";

describe("maskVins", () => {
  it("masks VINs anywhere in a sentence", () => {
    expect(maskVins(`VIN ${VIN}, проверьте`)).toBe("VIN LTX…2345, проверьте");
    expect(maskVins(VIN)).toBe("LTX…2345");
    expect(maskVins(`(${VIN})`)).toBe("(LTX…2345)");
    expect(maskVins(`${VIN},${VIN_2}`)).toBe("LTX…2345,LTX…2346");
    expect(maskVins(`ВИН:${VIN}`)).toBe("ВИН:LTX…2345");
  });

  it("masks lowercase, mistyped and Cyrillic look-alike VINs", () => {
    expect(maskVins(VIN.toLowerCase())).toBe("ltx…2345");
    expect(maskVins("LTXSYNOOOR0012345")).toBe("LTX…2345");
    // "Т", "Х" and "Р" below are Cyrillic.
    expect(maskVins("LТХSYN000Р0012345")).toBe("LТХ…2345");
    expect(maskVins(`${VIN}_`)).toBe("LTX…2345_");
  });

  it("leaves other text alone", () => {
    expect(maskVins("Колодки передние 3501110XKZ16A")).toBe("Колодки передние 3501110XKZ16A");
    expect(maskVins("ABCDEFGHJKLMNPRST")).toBe("ABCDEFGHJKLMNPRST");
    expect(maskVins(`${VIN}9`)).toBe(`${VIN}9`);
    expect(maskVins("")).toBe("");
  });
});

describe("maskPhoneForLog", () => {
  it("keeps only the last four digits", () => {
    expect(maskPhoneForLog("77011234567")).toBe("•••4567");
    expect(maskPhoneForLog("998901234567")).toBe("•••4567");
    expect(maskPhoneForLog("+7 701 123 45 67")).toBe("•••4567");
    expect(maskPhoneForLog("123")).toBe("•••");
    expect(maskPhoneForLog(null)).toBe("•••");
  });
});
