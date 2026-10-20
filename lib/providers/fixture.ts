import {
  CATEGORY_LEVELS,
  categoriesFailure,
  decodeFailure,
  partsFailure,
  type CatalogPart,
  type CategoriesInput,
  type CategoriesResult,
  type Category,
  type CategoryLevel,
  type DecodeResult,
  type PartsInput,
  type PartsProvider,
  type PartsResult,
  type ProviderMeta,
  type ProviderStatus,
  type VehicleCandidate,
} from "./types";
import {
  OE_HINT,
  VIN_HINT,
  isValidEpc,
  isValidLevel,
  normalizeCode,
  normalizeOe,
  normalizeOeInput,
  normalizeVinInput,
} from "./validate";

// Synthetic catalog for development and tests. It mirrors real 17VIN answer shapes (two BYD trims, a BYD branch
// four levels deep, an empty Li Auto catalog with code 0, Zeekr with code 1003 and epc_id "0") but every VIN,
// id and OE number here is made up.

export const FIXTURE_NOTICE = "Пример: данные синтетические";

const TRANSLIT: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6,
  X: 7, Y: 8, Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

// ISO 3779 check digit (position 9). Kept local so fixtures do not depend on lib/vin.
export function vinCheckDigit(vin: string): string {
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const c = vin[i];
    const value = /\d/.test(c) ? Number(c) : TRANSLIT[c];
    if (value === undefined) throw new Error(`Invalid VIN character: ${c}`);
    sum += value * WEIGHTS[i];
  }
  const rest = sum % 11;
  return rest === 10 ? "X" : String(rest);
}

// Builds a VIN from WMI (3) + VDS (5) + VIS (8) and inserts the correct check digit.
export function syntheticVin(wmi: string, vds: string, vis: string): string {
  const draft = wmi + vds + "0" + vis;
  if (draft.length !== 17) throw new Error("Synthetic VIN must have 17 characters");
  return wmi + vds + vinCheckDigit(draft) + vis;
}

// "TX" in the descriptor and serial marks them as Tetix test VINs.
export const FIXTURE_VINS = {
  bydSongPlus: syntheticVin("LGX", "TXSP2", "PATX0001"), // LGXTXSP24PATX0001
  geelyGalaxyE5: syntheticVin("L6T", "TXGE5", "SATX0002"), // L6TTXGE54SATX0002
  deepalS7: syntheticVin("LS5", "TXDS7", "RATX0003"), // LS5TXDS73RATX0003
  liAutoL6: syntheticVin("HLX", "TXL6A", "RATX0004"), // HLXTXL6A9RATX0004
  zeekr001: syntheticVin("L6T", "TXZ01", "RATX0005"), // L6TTXZ017RATX0005
} as const;

type FixtureNode = { code: string; name: string; remark?: string; children?: FixtureNode[]; parts?: CatalogPart[] };
type BlockedCatalog = { status: ProviderStatus; providerCode: number; message: string };
type FixtureCar = {
  vin: string;
  epc: string;
  epcId: string;
  buildDate?: string;
  candidates: VehicleCandidate[];
  catalog: FixtureNode[] | BlockedCatalog;
};

type PartSeed = Partial<Omit<CatalogPart, "oe" | "name" | "nameZh">>;

function part(oe: string, name: string, nameZh: string, extra: PartSeed = {}): CatalogPart {
  return {
    oe,
    normalizedOe: normalizeOe(oe),
    name,
    nameZh,
    engineerPartNumber: "",
    modelOptional: "",
    modelNotOptional: "",
    callout: "",
    quantity: "1",
    remark: "",
    replacement: "",
    beginDate: "",
    endDate: "",
    diagram: null,
    image: null,
    providerFit: true,
    compatibility: "requires_review",
    ...extra,
  };
}

function candidate(fields: Omit<VehicleCandidate, "image" | "description"> & { description?: string }): VehicleCandidate {
  return {
    ...fields,
    description: fields.description ?? `${fields.brand} ${fields.model} ${fields.version} ${fields.year}`,
    image: null,
  };
}

const BYD_CATALOG: FixtureNode[] = [
  {
    code: "01",
    name: "01 Engine Package",
    children: [
      {
        code: "01-02",
        name: "Engine lubrication and air intake",
        children: [
          {
            code: "SA3HJ-01021",
            name: "Oil filter and lubrication",
            parts: [
              part("10301727-00", "Oil filter element", "机油滤清器滤芯", { callout: "1", engineerPartNumber: "BYD472QA-1012010TX" }),
              part("10301731-00", "Oil drain plug gasket", "放油螺塞垫片", { callout: "2" }),
            ],
          },
          {
            code: "SA3HJ-01025",
            name: "Air intake system",
            parts: [part("10341580-00", "Air filter element", "空气滤清器滤芯", { callout: "1" })],
          },
        ],
      },
    ],
  },
  {
    code: "03",
    name: "03 Chassis assembly",
    children: [
      {
        code: "03-04",
        name: "Brake system",
        children: [
          {
            code: "SA3HJ-03041",
            name: "Front brake",
            parts: [
              part("10273368-00", "Front brake pad kit", "前制动摩擦片总成", { callout: "1", quantity: "1" }),
              part("10273375-00", "Front brake disc", "前制动盘", { callout: "2", quantity: "2", replacement: "10273375-01" }),
            ],
          },
        ],
      },
    ],
  },
  {
    code: "06",
    name: "06 Body and Body Accessories",
    children: [
      {
        code: "06-01",
        name: "Body in white",
        children: [
          {
            code: "SA3HJ-06002",
            name: "Body main",
            parts: [
              part("14905517-00", "Body main assembly", "车身主体总成", {
                callout: "1",
                engineerPartNumber: "SA3HK-5010010/TX",
                remark: "物料编码:SA3HK-5010010/TX",
              }),
              part("10140262-00", "Rear side body air inlet cover", "后侧围风口堵盖", { callout: "2", quantity: "6" }),
              part("11090351-00", "D23 plastic plug", "D23塑料堵盖", { callout: "3", quantity: "2", beginDate: "20230301" }),
            ],
          },
        ],
      },
      {
        code: "06-02",
        name: "Front hood and fenders",
        children: [
          {
            code: "SA3HJ-06011",
            name: "Front hood",
            parts: [
              part("10185533-00", "Front hood assembly", "前舱盖总成", { callout: "1" }),
              part("10185541-00", "Front hood hinge assembly (left)", "前舱盖铰链总成(左)", { callout: "2" }),
              part("10185542-00", "Front hood hinge assembly (right)", "前舱盖铰链总成(右)", { callout: "3" }),
            ],
          },
        ],
      },
    ],
  },
  {
    code: "10",
    name: "10 Electrical equipment",
    children: [
      {
        code: "10-03",
        name: "Lighting",
        children: [
          {
            code: "SA3HJ-10031",
            name: "Headlamps",
            parts: [
              part("10248766-00", "Left headlamp assembly", "左前大灯总成", { callout: "1" }),
              part("10248767-00", "Right headlamp assembly", "右前大灯总成", { callout: "2" }),
            ],
          },
          {
            // A branch four levels deep, as some 17VIN catalogs have (cata4).
            code: "SA3HJ-10035",
            name: "Rear lamps",
            children: [
              {
                code: "SA3HJ-10035-1",
                name: "Tail lamps",
                parts: [
                  part("10248801-00", "Left tail lamp assembly", "左后尾灯总成", { callout: "1" }),
                  part("10248802-00", "Right tail lamp assembly", "右后尾灯总成", { callout: "2" }),
                ],
              },
            ],
          },
        ],
      },
      {
        // The two BYD trims differ only here (4G or 5G telematics), so the trim must be confirmed before ordering.
        code: "10-07",
        name: "Telematics",
        children: [
          {
            code: "SA3HJ-10071",
            name: "T-Box module",
            parts: [
              part("10350218-00", "T-Box module (4G)", "T-Box模块(4G)", { callout: "1", modelNotOptional: "5G" }),
              part("10350219-00", "T-Box module (5G)", "T-Box模块(5G)", { callout: "1", modelOptional: "5G" }),
            ],
          },
        ],
      },
      {
        // A group that is already the last level at level 2.
        code: "10-05",
        name: "Wipers and washers",
        parts: [
          part("10220395-00", "Front wiper blade (driver side)", "前雨刮片(主驾)", { callout: "1" }),
          part("10220396-00", "Front wiper blade (passenger side)", "前雨刮片(副驾)", { callout: "2" }),
        ],
      },
    ],
  },
];

const GEELY_CATALOG: FixtureNode[] = [
  {
    code: "11",
    name: "11 Electric drive system",
    children: [
      {
        code: "1110",
        name: "Drive motor",
        children: [
          {
            code: "1110-01",
            name: "Drive motor mounting",
            parts: [
              part("6600412201", "Drive motor mount (front)", "电机前悬置", { callout: "1" }),
              part("6600412202", "Drive motor mount (rear)", "电机后悬置", { callout: "2" }),
            ],
          },
        ],
      },
    ],
  },
  {
    code: "50",
    name: "50 Body",
    children: [
      {
        code: "5010",
        name: "Body shell",
        children: [
          {
            code: "5010-11",
            name: "BODY ASSY",
            parts: [part("6608412345C15", "Body shell assembly", "车身本体总成", { callout: "1", remark: "物料号:6608412345C15" })],
          },
        ],
      },
    ],
  },
  // No subgroups: browsing it returns an empty answer, as real catalogs sometimes do.
  { code: "70", name: "70 Electrical" },
];

const DEEPAL_CATALOG: FixtureNode[] = [
  {
    code: "B1",
    name: "B1 Chassis",
    children: [
      {
        code: "B12",
        name: "Brakes",
        children: [
          {
            code: "B120301",
            name: "Front brake system",
            parts: [
              part("C385B120301-0100", "Front brake pad kit", "前制动块总成", { callout: "1" }),
              part("C385B120305-0200", "Front brake disc", "前制动盘", { callout: "2", quantity: "2" }),
            ],
          },
        ],
      },
    ],
  },
  {
    code: "F2",
    name: "F2 Body and closures",
    children: [
      {
        code: "F27",
        name: "Front hood",
        children: [
          {
            code: "F270101",
            name: "Front hood system",
            parts: [
              part("C385F270611-0100", "Front hood assembly", "前机盖总成", { callout: "1" }),
              part("C385F270615-1300", "Hexagonal flange face nut", "六角法兰面螺母", { callout: "2", quantity: "" }),
            ],
          },
        ],
      },
    ],
  },
];

const CARS: FixtureCar[] = [
  {
    vin: FIXTURE_VINS.bydSongPlus,
    epc: "byd",
    epcId: "fx-9001",
    buildDate: "202303",
    candidates: [
      candidate({
        id: "fx-byd-song-150-flagship",
        brand: "BYD",
        model: "Song Plus DM-i",
        year: "2023",
        version: "Champion Edition 150KM Flagship PLUS",
        engine: "BYD472QA",
        fuel: "PHEV",
        drive: "Front-engine FWD",
        epcId: "fx-9001",
      }),
      candidate({
        id: "fx-byd-song-150-flagship-5g",
        brand: "BYD",
        model: "Song Plus DM-i",
        year: "2023",
        version: "Champion Edition 150KM Flagship PLUS 5G",
        engine: "BYD472QA",
        fuel: "PHEV",
        drive: "Front-engine FWD",
        epcId: "fx-9001",
      }),
    ],
    catalog: BYD_CATALOG,
  },
  {
    vin: FIXTURE_VINS.geelyGalaxyE5,
    epc: "geely",
    epcId: "fx-9002",
    candidates: [
      candidate({
        id: "fx-geely-e5-530",
        brand: "Geely Galaxy",
        model: "Galaxy E5",
        year: "2025",
        version: "530km Star Warship Edition",
        engine: "TZ184XY101",
        fuel: "BEV",
        drive: "Front-engine FWD",
        epcId: "fx-9002",
      }),
    ],
    catalog: GEELY_CATALOG,
  },
  {
    vin: FIXTURE_VINS.deepalS7,
    epc: "changan",
    epcId: "fx-9003",
    candidates: [
      candidate({
        id: "fx-deepal-s7-200max",
        brand: "Deepal",
        model: "Deepal S7",
        year: "2024",
        version: "200Max Range Extender Edition",
        engine: "JL473QJ",
        fuel: "EREV",
        drive: "Rear-engine RWD",
        epcId: "fx-9003",
      }),
    ],
    catalog: DEEPAL_CATALOG,
  },
  {
    vin: FIXTURE_VINS.liAutoL6,
    epc: "lixiang",
    epcId: "fx-9004",
    candidates: [
      candidate({
        id: "fx-li-l6-pro",
        brand: "Li Auto",
        model: "L6",
        year: "2024",
        version: "Pro",
        engine: "L2E15M",
        fuel: "EREV",
        drive: "Dual-motor AWD",
        epcId: "fx-9004",
      }),
    ],
    catalog: { status: "empty", providerCode: 0, message: "Каталог этой модели пока пуст (код 0)" },
  },
  {
    vin: FIXTURE_VINS.zeekr001,
    epc: "zeekr",
    epcId: "0",
    candidates: [
      candidate({
        id: "fx-zeekr-001-you",
        brand: "Zeekr",
        model: "001",
        year: "2024",
        version: "YOU Edition 100kWh",
        engine: "YS235XYG01/TZ235XYC01",
        fuel: "BEV",
        drive: "Dual-motor AWD",
        epcId: "0",
      }),
    ],
    catalog: { status: "unsupported", providerCode: 1003, message: "Каталог этой марки не поддерживается (код 1003)" },
  },
];

const say = (text: string) => `${FIXTURE_NOTICE}. ${text}`;
const meta = (status: ProviderStatus, text: string, providerCode?: number): ProviderMeta => ({
  status,
  message: say(text),
  source: "fixture",
  ...(providerCode !== undefined ? { providerCode } : {}),
});
const OK = "Применяемость проверяет специалист";
const clone = <T>(value: T): T => structuredClone(value);

function nodesAt(catalog: FixtureNode[], level: CategoryLevel): FixtureNode[] {
  if (level === 1) return catalog;
  const above = nodesAt(catalog, (level - 1) as CategoryLevel);
  return above.flatMap((node) => node.children ?? []);
}

function categoryOf(node: FixtureNode, level: CategoryLevel): Category {
  return {
    code: node.code,
    level,
    last: Boolean(node.parts),
    name: node.name,
    remark: node.remark ?? "",
    diagram: null,
    providerFit: true,
  };
}

type Lookup = { ok: true; catalog: FixtureNode[] } | { ok: false; meta: ProviderMeta };

export class FixtureProvider implements PartsProvider {
  readonly name = "fixture";
  readonly mode = "fixture" as const;

  async decodeVin(input: string): Promise<DecodeResult> {
    const vin = normalizeVinInput(input);
    if (!vin) return decodeFailure(meta("invalid", VIN_HINT));
    const car = CARS.find((c) => c.vin === vin);
    if (!car) return decodeFailure(meta("empty", "В тестовом наборе нет такого VIN", 0));
    const ambiguous = car.candidates.length > 1;
    return {
      ...meta("success", ambiguous ? "Несколько комплектаций. Выберите свою или оставьте проверку специалисту" : OK, 1),
      epc: car.epc,
      epcId: car.epcId,
      matchingMode: "exact_match",
      ...(car.buildDate ? { buildDate: car.buildDate } : {}),
      manufacturedIn: "China",
      candidates: clone(car.candidates),
      ambiguous,
    };
  }

  async categories(input: CategoriesInput): Promise<CategoriesResult> {
    const parent = input.level > 1 ? normalizeCode(input.parentCode) : null;
    if (input.level > 1 && !parent) return categoriesFailure(meta("invalid", "Не указана родительская группа"));
    const found = this.#catalog(input.vin, input.epc, input.level);
    if (!found.ok) return categoriesFailure(found.meta);
    const level = input.level;
    const nodes =
      level === 1
        ? found.catalog
        : nodesAt(found.catalog, (level - 1) as CategoryLevel).find((n) => n.code === parent)?.children ?? [];
    if (!nodes.length) return categoriesFailure(meta("empty", "В этой группе нет подгрупп", 0));
    return { ...meta("success", OK, 1), categories: nodes.map((n) => categoryOf(n, level)) };
  }

  async parts(input: PartsInput): Promise<PartsResult> {
    const code = normalizeCode(input.categoryCode);
    if (!code) return partsFailure(meta("invalid", "Не указана группа деталей"));
    const found = this.#catalog(input.vin, input.epc, input.level);
    if (!found.ok) return partsFailure(found.meta);
    const node = nodesAt(found.catalog, input.level).find((n) => n.code === code);
    if (!node?.parts?.length) return partsFailure(meta("empty", "В этой группе нет деталей", 0));
    return { ...meta("success", OK, 1), parts: clone(node.parts) };
  }

  async searchOe(input: string): Promise<PartsResult> {
    const oe = normalizeOeInput(input);
    if (!oe) return partsFailure(meta("invalid", OE_HINT));
    const wanted = normalizeOe(oe);
    const found = new Map<string, CatalogPart>();
    for (const car of CARS) {
      if (!Array.isArray(car.catalog)) continue;
      for (const level of CATEGORY_LEVELS)
        for (const node of nodesAt(car.catalog, level))
          for (const p of node.parts ?? []) if (p.normalizedOe === wanted && !found.has(p.oe)) found.set(p.oe, p);
    }
    if (!found.size) return partsFailure(meta("empty", "Номер не найден в тестовом каталоге", 0));
    return { ...meta("success", OK, 1), parts: clone([...found.values()]) };
  }

  #catalog(rawVin: string, epc: string, level: unknown): Lookup {
    const vin = normalizeVinInput(rawVin);
    if (!vin || !isValidEpc(epc) || !isValidLevel(level))
      return { ok: false, meta: meta("invalid", "Некорректный VIN, каталог или группа") };
    const car = CARS.find((c) => c.vin === vin);
    if (!car) return { ok: false, meta: meta("empty", "В тестовом наборе нет такого VIN", 0) };
    if (car.epc !== epc) return { ok: false, meta: meta("invalid", "Каталог не соответствует VIN (код 1001)", 1001) };
    if (!Array.isArray(car.catalog)) {
      const blocked = car.catalog;
      return { ok: false, meta: meta(blocked.status, blocked.message, blocked.providerCode) };
    }
    return { ok: true, catalog: car.catalog };
  }
}
