// World manufacturer identifiers (VIN positions 1–3). Extend this table as new prefixes show up.
//
// confidence:
//   "observed" — seen in test data: a real trial decoded VINs with this prefix together with these brands.
//   "likely"   — taken from public WMI lists, not yet confirmed by our own decoding. Needs confirmation:
//                switch to "observed" once a provider decodes a VIN with this prefix to the same brand.
//
// A WMI names the manufacturer, not the model or trim, so it is a hint for the UI and never a fitment signal.
// Cars assembled in Kazakhstan, Russia or Uzbekistan from Chinese kits carry local WMIs, not Chinese ones.
// Small makers have "9" as the third character and are identified by positions 12–14 too; they are not covered.

export type WmiConfidence = "observed" | "likely";

export interface WmiEntry {
  readonly maker: string;
  readonly brands: readonly string[];
  readonly confidence: WmiConfidence;
  readonly note?: string;
}

const TABLE: Record<string, WmiEntry> = {
  // Seen in test data.
  LC0: { maker: "BYD", brands: ["BYD"], confidence: "observed" },
  HLX: { maker: "Li Auto", brands: ["Li Auto"], confidence: "observed", note: "Он же Lixiang (理想)" },
  L6T: {
    maker: "Geely Holding",
    brands: ["Zeekr", "Geely Galaxy", "Lynk & Co"],
    confidence: "observed",
    note: "В тестовых данных были Zeekr и Geely Galaxy E5; Lynk & Co возможен, но пока не встречался",
  },
  LS6: {
    maker: "Changan",
    brands: ["Deepal", "Changan"],
    confidence: "observed",
    note: "Changan New Energy: Deepal и электрические Changan",
  },

  // Core Chinese makers from public WMI lists. Need confirmation.
  LGX: { maker: "BYD", brands: ["BYD"], confidence: "likely" },
  LS5: { maker: "Changan", brands: ["Changan"], confidence: "likely" },
  LB3: { maker: "Geely", brands: ["Geely"], confidence: "likely" },
  LVV: { maker: "Chery", brands: ["Chery"], confidence: "likely" },
  LGW: { maker: "Great Wall", brands: ["Great Wall", "Haval", "Tank", "Wey", "Ora"], confidence: "likely" },

  // Other common prefixes from public WMI lists. Need confirmation.
  LSJ: { maker: "SAIC Motor", brands: ["MG", "Roewe"], confidence: "likely" },
  LMG: { maker: "GAC Motor", brands: ["GAC Trumpchi"], confidence: "likely" },
  LZW: { maker: "SAIC-GM-Wuling", brands: ["Wuling", "Baojun"], confidence: "likely" },
  LRW: { maker: "Tesla Shanghai", brands: ["Tesla"], confidence: "likely" },
  LFV: { maker: "FAW-Volkswagen", brands: ["Volkswagen", "Audi", "Jetta"], confidence: "likely" },
  LSV: { maker: "SAIC Volkswagen", brands: ["Volkswagen", "Skoda"], confidence: "likely" },
  LSG: { maker: "SAIC-GM", brands: ["Buick", "Chevrolet", "Cadillac"], confidence: "likely" },
  LBV: { maker: "BMW Brilliance", brands: ["BMW"], confidence: "likely" },
  LE4: { maker: "Beijing Benz", brands: ["Mercedes-Benz"], confidence: "likely" },
};

// The table is shared by every request in the process, so a caller must not be able to edit it by accident.
for (const entry of Object.values(TABLE)) {
  Object.freeze(entry.brands);
  Object.freeze(entry);
}

export const WMI_TABLE: Readonly<Record<string, WmiEntry>> = Object.freeze(TABLE);
