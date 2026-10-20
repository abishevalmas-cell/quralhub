import { describe, expect, it } from "vitest";
import { CAR_COLORS } from "@/components/car/colors";
import { getModel, MODELS } from "@/lib/catalog";
import type { HomeCar } from "@/lib/services/search";
import { getPartType } from "@/lib/taxonomy";
import {
  ALL_ZONES,
  DEFAULT_MODEL_ID,
  STAGE_ZONES,
  carSubject,
  colorIdOf,
  modelSubject,
  modelYearOptions,
  paintHex,
  partBadge,
  partHref,
  resolveSubject,
  zoneAxis,
} from "../subject";

const hex = (id: string) => CAR_COLORS.find((c) => c.id === id)!.hex;

function car(extra: Partial<HomeCar> = {}): HomeCar {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    title: "BYD Song Plus DM-i 2023",
    catalog: "catalog",
    label: null,
    name: "BYD Song Plus DM-i",
    year: 2023,
    trim: null,
    modelId: "byd-song-plus-dmi",
    color: null,
    hasVin: true,
    trimPending: false,
    brandStatus: "vin_catalog",
    ...extra,
  };
}

const params = (href: string) => Object.fromEntries(new URLSearchParams(href.slice(href.indexOf("?") + 1)));

describe("stage subjects", () => {
  it("describes a catalog model in its usual paint, or a paint tried on", () => {
    const zeekr = getModel("zeekr-x")!;
    const s = modelSubject(zeekr);
    expect(s).toMatchObject({
      kind: "model",
      key: "m:zeekr-x",
      vehicleId: null,
      title: "Zeekr X",
      body: "crossover",
      colorId: "zeekr-green",
      colorHex: hex("zeekr-green"),
      powertrain: "bev",
      brandStatus: "manual",
      hasVin: false,
    });
    expect(s.subtitle).toBe("с 2023 · Электромобиль · Компактный кроссовер");
    expect(modelSubject(zeekr, "red").colorHex).toBe(hex("red"));
    expect(modelSubject(zeekr, "rainbow").colorId).toBe("zeekr-green");
  });

  it("does not pick a powertrain for a model sold with several", () => {
    const han = modelSubject(getModel("byd-han")!);
    expect(han.powertrains).toEqual(["bev", "phev"]);
    expect(han.powertrain).toBeNull();
  });

  it("describes a garage car by its label, name, year and trim, in the owner's paint", () => {
    const s = carSubject(car({ label: "Машина жены", trim: "Flagship", color: "black" }));
    expect(s).toMatchObject({ kind: "vehicle", key: `v:${car().id}`, title: "Машина жены", colorId: "black", colorHex: hex("black") });
    expect(s.subtitle).toBe("BYD Song Plus DM-i · 2023 · Flagship · Подключаемый гибрид");
    expect(carSubject(car()).title).toBe("BYD Song Plus DM-i");
    expect(carSubject(car()).colorId).toBe("white");
  });

  it("draws a car that is not in the catalog with a stand-in body and every part", () => {
    const s = carSubject(car({ modelId: null, name: "Avatr 11", title: "Avatr 11 2023", brandStatus: null }));
    expect(s).toMatchObject({ body: "crossover", genericBody: true, powertrains: [], powertrain: null, colorId: null });
    expect(s.colorHex).toBe(paintHex(null));
  });

  it("follows ?model=, then the active car, then the default model", () => {
    const cars = [car(), car({ id: "22222222-2222-4222-8222-222222222222", modelId: "zeekr-001", title: "Zeekr 001" })];
    expect(resolveSubject(cars, cars[1].id, "tank-300").key).toBe("m:tank-300");
    expect(resolveSubject(cars, cars[1].id, null).key).toBe(`v:${cars[1].id}`);
    expect(resolveSubject(cars, cars[1].id, "no-such-model").key).toBe(`v:${cars[1].id}`);
    expect(resolveSubject([], null, null).key).toBe(`m:${DEFAULT_MODEL_ID}`);
    expect(getModel(DEFAULT_MODEL_ID)?.popular).toBe(true);
  });

  it("reads paint ids and model years", () => {
    expect(colorIdOf("silver")).toBe("silver");
    expect(colorIdOf("#fff")).toBeNull();
    expect(colorIdOf(null)).toBeNull();
    // One year either side, as the server accepts.
    expect(modelYearOptions({ yearFrom: 2023, yearTo: null }, 2027)).toEqual([2027, 2026, 2025, 2024, 2023, 2022]);
    expect(modelYearOptions({ yearFrom: 2019, yearTo: 2022 }, 2027)).toEqual([2023, 2022, 2021, 2020, 2019, 2018]);
    expect(modelYearOptions({ yearFrom: 2026, yearTo: null }, 2027)).toEqual([2027, 2026, 2025]);
  });

  it("puts hotspots only on zones every body has an anchor for", () => {
    for (const zone of STAGE_ZONES) expect(ALL_ZONES).toContain(zone);
    expect(new Set(ALL_ZONES).size).toBe(12);
  });
});

describe("part badges", () => {
  it("says 'Каталог по VIN' only when the car's own VIN catalog opens", () => {
    expect(partBadge({ brandStatus: "vin_catalog", hasVin: true, catalog: "catalog" })).toMatchObject({ label: "Каталог по VIN", tone: "ok" });
    // Same brand, but no VIN, or a catalog that may be empty or did not open: a sourcer checks.
    for (const catalog of ["catalog_maybe", "not_decoded", null] as const)
      expect(partBadge({ brandStatus: "vin_catalog", hasVin: true, catalog }).label).toBe("Нужна проверка VIN");
    expect(partBadge({ brandStatus: "vin_catalog", hasVin: false, catalog: null }).label).toBe("Нужна проверка VIN");
    expect(partBadge({ brandStatus: "checking", hasVin: true, catalog: "catalog" }).label).toBe("Нужна проверка VIN");
    // Until the owner confirms the trim, nothing is "by the catalog".
    expect(partBadge({ brandStatus: "vin_catalog", hasVin: true, catalog: "catalog", trimPending: true }).label).toBe("Нужна проверка VIN");
    expect(partBadge(carSubject(car({ trimPending: true }))).label).toBe("Нужна проверка VIN");
  });

  it("says 'Ручной подбор' for brands without a catalog and for cars whose catalog came back empty", () => {
    expect(partBadge({ brandStatus: "manual", hasVin: true, catalog: "catalog_maybe" })).toMatchObject({ label: "Ручной подбор", tone: "hand" });
    expect(partBadge({ brandStatus: "manual", hasVin: false, catalog: null }).label).toBe("Ручной подбор");
    expect(partBadge({ brandStatus: "vin_catalog", hasVin: true, catalog: "manual" }).label).toBe("Ручной подбор");
  });

  it("does not speak of a VIN catalog for a car added without a VIN", () => {
    const noVin = partBadge({ brandStatus: "checking", hasVin: false, catalog: "manual" });
    expect(noVin).toMatchObject({ label: "Ручной подбор", tone: "hand" });
    expect(noVin.note).toBe("Подборщик найдёт деталь по марке, году и фото. Добавьте VIN — проверим точнее");
    expect(partBadge({ brandStatus: "manual", hasVin: true, catalog: "manual" }).note).toMatch(/по VIN и фото/);
  });
});

describe("part links", () => {
  const pads = getPartType("brake-pads")!;
  const headlight = getPartType("headlight")!;

  it("takes the axis from the hotspot for parts that have front and rear versions", () => {
    expect(zoneAxis("wheel-rear", pads)).toBe("rear");
    expect(zoneAxis("wheel-front", pads)).toBe("front");
    expect(zoneAxis("door", pads)).toBeNull();
    expect(zoneAxis("front", headlight)).toBeNull();
    expect(zoneAxis(null, pads)).toBeNull();
  });

  it("links a garage car's part to the request form by the car id", () => {
    const href = partHref(carSubject(car()), pads, "wheel-rear");
    expect(href.startsWith("/requests/new?")).toBe(true);
    expect(params(href)).toEqual({ vehicle: car().id, part: "brake-pads", axis: "rear", title: "Тормозные колодки" });
  });

  it("names the model being browsed in the request text, never a VIN", () => {
    const href = partHref(modelSubject(getModel("geely-monjaro")!), headlight);
    expect(params(href)).toEqual({ part: "headlight", title: "Фара", q: "Для Geely Monjaro" });
  });

  it("has a picture for every catalog model", () => {
    for (const m of MODELS) expect(modelSubject(m).colorHex).toMatch(/^#[0-9a-f]{6}$/);
  });
});
