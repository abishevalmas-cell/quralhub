import { describe, expect, it } from "vitest";
import { CAR_COLORS } from "@/components/car/colors";
import { BODY_TYPES as CAR_BODY_TYPES, POWERTRAINS as CAR_POWERTRAINS } from "@/components/car/types";
import {
  BODY_TYPES,
  BRANDS,
  BRAND_IDS,
  CAR_COLOR_IDS,
  MARKETS,
  MODELS,
  POWERTRAINS,
  childBrands,
  findBrand,
  findModel,
  getBrand,
  getModel,
  modelTitle,
  modelVariants,
  modelYears,
  modelsByBrand,
  searchModels,
  type CarModel,
} from "@/lib/catalog/models";
import { compact, latinPrefixes, spans, tokens } from "@/lib/catalog/text";

describe("catalog vocabulary", () => {
  it("uses the same body, powertrain and color ids as the car illustration", () => {
    expect([...BODY_TYPES]).toEqual([...CAR_BODY_TYPES]);
    expect([...POWERTRAINS]).toEqual([...CAR_POWERTRAINS]);
    expect([...CAR_COLOR_IDS].sort()).toEqual(CAR_COLORS.map((c) => c.id).sort());
  });
});

describe("brands", () => {
  it("lists every brand id once with names and a Russian note", () => {
    expect(BRANDS.map((b) => b.id)).toEqual([...BRAND_IDS]);
    for (const b of BRANDS) {
      expect(b.name.trim(), b.id).not.toBe("");
      if (b.id !== "tenet") expect(b.nameZh, b.id).toMatch(/^[一-鿿]+$/);
      expect(b.note, b.id).toMatch(/[А-Яа-яЁё]/);
      if (b.parent) expect(getBrand(b.parent), b.id).not.toBeNull();
    }
  });

  it("marks catalog status from the 17VIN trial", () => {
    const status = (id: string) => getBrand(id)?.catalogStatus;
    for (const id of ["byd", "geely", "deepal"]) expect(status(id), id).toBe("vin_catalog");
    for (const id of ["li-auto", "zeekr"]) expect(status(id), id).toBe("manual");
    // No Changan-branded VIN was tested: only Deepal VINs on the Changan catalog.
    expect(status("changan")).toBe("checking");
    const rest = BRANDS.filter((b) => !["byd", "geely", "deepal", "li-auto", "zeekr"].includes(b.id));
    for (const b of rest) expect(b.catalogStatus, b.id).toBe("checking");
    // The notes name the VINs that were tried instead of a blanket "проверен".
    expect(getBrand("byd")?.note).toMatch(/Song Plus и Yuan Up/);
    expect(getBrand("geely")?.note).toMatch(/Galaxy E5 и L7/);
    expect(getBrand("deepal")?.note).toMatch(/Deepal S7 и S07/);
    for (const b of BRANDS) expect(b.note, b.id).not.toMatch(/проверен в тесте/);
  });

  it("knows sub-brands", () => {
    expect(childBrands("great-wall").map((b) => b.id)).toEqual(["haval", "tank"]);
    expect(childBrands("changan").map((b) => b.id)).toEqual(["deepal"]);
    expect(getBrand("nope")).toBeNull();
  });

  it("is read-only", () => {
    expect(Object.isFrozen(BRANDS)).toBe(true);
    expect(Object.isFrozen(BRANDS[0])).toBe(true);
    expect(Object.isFrozen(BRANDS[0].aliases)).toBe(true);
  });
});

describe("models", () => {
  it("has at least 90 models with unique kebab-case ids prefixed by the brand", () => {
    expect(MODELS.length).toBeGreaterThanOrEqual(90);
    const ids = MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MODELS) {
      expect(m.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(m.id.startsWith(`${m.brandId}-`), m.id).toBe(true);
    }
  });

  it("fills every field with valid values", () => {
    for (const m of MODELS) {
      const brand = getBrand(m.brandId);
      expect(brand, m.id).not.toBeNull();
      expect(m.brand, m.id).toBe(brand?.name);
      expect(m.brandZh, m.id).toBe(brand?.nameZh);
      expect(m.model.trim(), m.id).not.toBe("");
      if (m.modelZh) expect(m.modelZh, m.id).toMatch(/[一-鿿]/);
      expect(BODY_TYPES, m.id).toContain(m.body);
      expect(m.powertrains.length, m.id).toBeGreaterThan(0);
      expect(new Set(m.powertrains).size, m.id).toBe(m.powertrains.length);
      for (const p of m.powertrains) expect(POWERTRAINS, m.id).toContain(p);
      expect(Number.isInteger(m.yearFrom), m.id).toBe(true);
      expect(m.yearFrom, m.id).toBeGreaterThanOrEqual(2010);
      expect(m.yearFrom, m.id).toBeLessThanOrEqual(2026);
      if (m.yearTo !== null) expect(m.yearTo, m.id).toBeGreaterThanOrEqual(m.yearFrom);
      expect(m.popularIn.length, m.id).toBeGreaterThan(0);
      for (const market of m.popularIn) expect(MARKETS, m.id).toContain(market);
      expect(CAR_COLOR_IDS, m.id).toContain(m.defaultColor);
      if (m.segment) expect(m.segment, m.id).toMatch(/[А-Яа-яЁё]/);
      for (const a of m.aliases) expect(compact(a), `${m.id}: "${a}"`).not.toBe("");
    }
  });

  it("covers every brand, with the popular models first", () => {
    for (const b of BRANDS) {
      const list = modelsByBrand(b.id);
      expect(list.length, b.id).toBeGreaterThan(0);
      const firstPlain = list.findIndex((m) => !m.popular);
      if (firstPlain >= 0) expect(list.slice(firstPlain).some((m) => m.popular), b.id).toBe(false);
    }
    expect(MODELS.filter((m) => m.popular).length).toBeGreaterThanOrEqual(30);
  });

  it("covers the requested models", () => {
    const ids = [
      "byd-song-plus-dmi",
      "byd-song-plus-ev",
      "byd-song-pro",
      "byd-song-l",
      "byd-qin-plus-dmi",
      "byd-han",
      "byd-tang",
      "byd-seal",
      "byd-yuan-plus",
      "byd-yuan-up",
      "byd-dolphin",
      "byd-seagull",
      "byd-destroyer-05",
      "byd-frigate-07",
      "byd-leopard-5",
      "geely-monjaro",
      "geely-coolray",
      "geely-atlas",
      "geely-atlas-pro",
      "geely-tugella",
      "geely-emgrand",
      "geely-galaxy-l6",
      "geely-galaxy-l7",
      "geely-galaxy-e5",
      "geely-galaxy-e8",
      "geely-starship-7",
      "chery-tiggo-2-pro",
      "chery-tiggo-4-pro",
      "chery-tiggo-7-pro",
      "chery-tiggo-7-pro-max",
      "chery-tiggo-8-pro",
      "chery-tiggo-8-pro-max",
      "chery-arrizo-8",
      "jetour-dashing",
      "jetour-x70-plus",
      "jetour-x90-plus",
      "jetour-t2",
      "exeed-txl",
      "exeed-vx",
      "exeed-rx",
      "exeed-lx",
      "omoda-c5",
      "omoda-s5",
      "jaecoo-j7",
      "jaecoo-j8",
      "haval-jolion",
      "haval-h6",
      "haval-dargo",
      "haval-h9",
      "haval-m6",
      "haval-f7",
      "tank-300",
      "tank-400",
      "tank-500",
      "great-wall-poer",
      "great-wall-wingle-7",
      "changan-cs35-plus",
      "changan-cs55-plus",
      "changan-cs75-plus",
      "changan-uni-k",
      "changan-uni-v",
      "changan-alsvin",
      "changan-eado-plus",
      "changan-hunter",
      "deepal-s07",
      "deepal-s05",
      "deepal-sl03",
      "deepal-g318",
      "li-auto-l6",
      "li-auto-l7",
      "li-auto-l8",
      "li-auto-l9",
      "li-auto-mega",
      "zeekr-001",
      "zeekr-007",
      "zeekr-x",
      "zeekr-7x",
      "zeekr-009",
      "xiaomi-su7",
      "xiaomi-yu7",
      "aito-m5",
      "aito-m7",
      "aito-m9",
      "voyah-free",
      "voyah-dreamer",
      "hongqi-h5",
      "hongqi-hs5",
      "hongqi-e-hs9",
      "leapmotor-c10",
      "leapmotor-c11",
      "leapmotor-c16",
      "lynk-co-01",
      "lynk-co-05",
      "lynk-co-09",
      "gac-gs8",
      "gac-aion-s",
      "tenet-t4",
      "tenet-t7",
      "tenet-t8",
      "kaiyi-e5",
      "kaiyi-x3-pro",
      "dongfeng-shine-max",
      "bestune-t77",
    ];
    for (const id of ids) expect(getModel(id), id).not.toBeNull();
  });

  it("states the facts the product relies on", () => {
    const pt = (id: string) => getModel(id)?.powertrains;
    expect(pt("byd-song-plus-dmi")).toEqual(["phev"]);
    expect(pt("byd-song-plus-ev")).toEqual(["bev"]);
    expect(pt("li-auto-l9")).toEqual(["erev"]);
    expect(pt("zeekr-001")).toEqual(["bev"]);
    expect(pt("geely-monjaro")).toEqual(["ice"]);
    expect(getModel("byd-qin-plus-dmi")?.aliases).toContain("Chazor");
    expect(getModel("byd-yuan-plus")?.aliases).toContain("Atto 3");
    expect(getModel("geely-galaxy-e5")?.aliases).toContain("EX5");
    expect(getModel("tenet-t7")?.popularIn).toEqual(["RU"]);
  });

  it("never gives two models of one brand family the same name for the same years", () => {
    const family = (m: CarModel) => getBrand(m.brandId)?.parent ?? m.brandId;
    const overlap = (a: CarModel, b: CarModel) =>
      a.yearFrom <= (b.yearTo ?? Infinity) && b.yearFrom <= (a.yearTo ?? Infinity);
    const seen = new Map<string, CarModel>();
    for (const m of MODELS) {
      for (const v of modelVariants(m)) {
        const key = `${family(m)}:${v}`;
        const other = seen.get(key);
        if (other) expect(overlap(m, other), `${m.id} and ${other.id} are both "${v}"`).toBe(false);
        else seen.set(key, m);
      }
    }
  });

  it("is read-only", () => {
    expect(Object.isFrozen(MODELS)).toBe(true);
    const m = MODELS[0];
    expect(Object.isFrozen(m)).toBe(true);
    expect(Object.isFrozen(m.aliases)).toBe(true);
    expect(Object.isFrozen(m.powertrains)).toBe(true);
    expect(() => (m.powertrains as string[]).push("ice")).toThrow();
  });

  it("formats titles and years", () => {
    const song = getModel("byd-song-plus-dmi")!;
    expect(modelTitle(song)).toBe("BYD Song Plus DM-i");
    expect(modelYears(song)).toBe("с 2021");
    expect(modelYears(getModel("li-auto-one")!)).toBe("2019–2022");
    expect(getModel("unknown")).toBeNull();
    expect(getModel(null)).toBeNull();
    expect(modelsByBrand("unknown")).toEqual([]);
  });
});

describe("name text", () => {
  it("splits codes, glues hyphenated pieces and drops edition words", () => {
    expect(tokens("Song PLUS New Energy DM-i")).toEqual(["song", "plus", "dmi"]);
    expect(tokens("TIGGO7PRO")).toEqual(["tiggo", "7", "pro"]);
    expect(tokens("宋PLUS 冠军版")).toEqual(["宋", "plus"]);
    expect(tokens("UNI-K iDD")).toEqual(["unik", "idd"]);
    expect(tokens("Tiggo 8 Pro e+")).toEqual(["tiggo", "8", "pro", "e", "plus"]);
    expect(tokens("Champion Edition 150KM")).toEqual(["150", "km"]);
    expect(tokens("Х70 Плюс")).toEqual(["x", "70", "plus"]);
    expect(tokens(null)).toEqual([]);
  });

  it("matches names on runs of tokens", () => {
    const found = spans(tokens("Uni K iDD"));
    expect(found.has("unik")).toBe(true);
    expect(found.has("unikidd")).toBe(true);
    expect(found.has("kidd")).toBe(true);
    expect(found.has("uniidd")).toBe(false);
  });

  it("reads Russian words that are still being typed", () => {
    expect(latinPrefixes("монж")).toEqual(["monjaro"]);
    expect(latinPrefixes("тигго")).toEqual(["tiggo"]);
    expect(latinPrefixes("song")).toEqual(["song"]);
    expect(latinPrefixes("щщщ")).toEqual(["щщщ"]);
  });
});

describe("findBrand", () => {
  it.each([
    ["BYD", "byd"],
    ["比亚迪", "byd"],
    ["Geely Galaxy", "geely"],
    ["Changan Deepal", "deepal"],
    ["Great Wall Haval", "haval"],
    ["GWM", "great-wall"],
    ["Li Auto", "li-auto"],
    ["理想", "li-auto"],
    ["Lynk&Co", "lynk-co"],
    ["FAW Bestune", "bestune"],
    ["Chang'an", "changan"],
    ["Dongfeng Voyah", "voyah"],
  ])("%s → %s", (text, id) => {
    expect(findBrand(text)?.id).toBe(id);
  });

  it("returns null for unknown or ambiguous brands", () => {
    expect(findBrand("Toyota")).toBeNull();
    expect(findBrand("FAW")).toBeNull();
    expect(findBrand("")).toBeNull();
  });
});

describe("findModel", () => {
  it.each([
    // Strings seen in 17VIN decodes.
    ["BYD", "Song Plus New Energy DM-i", "byd-song-plus-dmi"],
    ["BYD", "Song PLUS New Energy EV", "byd-song-plus-ev"],
    ["BYD", "Yuan UP/Atto 2", "byd-yuan-up"],
    ["Geely Galaxy", "Galaxy E5/EX5", "geely-galaxy-e5"],
    ["Geely Galaxy", "Galaxy L7 EM-i", "geely-galaxy-l7"],
    ["Deepal", "Deepal S7", "deepal-s07"],
    ["Deepal", "Deepal S7i", "deepal-s07"],
    ["Deepal", "Deepal S07", "deepal-s07"],
    ["Li Auto", "L6", "li-auto-l6"],
    ["Li Auto", "L9", "li-auto-l9"],
    ["Zeekr", "001", "zeekr-001"],
    // Aliases and local names.
    ["BYD", "Chazor", "byd-qin-plus-dmi"],
    ["BYD", "Atto 3", "byd-yuan-plus"],
    ["BYD", "Seal U", "byd-song-plus-ev"],
    ["BYD", "Seal U DM-i", "byd-song-plus-dmi"],
    ["BYD", "Dolphin Mini", "byd-seagull"],
    ["Geely", "EX5", "geely-galaxy-e5"],
    ["Geely", "Xingyue L 2.0TD", "geely-monjaro"],
    ["Geely", "Xingyue S", "geely-tugella"],
    ["Geely", "Boyue L", "geely-atlas"],
    ["Jetour", "Traveller", "jetour-t2"],
    ["Fangchengbao", "Bao 5", "byd-leopard-5"],
    ["Haval", "Big Dog", "haval-dargo"],
    // Case, spaces, Plus/PLUS, trims and missing spaces.
    ["BYD", "Song Plus Champion Edition EV", "byd-song-plus-ev"],
    ["BYD", "SONG PLUS DM-I", "byd-song-plus-dmi"],
    ["byd", "Song Plus", "byd-song-plus-dmi"],
    ["BYD", "Qin PLUS EV", "byd-qin-plus-ev"],
    ["BYD", "Seal 06 DM-i", "byd-seal-06"],
    ["BYD", "Sealion 07 EV", "byd-sealion-07"],
    ["CHERY", "TIGGO8 PRO MAX", "chery-tiggo-8-pro-max"],
    ["Chery", "Tiggo 7 Pro Max AWD", "chery-tiggo-7-pro-max"],
    ["Chery", "Tiggo 7 Pro", "chery-tiggo-7-pro"],
    ["Changan", "CS55PLUS", "changan-cs55-plus"],
    ["Changan", "UNI K iDD", "changan-uni-k"],
    ["Hongqi", "E-HS9", "hongqi-e-hs9"],
    ["Zeekr", "7X", "zeekr-7x"],
    ["Zeekr", "X", "zeekr-x"],
    ["Li Auto", "L9 Ultra", "li-auto-l9"],
    ["BYD", "Han L", "byd-han-l"],
    ["BYD", "Han DM-i", "byd-han"],
    ["BYD", "Tang DM-p", "byd-tang"],
    ["BYD", "BYD Song PLUS New Energy Song Plus New Energy DM-i 1.5L", "byd-song-plus-dmi"],
    // The brand of a decode is sometimes the group, sometimes the sub-brand, sometimes in the model text.
    ["Changan", "Deepal S07", "deepal-s07"],
    ["Changan", "S07", "deepal-s07"],
    ["Great Wall", "Haval Jolion", "haval-jolion"],
    ["GWM", "Tank 300", "tank-300"],
    ["Chery", "Exeed TXL", "exeed-txl"],
    ["Chery", "Omoda 5", "omoda-c5"],
    ["Seres", "AITO M5", "aito-m5"],
    ["GAC", "Aion S Plus", "gac-aion-s"],
    ["Lynk & Co", "01 PHEV", "lynk-co-01"],
    ["FAW", "Bestune T77", "bestune-t77"],
    // Chinese.
    ["比亚迪", "宋PLUS DM-i", "byd-song-plus-dmi"],
    ["比亚迪", "元PLUS", "byd-yuan-plus"],
    ["吉利", "银河E5", "geely-galaxy-e5"],
    ["哈弗", "哈弗大狗", "haval-dargo"],
    ["", "理想L7", "li-auto-l7"],
    // No brand at all: only long, distinctive names.
    ["", "Monjaro", "geely-monjaro"],
    [null, "Tiggo 7 Pro Max", "chery-tiggo-7-pro-max"],
  ])("%s + %s → %s", (brand, model, id) => {
    expect(findModel(brand, model)?.id).toBe(id);
  });

  it("uses the year to tell generations apart", () => {
    expect(findModel("Geely", "Atlas", 2019)?.id).toBe("geely-atlas-nl3");
    expect(findModel("Geely", "Atlas", "2022")?.id).toBe("geely-atlas-nl3");
    expect(findModel("Geely", "Atlas", 2024)?.id).toBe("geely-atlas");
    expect(findModel("Geely", "Atlas", "202310")?.id).toBe("geely-atlas");
    expect(findModel("Geely", "Atlas")?.id).toBe("geely-atlas");
  });

  it("returns null instead of guessing", () => {
    expect(findModel("Toyota", "Camry")).toBeNull();
    expect(findModel("Unknown", "Song Plus")).toBeNull();
    expect(findModel("BYD", "Model Y")).toBeNull();
    expect(findModel("BYD", "Yuan Pro")).toBeNull();
    expect(findModel("Chery", "Tiggo 7")).toBeNull();
    expect(findModel("Deepal", "L07")).toBeNull();
    expect(findModel("", "L6")).toBeNull();
    expect(findModel("", "001")).toBeNull();
    expect(findModel("", "")).toBeNull();
    expect(findModel(null, null)).toBeNull();
  });

  it("refuses a year outside the model's years", () => {
    expect(findModel("Geely", "Emgrand", 2016)).toBeNull();
    expect(findModel("Geely", "Emgrand", 2020)?.id).toBe("geely-emgrand");
    expect(findModel("Haval", "H6", 2018)).toBeNull();
    expect(findModel("Haval", "H6", 2019)?.id).toBe("haval-h6");
  });

  it.each([
    ["Geely", "Emgrand X7", 2016],
    ["Geely", "Emgrand X7", null],
    ["Geely", "Emgrand EC7", 2014],
    ["Geely", "Emgrand EC7", null],
    ["BYD", "Seal 05 DM-i", 2024],
    ["Haval", "H6 Coupe", 2018],
    ["Haval", "H6 Coupe", null],
    ["Chery", "Tiggo 8 Pro e", null],
    ["Chery", "Tiggo 8 Plus", null],
    ["Changan", "CS55 Plus", 2017],
    ["Changan", "Hunter", null],
  ])("does not take %s %s (%s) for a model that only starts the same way", (brand, model, year) => {
    expect(findModel(brand, model, year)).toBeNull();
  });

  it("keeps trims, engine sizes and seats out of the model name", () => {
    expect(findModel("Chery", "Tiggo 8 Pro e+", 2023)?.id).toBe("chery-tiggo-8-pro");
    expect(findModel("Changan", "Hunter Plus")?.id).toBe("changan-hunter");
    expect(findModel("Li Auto", "L9 Pro 6 seats", 2024)?.id).toBe("li-auto-l9");
    expect(findModel("Li Auto", "L9 Max", 2024)?.id).toBe("li-auto-l9");
    expect(findModel("Geely", "Monjaro 2.0TD 4WD", 2024)?.id).toBe("geely-monjaro");
    expect(findModel("BYD", "Song Plus DM-i 1.5L 2023", 2023)?.id).toBe("byd-song-plus-dmi");
    expect(findModel("Deepal", "S07 7座", 2024)?.id).toBe("deepal-s07");
    expect(findModel("GAC", "Aion S Plus", 2022)?.id).toBe("gac-aion-s");
  });

  it("does not take a longer name for a shorter one", () => {
    expect(findModel("BYD", "Sealion 05")).toBeNull();
    expect(findModel("Li Auto", "L9 Pro 6 seats")?.id).toBe("li-auto-l9");
    expect(findModel("Hongqi", "HS5")?.id).toBe("hongqi-hs5");
    expect(findModel("Hongqi", "H5")?.id).toBe("hongqi-h5");
  });
});

describe("searchModels", () => {
  const ids = (q: string, limit?: number) => searchModels(q, limit).map((m) => m.id);

  it("finds by brand, model, prefix and Chinese name", () => {
    expect(ids("monj")).toEqual(["geely-monjaro"]);
    expect(ids("tiggo 7")).toEqual(["chery-tiggo-7-pro-max", "chery-tiggo-7-pro"]);
    expect(ids("zeekr").length).toBe(modelsByBrand("zeekr").length);
    expect(ids("宋")[0]).toBe("byd-song-plus-dmi");
    expect(ids("atto 3")).toEqual(["byd-yuan-plus"]);
  });

  it("puts the exact name first", () => {
    expect(ids("s7")[0]).toBe("deepal-s07");
    expect(ids("byd song plus")[0]).toBe("byd-song-plus-dmi");
    expect(ids("song plus ev")[0]).toBe("byd-song-plus-ev");
    expect(ids("atlas pro")).toEqual(["geely-atlas-pro"]);
    expect(ids("galaxy", 5).every((id) => id.startsWith("geely-galaxy-") || id === "geely-starship-7")).toBe(true);
    expect(ids("c5")).toEqual(["omoda-c5"]);
    expect(ids("т2")).toEqual(["jetour-t2"]);
  });

  it("understands Russian spellings and Cyrillic look-alike letters", () => {
    expect(ids("монжаро")).toEqual(["geely-monjaro"]);
    expect(ids("тигго 8 про макс")[0]).toBe("chery-tiggo-8-pro-max");
    expect(ids("чазор")).toEqual(["byd-qin-plus-dmi"]);
    expect(ids("Хавал Н6")[0]).toBe("haval-h6");
    expect(ids("джетур Х70")).toEqual(["jetour-x70-plus"]);
    expect(ids("зикр 001")[0]).toBe("zeekr-001");
  });

  it("returns nothing for an empty or unknown query and respects the limit", () => {
    expect(searchModels("")).toEqual([]);
    expect(searchModels(null)).toEqual([]);
    expect(searchModels("camry")).toEqual([]);
    expect(ids("byd", 3)).toHaveLength(3);
    expect(ids("byd", 3)).toEqual(["byd-song-plus-dmi", "byd-song-plus-ev", "byd-qin-plus-dmi"]);
  });
});
