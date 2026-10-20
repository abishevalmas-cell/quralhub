import { getPartType, type PartType } from "@/lib/taxonomy";
import { ENGINE_POWERTRAINS, HV_POWERTRAINS, PLUG_IN_POWERTRAINS, POWERTRAINS, type Powertrain } from "./types";
import type { ZoneId } from "./zones";

// The parts assortment customers browse: taxonomy part types arranged in groups people recognise from parts
// shops, filtered by what the car physically has (an electric car has no oil filter, a petrol car no traction
// battery). It lists kinds of parts, not offers: it never says that a part exists for a VIN or what it costs.

/** Icon names of components/ui/icon that the groups use (a test keeps them in sync). */
export type CatalogIcon =
  | "filter"
  | "disc"
  | "wrench"
  | "car"
  | "light"
  | "grid"
  | "bolt"
  | "camera"
  | "seat"
  | "thermo"
  | "engine"
  | "battery"
  | "wheel";

export const DISPLAY_GROUP_IDS = [
  "maintenance",
  "brakes",
  "chassis",
  "body",
  "optics",
  "glass",
  "electrical",
  "adas",
  "interior",
  "climate",
  "powertrain",
  "hv",
  "wheels",
] as const;
export type DisplayGroupId = (typeof DISPLAY_GROUP_IDS)[number];

export interface DisplayGroupItem {
  partTypeId: string;
  /** Among the most requested parts of the group; listed first. */
  popular: boolean;
  /** Shown only for these powertrains; absent: for every car. */
  only?: readonly Powertrain[];
}

export interface DisplayGroup {
  id: DisplayGroupId;
  title: string;
  titleZh: string;
  description: string;
  icon: CatalogIcon;
  /** The whole group exists only for these powertrains. */
  only?: readonly Powertrain[];
  items: readonly DisplayGroupItem[];
}

const ENGINE = ENGINE_POWERTRAINS;
// A full hybrid (HEV) has a traction battery, an inverter and e-motors but no charge port.
const HV = HV_POWERTRAINS;
const PLUG = PLUG_IN_POWERTRAINS;
const ICE: readonly Powertrain[] = ["ice"];
const ICE_HEV: readonly Powertrain[] = ["ice", "hev"];
// Cars with a stepped or hybrid gearbox. A series hybrid (EREV) drives through a reducer like an electric car.
const GEARBOX: readonly Powertrain[] = ["ice", "hev", "phev"];

// "id" → a part every car has; ["id", only] → a part only cars with those powertrains have.
type Row = string | readonly [string, readonly Powertrain[]];

function items(popular: Row[], rest: Row[]): DisplayGroupItem[] {
  const make = (row: Row, isPopular: boolean): DisplayGroupItem =>
    typeof row === "string" ? { partTypeId: row, popular: isPopular } : { partTypeId: row[0], popular: isPopular, only: row[1] };
  return [...popular.map((r) => make(r, true)), ...rest.map((r) => make(r, false))];
}

const GROUPS: DisplayGroup[] = [
  {
    id: "maintenance",
    title: "ТО и расходники",
    titleZh: "保养件",
    description: "Фильтры, масла, жидкости, щётки и свечи",
    icon: "filter",
    items: items(
      ["cabin-filter", ["oil-filter", ENGINE], ["air-filter", ENGINE], ["engine-oil", ENGINE], "wiper-blade", ["spark-plug", ENGINE]],
      ["coolant", "brake-fluid", ["transmission-fluid", ENGINE], ["fuel-filter", ENGINE], "rear-wiper-blade"],
    ),
  },
  {
    id: "brakes",
    title: "Тормоза",
    titleZh: "制动系统",
    description: "Колодки, диски, суппорты, датчики ABS и стояночный тормоз",
    icon: "disc",
    items: items(
      ["brake-pads", "brake-disc", "brake-caliper", "abs-sensor", "parking-brake-motor"],
      [
        "brake-hose",
        "caliper-repair-kit",
        "brake-drum",
        "brake-shoes",
        "brake-pipe",
        "brake-master-cylinder",
        ["brake-booster", ENGINE],
        "electric-brake-booster",
        "brake-vacuum-pump",
        "abs-unit",
        "brake-light-switch",
      ],
    ),
  },
  {
    id: "chassis",
    title: "Подвеска и рулевое",
    titleZh: "悬架与转向",
    description: "Амортизаторы, рычаги, ступицы, рулевые тяги и приводы колёс",
    icon: "wrench",
    items: items(
      ["shock-absorber", "lower-arm", "stabilizer-link", "tie-rod-end", "wheel-bearing", "ball-joint"],
      [
        "arm-bushing",
        "strut-mount",
        "strut-bearing",
        "coil-spring",
        "shock-boot",
        "upper-arm",
        "trailing-arm",
        "lateral-link",
        "stabilizer-bushing",
        "stabilizer-bar",
        "wheel-hub",
        "steering-knuckle",
        "cv-joint",
        "cv-boot",
        "drive-shaft",
        "tie-rod",
        "steering-rack",
        "steering-rack-boot",
        "steering-column",
        ["power-steering-pump", ENGINE],
        "subframe",
        "rear-beam",
        "subframe-bushing",
        "air-spring",
        "air-suspension-compressor",
        "air-suspension-valve",
        "ride-height-sensor",
      ],
    ),
  },
  {
    id: "body",
    title: "Кузов",
    titleZh: "车身",
    description: "Бамперы, капот, крылья, двери, крышка багажника и крепёж",
    icon: "car",
    items: items(
      ["bumper", "hood", "fender", "door", "tailgate", "grille"],
      [
        "bumper-bracket",
        "bumper-beam",
        "bumper-grille",
        "bumper-lip",
        "rear-diffuser",
        "fender-liner",
        "rear-quarter-panel",
        "door-handle",
        "door-inner-handle",
        "door-lock",
        "door-hinge",
        "door-check",
        "door-seal",
        "door-moulding",
        "window-regulator",
        "window-motor",
        "hood-hinge",
        "hood-lock",
        "hood-strut",
        "tailgate-strut",
        "power-tailgate-actuator",
        "tailgate-lock",
        "tailgate-handle",
        "tailgate-trim",
        "spoiler",
        "roof-rails",
        "roof-panel",
        "side-skirt",
        "wheel-arch-trim",
        "mud-flap",
        "emblem",
        "license-plate-bracket",
        "tow-hook-cover",
        "tow-hitch",
        ["fuel-door", ENGINE],
        "front-panel",
        "cowl",
        "underbody-shield",
      ],
    ),
  },
  {
    id: "optics",
    title: "Оптика",
    titleZh: "灯具",
    description: "Фары, задние фонари, ПТФ, ДХО и лампы",
    icon: "light",
    items: items(
      ["headlight", "tail-light", "fog-lamp", "headlight-lens", "headlight-bracket", "drl"],
      [
        "tail-light-center",
        "tail-light-inner",
        "headlight-module",
        "headlight-bulb",
        "fog-lamp-cover",
        "rear-fog-lamp",
        "third-brake-light",
        "turn-signal-repeater",
        "reflector",
        "license-plate-light",
        "headlight-washer",
      ],
    ),
  },
  {
    id: "glass",
    title: "Стёкла и зеркала",
    titleZh: "玻璃与后视镜",
    description: "Лобовое и боковые стёкла, люк, боковые и салонное зеркала",
    icon: "grid",
    items: items(
      ["windshield", "mirror", "side-window-glass", "mirror-glass", "mirror-cover", "rear-window-glass"],
      [
        "mirror-turn-signal",
        "mirror-motor",
        "interior-mirror",
        "quarter-glass",
        "sunroof-glass",
        "sunroof-mechanism",
        "sunroof-shade",
        "glass-run-channel",
        "belt-moulding",
      ],
    ),
  },
  {
    id: "electrical",
    title: "Электрика и датчики",
    titleZh: "电器与传感器",
    description: "Аккумулятор 12 В, ключи, блоки управления, проводка и датчики",
    icon: "bolt",
    items: items(
      ["battery-12v", "smart-key", "wiper-motor", "horn", "bcm"],
      [
        "window-switch",
        "wiper-linkage",
        "wiper-arm",
        "washer-reservoir",
        "washer-pump",
        "washer-nozzle",
        "rain-light-sensor",
        "ambient-temp-sensor",
        "steering-angle-sensor",
        "clock-spring",
        "steering-column-switch",
        "key-card",
        "key-shell",
        "start-button",
        "keyless-module",
        "fuse-box",
        "wiring-harness",
        "connector",
        "speaker",
        "amplifier",
        "antenna",
        "tbox",
        "accelerator-pedal",
        "wireless-charger",
        "usb-port",
        ["alternator", ICE],
        ["starter", ICE],
      ],
    ),
  },
  {
    id: "adas",
    title: "Системы помощи водителю (ADAS)",
    titleZh: "智能驾驶辅助",
    description: "Радары, камеры, парктроники, лидар и проекционный дисплей",
    icon: "camera",
    items: items(
      ["front-radar", "rear-camera", "parking-sensor", "front-camera", "surround-camera", "corner-radar"],
      ["ultrasonic-sensor", "parking-sensor-bracket", "lidar", "driver-camera", "adas-controller", "hud"],
    ),
  },
  {
    id: "interior",
    title: "Салон и комфорт",
    titleZh: "内饰与舒适",
    description: "Экраны, руль, сиденья, подушки безопасности и обшивки",
    icon: "seat",
    items: items(
      ["central-screen", "floor-mats", "seat-cover", "steering-wheel", "airbag", "instrument-cluster"],
      [
        "head-unit",
        "passenger-screen",
        "rear-screen",
        "armrest",
        "center-console",
        "dashboard",
        "glovebox",
        "gear-selector",
        "curtain-airbag",
        "airbag-module",
        "seat-belt",
        "seat-belt-buckle",
        "seat",
        "seat-motor",
        "seat-heater",
        "seat-switch",
        "headrest",
        "sun-visor",
        "headliner",
        "pillar-trim",
        "door-trim-panel",
        "sill-plate",
        "carpet",
        "trunk-cover",
        "trunk-trim",
        "grab-handle",
        "cup-holder",
        "interior-light",
        "ambient-light",
      ],
    ),
  },
  {
    id: "climate",
    title: "Климат и охлаждение",
    titleZh: "空调与冷却",
    description: "Кондиционер, радиаторы, вентиляторы, печка и помпы",
    icon: "thermo",
    items: items(
      ["ac-compressor", "condenser", "radiator", "cooling-fan", "heater-blower", "electric-coolant-pump"],
      [
        "climate-panel",
        "coolant-reservoir",
        "coolant-hose",
        ["thermostat", ENGINE],
        ["water-pump", ENGINE],
        ["thermal-valve", PLUG],
        ["intercooler", ENGINE],
        "evaporator",
        "expansion-valve",
        "ac-pipe",
        "heater-core",
        "blend-door-actuator",
      ],
    ),
  },
  {
    id: "powertrain",
    title: "Двигатель и трансмиссия",
    titleZh: "发动机与变速箱",
    description: "Опоры, ГРМ, зажигание, топливная система, выхлоп и коробка передач",
    icon: "engine",
    only: ENGINE,
    items: items(
      ["engine-mount", "ignition-coil", "timing-chain", "drive-belt", "turbocharger", "valve-cover-gasket"],
      [
        "torque-rod",
        "timing-chain-tensioner",
        "timing-belt",
        "belt-tensioner",
        "head-gasket",
        "engine-gasket-set",
        "oil-seal",
        "oil-pan",
        "oil-pump",
        "intake-manifold",
        "air-intake-hose",
        "throttle-body",
        "fuel-injector",
        "fuel-pump",
        "hp-fuel-pump",
        "fuel-tank",
        "fuel-cap",
        "o2-sensor",
        "crank-sensor",
        "cam-sensor",
        "vvt-solenoid",
        "coolant-temp-sensor",
        "map-sensor",
        "maf-sensor",
        "oil-pressure-sensor",
        "pcv-valve",
        "ecu",
        "exhaust-muffler",
        "exhaust-flex-pipe",
        "catalytic-converter",
        "engine-cover",
        "engine-assembly",
        ["gearbox", GEARBOX],
        ["tcu", GEARBOX],
        ["transmission-mount", GEARBOX],
        ["clutch-kit", ICE],
        ["release-bearing", ICE],
        ["flywheel", ICE],
        ["shift-cable", ICE_HEV],
        ["propeller-shaft", GEARBOX],
        ["transfer-case", GEARBOX],
        "reducer",
      ],
    ),
  },
  {
    id: "hv",
    title: "Высоковольтная система",
    titleZh: "高压系统",
    description: "Тяговая батарея, инвертор, электромотор, DC-DC и зарядка",
    icon: "battery",
    only: HV,
    items: items(
      ["hv-battery", ["charging-port", PLUG], ["obc", PLUG], "dcdc", "inverter", ["charging-cable", PLUG]],
      [
        ["charge-port-door", PLUG],
        "battery-module",
        "bms",
        ["battery-shield", PLUG],
        "pdu",
        "e-motor",
        "e-drive",
        // A car with an engine finds the reducer under "Двигатель и трансмиссия".
        ["reducer", ["bev"]],
        "hv-cable",
        "msd",
        "vcu",
        ["range-extender", ["erev"]],
        "avas",
        ["ptc-heater", PLUG],
        "battery-chiller",
      ],
    ),
  },
  {
    id: "wheels",
    title: "Колёса и шины",
    titleZh: "车轮轮胎",
    description: "Диски, шины, датчики давления и колёсный крепёж",
    icon: "wheel",
    items: items(["wheel-rim", "tire", "tpms-sensor", "wheel-bolt"], ["center-cap", "spare-tire", "wheel-assembly", "wheel-cover", "jack"]),
  },
];

function freezeGroup(group: DisplayGroup): DisplayGroup {
  for (const item of group.items) Object.freeze(item);
  Object.freeze(group.items);
  return Object.freeze(group);
}

export const DISPLAY_GROUPS: readonly DisplayGroup[] = Object.freeze(GROUPS.map(freezeGroup));

/** A car, its catalog model, a list of powertrains or one powertrain. Nothing or an empty list: unknown, show all. */
export type PowertrainSource =
  | { powertrains: readonly Powertrain[] }
  | readonly Powertrain[]
  | Powertrain
  | null
  | undefined;

function powertrainsOf(source: PowertrainSource): readonly Powertrain[] {
  const list: readonly Powertrain[] =
    source == null ? [] : typeof source === "string" ? [source] : "powertrains" in source ? source.powertrains : source;
  const known = list.filter((p) => (POWERTRAINS as readonly string[]).includes(p));
  return known.length ? known : POWERTRAINS;
}

const fits = (only: readonly Powertrain[] | undefined, powertrains: readonly Powertrain[]) =>
  !only || powertrains.some((p) => only.includes(p));

export interface AssortmentItem {
  id: string;
  /** Russian name for customers. */
  name: string;
  /** Chinese name for sourcer screens. */
  nameZh: string;
  popular: boolean;
  partType: PartType;
}

export interface AssortmentGroup {
  id: DisplayGroupId;
  title: string;
  titleZh: string;
  description: string;
  icon: CatalogIcon;
  items: AssortmentItem[];
  count: number;
  popularCount: number;
}

function toItem(partTypeId: string, popular: boolean): AssortmentItem | null {
  const partType = getPartType(partTypeId);
  return partType ? { id: partType.id, name: partType.ru, nameZh: partType.zh, popular, partType } : null;
}

/**
 * Groups of parts that exist on this car, popular parts first, empty groups left out. A model with several
 * powertrains (Han: BEV and PHEV) gets every part any of them has; pass the decoded powertrain to narrow it.
 */
export function assortmentFor(source?: PowertrainSource): AssortmentGroup[] {
  const powertrains = powertrainsOf(source);
  const out: AssortmentGroup[] = [];
  // A part listed in two groups for different powertrains (the reducer) is shown once, in the first group.
  const seen = new Set<string>();
  for (const group of DISPLAY_GROUPS) {
    if (!fits(group.only, powertrains)) continue;
    const list = group.items
      .filter((item) => fits(item.only, powertrains) && !seen.has(item.partTypeId))
      .map((item) => toItem(item.partTypeId, item.popular))
      .filter((item): item is AssortmentItem => item !== null);
    for (const item of list) seen.add(item.id);
    if (!list.length) continue;
    out.push({
      id: group.id,
      title: group.title,
      titleZh: group.titleZh,
      description: group.description,
      icon: group.icon,
      items: list,
      count: list.length,
      popularCount: list.filter((i) => i.popular).length,
    });
  }
  return out;
}

/** Number of part kinds in an assortment. */
export const assortmentSize = (groups: readonly AssortmentGroup[]) => groups.reduce((sum, g) => sum + g.count, 0);

/** The display group a part type is shown in for this car, or null when the car has no such part. */
export function groupForPartType(partTypeId: string, source?: PowertrainSource): DisplayGroupId | null {
  const powertrains = powertrainsOf(source);
  const group = DISPLAY_GROUPS.find(
    (g) => fits(g.only, powertrains) && g.items.some((i) => i.partTypeId === partTypeId && fits(i.only, powertrains)),
  );
  return group?.id ?? null;
}

// Parts behind each hotspot of the car illustration, most requested first. Filtered by powertrain, then cut to
// ZONE_LIMIT so a hotspot never opens a wall of parts.
export const ZONE_LIMIT = 10;

const ZONE_ROWS: Record<ZoneId, Row[]> = {
  front: [
    "bumper",
    "headlight",
    "grille",
    "fog-lamp",
    "front-radar",
    "bumper-bracket",
    "bumper-grille",
    "bumper-beam",
    "drl",
    "parking-sensor",
  ],
  hood: [
    "hood",
    "hood-lock",
    "hood-hinge",
    "hood-strut",
    "washer-nozzle",
    "washer-reservoir",
    "emblem",
    ["air-filter", ENGINE],
    "battery-12v",
    "washer-pump",
  ],
  windshield: [
    "windshield",
    "wiper-blade",
    "front-camera",
    "wiper-arm",
    "rain-light-sensor",
    "wiper-motor",
    "wiper-linkage",
    "interior-mirror",
    "cowl",
  ],
  mirror: ["mirror", "mirror-glass", "mirror-cover", "mirror-turn-signal", "surround-camera", "mirror-motor", "turn-signal-repeater"],
  door: [
    "door",
    "door-handle",
    "side-window-glass",
    "window-regulator",
    "door-lock",
    "window-motor",
    "door-trim-panel",
    "door-seal",
    "door-moulding",
    "window-switch",
  ],
  "wheel-front": [
    "brake-pads",
    "brake-disc",
    "shock-absorber",
    "lower-arm",
    "wheel-bearing",
    "tie-rod-end",
    "stabilizer-link",
    "brake-caliper",
    "ball-joint",
    "wheel-hub",
  ],
  "wheel-rear": [
    "brake-pads",
    "brake-disc",
    "shock-absorber",
    "wheel-bearing",
    "brake-caliper",
    "parking-brake-motor",
    "coil-spring",
    "wheel-hub",
    "trailing-arm",
    "abs-sensor",
  ],
  rear: [
    "tail-light",
    "bumper",
    "tailgate",
    "rear-camera",
    "parking-sensor",
    "corner-radar",
    "tail-light-center",
    "power-tailgate-actuator",
    "tailgate-strut",
    "third-brake-light",
  ],
  roof: ["sunroof-glass", "roof-rails", "antenna", "sunroof-mechanism", "sunroof-shade", "lidar", "spoiler", "roof-panel"],
  // A plug-in hybrid has both flaps: the charge port first, then the fuel filler.
  charge: [
    ["charging-port", PLUG],
    ["charge-port-door", PLUG],
    ["charging-cable", PLUG],
    ["obc", PLUG],
    ["fuel-door", ENGINE],
    ["fuel-cap", ENGINE],
    ["fuel-tank", ENGINE],
    ["fuel-pump", ENGINE],
  ],
  interior: [
    "central-screen",
    "seat",
    "steering-wheel",
    "airbag",
    "instrument-cluster",
    "climate-panel",
    "seat-belt",
    "floor-mats",
    "seat-cover",
    "armrest",
  ],
  // The traction battery of an electrified car sits under the floor or the rear seat; a car with an engine has its
  // exhaust there.
  underbody: [
    ["hv-battery", HV],
    ["battery-shield", PLUG],
    ["exhaust-muffler", ENGINE],
    ["catalytic-converter", ENGINE],
    "underbody-shield",
    "subframe",
    ["exhaust-flex-pipe", ENGINE],
    ["oil-pan", ENGINE],
    ["hv-cable", HV],
    ["battery-module", HV],
    ["o2-sensor", ENGINE],
    "subframe-bushing",
  ],
};

export const ZONE_PART_ROWS: Readonly<Record<ZoneId, readonly DisplayGroupItem[]>> = Object.freeze(
  Object.fromEntries(
    Object.entries(ZONE_ROWS).map(([zone, rows]) => [
      zone,
      Object.freeze(items([], rows).map((item) => Object.freeze(item))),
    ]),
  ) as Record<ZoneId, readonly DisplayGroupItem[]>,
);

/** Part types behind one hotspot for this car: 4–10, most relevant first. */
export function zonePartTypes(zone: ZoneId, source?: PowertrainSource): PartType[] {
  const powertrains = powertrainsOf(source);
  return (ZONE_PART_ROWS[zone] ?? [])
    .filter((item) => fits(item.only, powertrains))
    .map((item) => getPartType(item.partTypeId))
    .filter((p): p is PartType => p !== null)
    .slice(0, ZONE_LIMIT);
}

// Where a part sits on the car, for the little car picture of a part card. A part behind a hotspot takes that
// hotspot's area; parts no hotspot lists take the area of their group (engine parts are under the bonnet).
const GROUP_ZONE: Record<DisplayGroupId, ZoneId> = {
  maintenance: "hood",
  brakes: "wheel-front",
  chassis: "wheel-front",
  body: "door",
  optics: "front",
  glass: "windshield",
  electrical: "hood",
  adas: "front",
  interior: "interior",
  climate: "front",
  powertrain: "hood",
  hv: "underbody",
  wheels: "wheel-front",
};

const PART_ZONE = new Map<string, ZoneId>();
for (const [zone, rows] of Object.entries(ZONE_PART_ROWS) as [ZoneId, readonly DisplayGroupItem[]][])
  for (const row of rows) if (!PART_ZONE.has(row.partTypeId)) PART_ZONE.set(row.partTypeId, zone);

/** The area of the car a part belongs to: the first hotspot that lists it, else its group's area. */
export function partZone(partTypeId: string, groupId?: DisplayGroupId | null): ZoneId | null {
  return PART_ZONE.get(partTypeId) ?? (groupId ? GROUP_ZONE[groupId] : null);
}
