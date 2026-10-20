// Shared vocabulary of the model catalog. The ids match components/car (bodies, powertrains, paint colors)
// so the UI can pass catalog values straight to the car illustration; lib code never imports components.

export const BODY_TYPES = ["crossover", "suv", "offroad", "sedan", "liftback", "hatchback", "minivan", "pickup"] as const;
export type BodyType = (typeof BODY_TYPES)[number];

export const POWERTRAINS = ["ice", "hev", "phev", "erev", "bev"] as const;
export type Powertrain = (typeof POWERTRAINS)[number];

/** Powertrains with a combustion engine: engine oil, filters, exhaust, fuel system. */
export const ENGINE_POWERTRAINS: readonly Powertrain[] = ["ice", "hev", "phev", "erev"];
/** Powertrains with a traction battery, an inverter and an electric motor: full hybrids too, plug-in or not. */
export const HV_POWERTRAINS: readonly Powertrain[] = ["hev", "phev", "erev", "bev"];
/** Plug-in powertrains: a charge port, an on-board charger and a charging cable on top of the high-voltage system. */
export const PLUG_IN_POWERTRAINS: readonly Powertrain[] = ["phev", "erev", "bev"];

export const POWERTRAIN_LABELS: Record<Powertrain, string> = {
  ice: "ДВС",
  hev: "Гибрид",
  phev: "Подключаемый гибрид",
  erev: "Последовательный гибрид",
  bev: "Электромобиль",
};

export const MARKETS = ["KZ", "UZ", "KG", "RU"] as const;
export type Market = (typeof MARKETS)[number];

export const MARKET_LABELS: Record<Market, string> = {
  KZ: "Казахстан",
  UZ: "Узбекистан",
  KG: "Кыргызстан",
  RU: "Россия",
};

// The same ids as CAR_COLORS in components/car/colors.ts (a test keeps them in sync).
export const CAR_COLOR_IDS = [
  "white",
  "black",
  "graphite",
  "silver",
  "blue",
  "zeekr-green",
  "red",
  "beige",
  "tank-green",
] as const;
export type CarColorId = (typeof CAR_COLOR_IDS)[number];

export const BRAND_IDS = [
  "byd",
  "geely",
  "chery",
  "exeed",
  "jetour",
  "omoda",
  "jaecoo",
  "tenet",
  "haval",
  "tank",
  "great-wall",
  "changan",
  "deepal",
  "li-auto",
  "zeekr",
  "xiaomi",
  "aito",
  "voyah",
  "hongqi",
  "leapmotor",
  "lynk-co",
  "gac",
  "kaiyi",
  "dongfeng",
  "bestune",
] as const;
export type BrandId = (typeof BRAND_IDS)[number];

/**
 * What the parts catalog by VIN can do for a brand:
 * - vin_catalog: 17VIN returned a parts catalog for this brand's VINs in our trial (docs/17vin.md);
 * - manual: 17VIN decodes the VIN but has no parts catalog, a sourcer picks parts by hand;
 * - checking: not tested yet.
 */
export type CatalogStatus = "vin_catalog" | "manual" | "checking";

export interface Brand {
  id: BrandId;
  name: string;
  /** Chinese brand name for sourcer screens; empty for brands that exist only outside China (Tenet). */
  nameZh: string;
  /** Other spellings seen in VIN decodes and on the market: "BYD Auto", "Geely Galaxy", "GWM", "理想". */
  aliases: string[];
  /** The group brand that sells this sub-brand, e.g. Deepal → Changan. Decodes often name either one. */
  parent?: BrandId;
  catalogStatus: CatalogStatus;
  /** One short Russian sentence about how parts are picked for this brand. */
  note: string;
}

export interface CarModel {
  /** Stable slug "<brand id>-<model>", e.g. "byd-song-plus-dmi". Never rename: it may be stored. */
  id: string;
  brandId: BrandId;
  /** Display brand, e.g. "BYD". */
  brand: string;
  /** Chinese brand name, e.g. "比亚迪". */
  brandZh: string;
  /** Display model without the brand, e.g. "Song Plus DM-i". */
  model: string;
  modelZh?: string;
  /** Export and local names of the same car: Yuan Plus = Atto 3, Galaxy E5 = EX5, Qin Plus DM-i = Chazor. */
  aliases: string[];
  body: BodyType;
  /** Powertrains this model line is sold with, the most common first. The VIN decode tells which one a car has. */
  powertrains: Powertrain[];
  yearFrom: number;
  /** null: still produced. */
  yearTo: number | null;
  segment?: string;
  popularIn: Market[];
  /** Shown first in pickers and on the landing page. */
  popular: boolean;
  defaultColor: CarColorId;
  /** false: an off-roader without a spare wheel on the tailgate (Haval Dargo); the picture draws one otherwise. */
  spare?: boolean;
}
