export const PART_GROUPS = [
  "maintenance",
  "brakes",
  "suspension",
  "steering",
  "body",
  "optics",
  "glass",
  "electrical",
  "adas",
  "interior",
  "cooling",
  "engine",
  "transmission",
  "hv",
  "wheels",
] as const;
export type PartGroup = (typeof PART_GROUPS)[number];

export type Axis = "front" | "rear";
export type Side = "left" | "right";
export type Position = "upper" | "lower" | "inner" | "outer";

export interface PartType {
  // Stable kebab-case slug, stored in part_requests.part_type_id and fitments.part_type_id. Never rename.
  id: string;
  group: PartGroup;
  ru: string;
  // Aftermarket/EPC name without side and axis prefixes; zhLabel() adds them.
  zh: string;
  en: string;
  // Russian colloquial forms, common misspellings, Kazakh and Uzbek forms.
  synonyms: string[];
  needsSide: boolean;
  needsAxis: boolean;
  // Words that appear in EPC category and part names (English and Chinese).
  epcHints: string[];
}

export const groupLabels: Record<PartGroup, string> = {
  maintenance: "Техобслуживание",
  brakes: "Тормоза",
  suspension: "Подвеска",
  steering: "Рулевое управление",
  body: "Кузов",
  optics: "Оптика",
  glass: "Стёкла",
  electrical: "Электрика",
  adas: "Камеры и радары",
  interior: "Салон",
  cooling: "Охлаждение и климат",
  engine: "Двигатель",
  transmission: "Трансмиссия",
  hv: "Высоковольтная система",
  wheels: "Колёса и шины",
};

// For sourcer screens, which show Chinese labels next to Russian ones.
export const groupLabelsZh: Record<PartGroup, string> = {
  maintenance: "保养件",
  brakes: "制动系统",
  suspension: "悬架系统",
  steering: "转向系统",
  body: "车身",
  optics: "灯具",
  glass: "玻璃",
  electrical: "电器",
  adas: "智能驾驶",
  interior: "内饰",
  cooling: "冷却与空调",
  engine: "发动机",
  transmission: "传动系统",
  hv: "高压系统",
  wheels: "车轮轮胎",
};

const split = (list: string) =>
  list
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

// Compact row format for the dictionary: lists are "|"-separated, needs is "A" (axis), "S" (side) or "AS".
export function definer(group: PartGroup) {
  return (id: string, ru: string, zh: string, en: string, synonyms: string, epcHints: string, needs = ""): PartType => ({
    id,
    group,
    ru,
    zh,
    en,
    synonyms: split(synonyms),
    needsSide: needs.includes("S"),
    needsAxis: needs.includes("A"),
    epcHints: split(epcHints),
  });
}
