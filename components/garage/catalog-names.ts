// Russian names for the English text 17VIN returns: catalog groups ("01 Engine Package") and the trim facts of a
// decode ("Front-engine FWD", "PHEV"). A name we do not know stays as it came, marked as English so screen readers
// read it right. Sourcer screens keep the provider's own text.

export type CatalogName = { ru: string; original: string | null; lang?: "en" };

// Group names of the BYD, Geely and Changan EPCs, lowercased, without the "01 " prefix.
const GROUPS: Record<string, string> = {
  "engine package": "Двигатель",
  engine: "Двигатель",
  "engine assembly": "Двигатель",
  "power system": "Силовая установка",
  "chassis assembly": "Шасси и подвеска",
  chassis: "Шасси и подвеска",
  "body and body accessories": "Кузов и аксессуары",
  body: "Кузов",
  "body accessories": "Аксессуары кузова",
  "electrical equipment": "Электрооборудование",
  electrical: "Электрооборудование",
  "electrical system": "Электрооборудование",
  transmission: "Трансмиссия",
  "transmission system": "Трансмиссия",
  "drive system": "Привод",
  "interior and exterior trim": "Отделка салона и кузова",
  interior: "Салон",
  "interior trim": "Отделка салона",
  "exterior trim": "Наружная отделка",
  "air conditioning": "Кондиционер",
  "air conditioning system": "Кондиционер",
  "hvac system": "Климат",
  "cooling system": "Система охлаждения",
  "fuel system": "Топливная система",
  "exhaust system": "Выхлопная система",
  "steering system": "Рулевое управление",
  "brake system": "Тормозная система",
  "suspension system": "Подвеска",
  "front suspension": "Передняя подвеска",
  "rear suspension": "Задняя подвеска",
  "wheels and tires": "Колёса и шины",
  lighting: "Освещение",
  telematics: "Телематика",
  "high voltage system": "Высоковольтная система",
  "power battery": "Тяговая батарея",
  "drive motor": "Тяговый электромотор",
  "engine lubrication and air intake": "Смазка и впуск двигателя",
  "oil filter and lubrication": "Масляный фильтр и смазка",
  "air intake system": "Впускная система",
  "front brake": "Передние тормоза",
  "rear brake": "Задние тормоза",
  "body in white": "Кузов в сборе",
  "body main": "Основа кузова",
  "front hood and fenders": "Капот и крылья",
  "front hood": "Капот",
  headlamps: "Фары",
  "rear lamps": "Задние фонари",
  "tail lamps": "Задние фонари",
  "seats": "Сиденья",
  "safety system": "Подушки и ремни безопасности",
  "glass and mirrors": "Стёкла и зеркала",
  doors: "Двери",
  bumpers: "Бамперы",
};

// "01 ", "10-03 ", "B1 ": the group code in front of the name.
const PREFIX = /^\s*[A-Z]?\d{1,3}(?:[-.]\d{1,3})*\s*[-.:)]?\s+/;
const LATIN = /[a-z]/i;
const CYRILLIC = /[а-яё]/i;

/** "01 Engine Package" → Двигатель (original kept for a muted line); unknown English stays English, with lang. */
export function catalogGroupName(name: string | null | undefined): CatalogName {
  const raw = String(name ?? "").trim();
  const bare = raw.replace(PREFIX, "").trim() || raw;
  const known = GROUPS[bare.toLowerCase().replace(/\s+/g, " ")];
  if (known) return { ru: known, original: raw };
  if (CYRILLIC.test(bare) || !LATIN.test(bare)) return { ru: bare, original: null };
  return { ru: bare, original: null, lang: "en" };
}

const DRIVE: [RegExp, string][] = [
  [/\b(awd|4wd|4x4|all[- ]wheel drive)\b/i, "полный привод"],
  [/\b(fwd|front[- ]wheel drive)\b/i, "передний привод"],
  [/\b(rwd|rear[- ]wheel drive)\b/i, "задний привод"],
];
const LAYOUT: [RegExp, string][] = [
  [/\btri[- ]motor\b/i, "три электромотора"],
  [/\bdual[- ]motor\b/i, "два электромотора"],
  [/\bsingle[- ]motor\b/i, "один электромотор"],
  [/\bfront[- ]engine\b/i, "двигатель спереди"],
  [/\brear[- ]engine\b/i, "двигатель сзади"],
  [/\bmid[- ]engine\b/i, "двигатель в базе"],
];

/** "Front-engine FWD" → "передний привод, двигатель спереди"; unknown text stays as it came. */
export function driveText(drive: string | null | undefined): CatalogName {
  const raw = String(drive ?? "").trim();
  if (!raw) return { ru: "", original: null };
  const parts = [DRIVE.find(([re]) => re.test(raw))?.[1], LAYOUT.find(([re]) => re.test(raw))?.[1]].filter(Boolean) as string[];
  if (parts.length) return { ru: parts.join(", "), original: raw };
  return LATIN.test(raw) && !CYRILLIC.test(raw) ? { ru: raw, original: null, lang: "en" } : { ru: raw, original: null };
}

const FUEL: Record<string, string> = {
  phev: "подключаемый гибрид",
  "plug-in hybrid": "подключаемый гибрид",
  erev: "последовательный гибрид",
  reev: "последовательный гибрид",
  "range extender": "последовательный гибрид",
  bev: "электро",
  ev: "электро",
  electric: "электро",
  hev: "гибрид",
  hybrid: "гибрид",
  gasoline: "бензин",
  petrol: "бензин",
  diesel: "дизель",
};

/** "PHEV" → "подключаемый гибрид"; unknown text stays as it came. */
export function fuelText(fuel: string | null | undefined): CatalogName {
  const raw = String(fuel ?? "").trim();
  const known = FUEL[raw.toLowerCase()];
  if (known) return { ru: known, original: raw };
  return LATIN.test(raw) && !CYRILLIC.test(raw) ? { ru: raw, original: null, lang: "en" } : { ru: raw, original: null };
}
