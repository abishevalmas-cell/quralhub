import type { Tone } from "@/components/ui/badge";
import { carColorById, DEFAULT_PAINT } from "@/components/car/colors";
import { partRequestHref } from "@/components/home/links";
import {
  CAR_COLOR_IDS,
  getBrand,
  getModel,
  modelTitle,
  modelYears,
  POWERTRAIN_LABELS,
  type BodyType,
  type CarColorId,
  type CarModel,
  type CatalogStatus,
  type Powertrain,
  type ZoneId,
} from "@/lib/catalog";
import type { CatalogMode, HomeCar } from "@/lib/services/search";
import type { Axis, PartType } from "@/lib/taxonomy";

// What the vehicle stage and the parts assortment show for one car: a garage car or a catalog model being browsed.
// Pure and client-safe. Nothing here says that a part fits: the badges only tell how the part will be picked.

export type StageSubject = {
  kind: "vehicle" | "model";
  /** Favorites and other per-car browser state are kept under this key. */
  key: string;
  vehicleId: string | null;
  modelId: string | null;
  title: string;
  subtitle: string;
  body: BodyType;
  /** The body is a stand-in: the car is not in the catalog. */
  genericBody: boolean;
  /** An off-roader's spare wheel on the tailgate (false for models without one). */
  spare: boolean;
  colorId: CarColorId | null;
  colorHex: string;
  /** Powertrains the assortment is built for; empty when unknown (every part is shown). */
  powertrains: readonly Powertrain[];
  /** The one powertrain the car is known to have, for labels like "Зарядный порт"; null when unsure. */
  powertrain: Powertrain | null;
  brandStatus: CatalogStatus | null;
  hasVin: boolean;
  /** Several trims fit the VIN and none is confirmed: nothing is "by the catalog" yet. */
  trimPending: boolean;
  catalog: CatalogMode | null;
};

/** The car of the home page for visitors without a garage car: the most common model in the region. */
export const DEFAULT_MODEL_ID = "byd-song-plus-dmi";

/** Hotspots on the stage, in tab order. The rest of the zones are one tap away in the groups below. */
export const STAGE_ZONES: readonly ZoneId[] = ["front", "hood", "mirror", "door", "wheel-front", "wheel-rear", "charge", "rear"];

/** The hotspots a phone shows: eight dots crowd a 390px stage. Bonnet, mirrors and the flap stay in the zone chips. */
export const PHONE_ZONES: readonly ZoneId[] = ["front", "door", "wheel-front", "wheel-rear", "rear"];

/** Every zone, for the "Выбрать узел" list. */
export const ALL_ZONES: readonly ZoneId[] = [
  "front",
  "hood",
  "windshield",
  "mirror",
  "door",
  "wheel-front",
  "wheel-rear",
  "rear",
  "roof",
  "charge",
  "interior",
  "underbody",
];

export function paintHex(colorId: string | null | undefined, model?: Pick<CarModel, "defaultColor"> | null): string {
  return carColorById(colorId)?.hex ?? carColorById(model?.defaultColor)?.hex ?? DEFAULT_PAINT;
}

/** A paint id of CAR_COLORS, or null. */
export const colorIdOf = (value: string | null | undefined): CarColorId | null =>
  value && (CAR_COLOR_IDS as readonly string[]).includes(value) ? (value as CarColorId) : null;

const single = (list: readonly Powertrain[]) => (list.length === 1 ? list[0] : null);

export const powertrainText = (list: readonly Powertrain[]) => list.map((p) => POWERTRAIN_LABELS[p]).join(" / ");

/** "с 2021 · Подключаемый гибрид · Средний кроссовер". */
export function modelFacts(model: CarModel): string {
  return [modelYears(model), powertrainText(model.powertrains), model.segment].filter(Boolean).join(" · ");
}

/**
 * Years a car of this model can have, newest first. Like the server (checkModelYear), one year either side of the
 * model's years is accepted: a car built early carries the next model year, a late one the previous.
 */
export function modelYearOptions(model: Pick<CarModel, "yearFrom" | "yearTo">, maxYear: number): number[] {
  const to = Math.min(model.yearTo === null ? maxYear : model.yearTo + 1, maxYear);
  const years: number[] = [];
  for (let y = to; y >= model.yearFrom - 1; y--) years.push(y);
  return years;
}

export function modelSubject(model: CarModel, colorId?: string | null): StageSubject {
  const color = colorIdOf(colorId) ?? model.defaultColor;
  return {
    kind: "model",
    key: `m:${model.id}`,
    vehicleId: null,
    modelId: model.id,
    title: modelTitle(model),
    subtitle: modelFacts(model),
    body: model.body,
    genericBody: false,
    spare: model.spare ?? true,
    colorId: color,
    colorHex: paintHex(color, model),
    powertrains: model.powertrains,
    powertrain: single(model.powertrains),
    brandStatus: getBrand(model.brandId)?.catalogStatus ?? null,
    hasVin: false,
    trimPending: false,
    catalog: null,
  };
}

export type SubjectCar = Pick<
  HomeCar,
  "id" | "title" | "label" | "name" | "year" | "trim" | "modelId" | "color" | "hasVin" | "trimPending" | "brandStatus" | "catalog"
>;

/**
 * A garage car. Its powertrain is known only when its model line has a single one: a Han may be electric or a
 * plug-in hybrid, and the picture must not decide which.
 */
export function carSubject(car: SubjectCar): StageSubject {
  const model = getModel(car.modelId);
  const powertrains = model?.powertrains ?? [];
  const title = car.label ?? car.name ?? car.title;
  return {
    kind: "vehicle",
    key: `v:${car.id}`,
    vehicleId: car.id,
    modelId: model?.id ?? null,
    title,
    subtitle: [
      car.label ? car.name : null,
      car.year ? String(car.year) : null,
      car.trim,
      powertrains.length ? powertrainText(powertrains) : null,
    ]
      .filter(Boolean)
      .join(" · "),
    body: model?.body ?? "crossover",
    genericBody: !model,
    spare: model?.spare ?? true,
    colorId: colorIdOf(car.color) ?? model?.defaultColor ?? null,
    colorHex: paintHex(car.color, model),
    powertrains,
    powertrain: single(powertrains),
    brandStatus: car.brandStatus,
    hasVin: car.hasVin,
    trimPending: car.trimPending,
    catalog: car.catalog,
  };
}

/**
 * The car a page is about: a catalog model named in ?model= (someone browsing), else the active garage car, else
 * the most common model.
 */
export function resolveSubject(cars: readonly SubjectCar[], activeId: string | null, modelParam: string | null): StageSubject {
  const browsing = getModel(modelParam);
  if (browsing) return modelSubject(browsing);
  const car = cars.find((c) => c.id === activeId);
  if (car) return carSubject(car);
  const fallback = getModel(DEFAULT_MODEL_ID);
  if (!fallback) throw new Error(`Unknown default model ${DEFAULT_MODEL_ID}`);
  return modelSubject(fallback);
}

export type PartBadge = { label: string; tone: Tone; note: string; short: string };

/**
 * How a part for this car is picked. "Каталог по VIN" only for a car whose VIN catalog really opens (the brand is
 * covered, the car's own catalog answered and its trim is known); a brand without a catalog is picked by hand;
 * everything else needs the VIN checked by a sourcer.
 */
export function partBadge(subject: Pick<StageSubject, "brandStatus" | "hasVin" | "catalog"> & { trimPending?: boolean }): PartBadge {
  if (subject.hasVin && !subject.trimPending && subject.brandStatus === "vin_catalog" && subject.catalog === "catalog")
    return { label: "Каталог по VIN", tone: "ok", note: "Номер детали найдём в каталоге производителя по вашему VIN", short: "номер по каталогу VIN" };
  if (subject.brandStatus === "manual" || subject.catalog === "manual")
    return subject.hasVin
      ? { label: "Ручной подбор", tone: "hand", note: "Каталога по VIN нет: подборщик найдёт деталь по VIN и фото", short: "ручной подбор" }
      : {
          label: "Ручной подбор",
          tone: "hand",
          note: "Подборщик найдёт деталь по марке, году и фото. Добавьте VIN — проверим точнее",
          short: "ручной подбор",
        };
  return { label: "Нужна проверка VIN", tone: "warn", note: "Подборщик проверит номер детали по VIN", short: "нужна проверка VIN" };
}

export const PRICE_NOTE = "цена после подбора";

// A hotspot tells the axis of parts that come in front and rear versions: the front wheel means front pads.
const ZONE_AXIS: Partial<Record<ZoneId, Axis>> = { front: "front", "wheel-front": "front", "wheel-rear": "rear", rear: "rear" };

export function zoneAxis(zone: ZoneId | null | undefined, part: Pick<PartType, "needsAxis">): Axis | null {
  return zone && part.needsAxis ? (ZONE_AXIS[zone] ?? null) : null;
}

/**
 * The request form for one part of this car. A garage car goes by its id; a model being browsed goes into the
 * request text, since there is no car to attach yet.
 */
export function partHref(subject: Pick<StageSubject, "vehicleId" | "kind" | "title">, part: PartType, zone?: ZoneId | null): string {
  return partRequestHref({
    vehicleId: subject.vehicleId,
    part,
    axis: zoneAxis(zone, part),
    side: null,
    q: subject.kind === "model" ? `Для ${subject.title}` : "",
  });
}
