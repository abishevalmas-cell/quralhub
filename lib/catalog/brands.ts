import type { Brand, BrandId } from "./types";

const CHECKING = "Каталог по VIN ещё не проверяли. Номер детали сверит подборщик.";

// Catalog status comes from the 17VIN trial of 12.10.2026 (docs/17vin.md), which tested 15 VINs: BYD (Song Plus DM-i,
// Song Plus EV, Yuan Up), Geely Galaxy (E5, L7) and Deepal (S7, S07, served by the Changan catalog) returned a parts
// catalog; Li Auto and Zeekr VINs decoded but had no catalog. A Changan-branded VIN was not tested, so Changan stays
// "checking" although its catalog answered for Deepal. The notes say exactly which VINs were tried: the status is a
// brand-level observation, never a promise for a given model.
const ROWS: Brand[] = [
  {
    id: "byd",
    name: "BYD",
    nameZh: "比亚迪",
    aliases: ["BYD Auto", "Fangchengbao", "Fang Cheng Bao", "方程豹"],
    catalogStatus: "vin_catalog",
    note: "Каталог по VIN открылся для VIN Song Plus и Yuan Up. Для других моделей проверим по вашему VIN.",
  },
  {
    id: "geely",
    name: "Geely",
    nameZh: "吉利",
    aliases: ["Geely Auto", "Geely Galaxy", "Galaxy", "银河", "吉利银河"],
    catalogStatus: "vin_catalog",
    note: "Каталог по VIN открылся для VIN Galaxy E5 и L7. Для других моделей проверим по вашему VIN.",
  },
  { id: "chery", name: "Chery", nameZh: "奇瑞", aliases: ["Chery Automobile"], catalogStatus: "checking", note: CHECKING },
  {
    id: "exeed",
    name: "Exeed",
    nameZh: "星途",
    aliases: ["Exceed", "Chery Exeed", "Xingtu"],
    parent: "chery",
    catalogStatus: "checking",
    note: CHECKING,
  },
  { id: "jetour", name: "Jetour", nameZh: "捷途", aliases: ["Chery Jetour"], parent: "chery", catalogStatus: "checking", note: CHECKING },
  { id: "omoda", name: "Omoda", nameZh: "欧萌达", aliases: ["Chery Omoda"], parent: "chery", catalogStatus: "checking", note: CHECKING },
  { id: "jaecoo", name: "Jaecoo", nameZh: "捷酷", aliases: ["Chery Jaecoo"], parent: "chery", catalogStatus: "checking", note: CHECKING },
  {
    id: "tenet",
    name: "Tenet",
    nameZh: "",
    aliases: [],
    parent: "chery",
    catalogStatus: "checking",
    note: "Сборка в России на базе моделей Chery. Каталог по VIN ещё не проверяли.",
  },
  { id: "haval", name: "Haval", nameZh: "哈弗", aliases: ["Great Wall Haval", "GWM Haval"], parent: "great-wall", catalogStatus: "checking", note: CHECKING },
  { id: "tank", name: "Tank", nameZh: "坦克", aliases: ["GWM Tank"], parent: "great-wall", catalogStatus: "checking", note: CHECKING },
  {
    id: "great-wall",
    name: "Great Wall",
    nameZh: "长城",
    aliases: ["GWM", "Great Wall Motor", "Great Wall Motors"],
    catalogStatus: "checking",
    note: CHECKING,
  },
  {
    id: "changan",
    name: "Changan",
    nameZh: "长安",
    aliases: ["Chang'an", "Changan Auto", "Kaicene", "凯程"],
    catalogStatus: "checking",
    note: "Каталог Changan открылся для VIN Deepal, а VIN самих Changan ещё не проверяли. Номер детали сверит подборщик.",
  },
  {
    id: "deepal",
    name: "Deepal",
    nameZh: "深蓝",
    aliases: ["Changan Deepal", "Shenlan"],
    parent: "changan",
    catalogStatus: "vin_catalog",
    note: "Каталог по VIN (каталог Changan) открылся для VIN Deepal S7 и S07.",
  },
  {
    id: "li-auto",
    name: "Li Auto",
    nameZh: "理想",
    aliases: ["Lixiang", "Li Xiang", "Leading Ideal"],
    catalogStatus: "manual",
    note: "У 17VIN пока нет каталога Li Auto. Подбираем детали вручную по VIN и фото.",
  },
  {
    id: "zeekr",
    name: "Zeekr",
    nameZh: "极氪",
    aliases: ["Jike"],
    catalogStatus: "manual",
    note: "У 17VIN нет каталога Zeekr. Подбираем детали вручную по VIN и фото.",
  },
  { id: "xiaomi", name: "Xiaomi", nameZh: "小米", aliases: ["Xiaomi Auto"], catalogStatus: "checking", note: CHECKING },
  { id: "aito", name: "AITO", nameZh: "问界", aliases: ["Seres", "赛力斯", "Wenjie"], catalogStatus: "checking", note: CHECKING },
  { id: "voyah", name: "Voyah", nameZh: "岚图", aliases: ["Dongfeng Voyah", "Lantu"], parent: "dongfeng", catalogStatus: "checking", note: CHECKING },
  { id: "hongqi", name: "Hongqi", nameZh: "红旗", aliases: ["FAW Hongqi", "FAW", "一汽红旗"], catalogStatus: "checking", note: CHECKING },
  { id: "leapmotor", name: "Leapmotor", nameZh: "零跑", aliases: ["Leap Motor", "Lingpao"], catalogStatus: "checking", note: CHECKING },
  { id: "lynk-co", name: "Lynk & Co", nameZh: "领克", aliases: ["Lynkco", "Lingke"], catalogStatus: "checking", note: CHECKING },
  {
    id: "gac",
    name: "GAC",
    nameZh: "广汽",
    aliases: ["GAC Motor", "Trumpchi", "传祺", "GAC Aion", "Aion", "埃安", "广汽传祺", "广汽埃安"],
    catalogStatus: "checking",
    note: CHECKING,
  },
  { id: "kaiyi", name: "Kaiyi", nameZh: "凯翼", aliases: [], catalogStatus: "checking", note: CHECKING },
  {
    id: "dongfeng",
    name: "Dongfeng",
    nameZh: "东风",
    aliases: ["Dongfeng Fengshen", "Aeolus", "Dongfeng Aeolus", "风神", "东风风神"],
    catalogStatus: "checking",
    note: CHECKING,
  },
  { id: "bestune", name: "Bestune", nameZh: "奔腾", aliases: ["FAW Bestune", "FAW", "一汽奔腾"], catalogStatus: "checking", note: CHECKING },
];

function freeze(brand: Brand): Brand {
  Object.freeze(brand.aliases);
  return Object.freeze(brand);
}

export const BRANDS: readonly Brand[] = Object.freeze(ROWS.map(freeze));

const BY_ID = new Map(BRANDS.map((b) => [b.id, b]));

export function getBrand(id: string | null | undefined): Brand | null {
  return (id && BY_ID.get(id as BrandId)) || null;
}

/** Sub-brands sold under this brand, e.g. great-wall → haval, tank. */
export function childBrands(id: BrandId): Brand[] {
  return BRANDS.filter((b) => b.parent === id);
}
