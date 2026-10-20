import { describe, expect, it } from "vitest";
import { ZONE_IDS as CAR_ZONE_IDS } from "@/components/car/types";
import { ICON_NAMES } from "@/components/ui/icon";
import {
  DISPLAY_GROUPS,
  DISPLAY_GROUP_IDS,
  ZONE_LIMIT,
  ZONE_PART_ROWS,
  assortmentFor,
  assortmentSize,
  groupForPartType,
  partZone,
  zonePartTypes,
} from "@/lib/catalog/assortment";
import { MODELS, getModel } from "@/lib/catalog/models";
import { POWERTRAINS, type Powertrain } from "@/lib/catalog/types";
import { ZONE_IDS, isZoneId } from "@/lib/catalog/zones";
import { PART_TYPES, getPartType } from "@/lib/taxonomy";

const ids = (powertrains: Powertrain | Powertrain[]) =>
  new Set(assortmentFor(powertrains).flatMap((g) => g.items.map((i) => i.id)));
const groupIds = (powertrains: Powertrain | Powertrain[]) => assortmentFor(powertrains).map((g) => g.id);

const ENGINE_ONLY = [
  "engine-oil",
  "oil-filter",
  "air-filter",
  "spark-plug",
  "fuel-filter",
  "transmission-fluid",
  "ignition-coil",
  "timing-chain",
  "timing-belt",
  "turbocharger",
  "fuel-pump",
  "fuel-injector",
  "fuel-tank",
  "fuel-door",
  "exhaust-muffler",
  "catalytic-converter",
  "gearbox",
  "clutch-kit",
  "water-pump",
  "thermostat",
  "intercooler",
  "alternator",
  "starter",
];
const HV_PARTS = ["hv-battery", "obc", "dcdc", "charging-port", "charge-port-door", "inverter", "e-motor", "bms"];

describe("zone contract", () => {
  it("uses exactly the hotspot ids of the car illustration", () => {
    expect([...ZONE_IDS]).toEqual([...CAR_ZONE_IDS]);
    expect(Object.keys(ZONE_PART_ROWS).sort()).toEqual([...ZONE_IDS].sort());
    expect(isZoneId("charge")).toBe(true);
    expect(isZoneId("trunk")).toBe(false);
    expect(isZoneId(42)).toBe(false);
  });
});

describe("display groups", () => {
  it("lists the groups in order with Russian titles, descriptions and real icons", () => {
    expect(DISPLAY_GROUPS.map((g) => g.id)).toEqual([...DISPLAY_GROUP_IDS]);
    expect(DISPLAY_GROUPS.map((g) => g.title)).toEqual([
      "ТО и расходники",
      "Тормоза",
      "Подвеска и рулевое",
      "Кузов",
      "Оптика",
      "Стёкла и зеркала",
      "Электрика и датчики",
      "Системы помощи водителю (ADAS)",
      "Салон и комфорт",
      "Климат и охлаждение",
      "Двигатель и трансмиссия",
      "Высоковольтная система",
      "Колёса и шины",
    ]);
    for (const g of DISPLAY_GROUPS) {
      expect(g.description, g.id).toMatch(/[А-Яа-яЁё]/);
      expect(g.titleZh, g.id).toMatch(/[一-鿿]/);
      expect(ICON_NAMES, g.id).toContain(g.icon);
    }
  });

  it("uses only real part types, each once per group", () => {
    for (const g of DISPLAY_GROUPS) {
      const list = g.items.map((i) => i.partTypeId);
      expect(new Set(list).size, g.id).toBe(list.length);
      for (const id of list) expect(getPartType(id), `${g.id}: ${id}`).not.toBeNull();
    }
  });

  it("shows every part type of the dictionary somewhere", () => {
    const listed = new Set(DISPLAY_GROUPS.flatMap((g) => g.items.map((i) => i.partTypeId)));
    const missing = PART_TYPES.map((p) => p.id).filter((id) => !listed.has(id));
    expect(missing).toEqual([]);
  });

  it("puts 4–6 popular parts first in every group", () => {
    for (const g of DISPLAY_GROUPS) {
      const popular = g.items.filter((i) => i.popular).length;
      expect(popular, g.id).toBeGreaterThanOrEqual(4);
      expect(popular, g.id).toBeLessThanOrEqual(6);
      expect(g.items.slice(0, popular).every((i) => i.popular), g.id).toBe(true);
    }
  });

  it("limits the engine group to cars with an engine and the HV group to cars with a traction battery", () => {
    const engine = DISPLAY_GROUPS.find((g) => g.id === "powertrain");
    const hv = DISPLAY_GROUPS.find((g) => g.id === "hv");
    expect(engine?.only).toEqual(["ice", "hev", "phev", "erev"]);
    expect(hv?.only).toEqual(["hev", "phev", "erev", "bev"]);
  });

  it("is read-only", () => {
    expect(Object.isFrozen(DISPLAY_GROUPS)).toBe(true);
    expect(Object.isFrozen(DISPLAY_GROUPS[0].items)).toBe(true);
    expect(Object.isFrozen(DISPLAY_GROUPS[0].items[0])).toBe(true);
  });
});

describe("assortmentFor", () => {
  it("gives an electric car no engine parts and the full high-voltage system", () => {
    const bev = ids("bev");
    for (const id of ENGINE_ONLY) expect(bev.has(id), id).toBe(false);
    for (const id of [...HV_PARTS, "reducer", "electric-coolant-pump", "thermal-valve", "battery-chiller", "ptc-heater"]) {
      expect(bev.has(id), id).toBe(true);
    }
    expect(bev.has("range-extender")).toBe(false);
    expect(groupIds("bev")).not.toContain("powertrain");
    expect(groupIds("bev")).toContain("hv");
  });

  it("gives a petrol car no traction battery or charging", () => {
    const ice = ids("ice");
    for (const id of [...HV_PARTS, "thermal-valve", "battery-chiller", "ptc-heater", "range-extender"]) {
      expect(ice.has(id), id).toBe(false);
    }
    for (const id of ENGINE_ONLY) expect(ice.has(id), id).toBe(true);
    expect(groupIds("ice")).not.toContain("hv");
  });

  it("gives a full hybrid its traction battery and e-motor but no charging", () => {
    const hev = ids("hev");
    for (const id of ["hv-battery", "battery-module", "bms", "inverter", "e-motor", "dcdc", "hv-cable", "vcu", "engine-oil", "gearbox"]) {
      expect(hev.has(id), id).toBe(true);
    }
    for (const id of ["charging-port", "charge-port-door", "charging-cable", "obc", "range-extender"]) expect(hev.has(id), id).toBe(false);
    expect(groupIds("hev")).toEqual(expect.arrayContaining(["powertrain", "hv"]));
    const jolion = new Set(assortmentFor(getModel("haval-jolion")).flatMap((g) => g.items.map((i) => i.id)));
    expect(jolion.has("hv-battery") && !jolion.has("charging-port")).toBe(true);
    expect(zonePartTypes("underbody", "hev").map((x) => x.id)).toContain("hv-battery");
  });

  it("follows each hybrid layout", () => {
    expect(groupIds("hev")).toContain("powertrain");
    const phev = ids("phev");
    for (const id of ["engine-oil", "spark-plug", "exhaust-muffler", "gearbox", ...HV_PARTS]) expect(phev.has(id), id).toBe(true);
    expect(phev.has("clutch-kit")).toBe(false);
    const erev = ids("erev");
    for (const id of ["engine-oil", "spark-plug", "range-extender", "reducer", ...HV_PARTS]) expect(erev.has(id), id).toBe(true);
    for (const id of ["gearbox", "clutch-kit", "shift-cable"]) expect(erev.has(id), id).toBe(false);
  });

  it("shows each part once and counts it", () => {
    for (const p of [...POWERTRAINS.map((x) => [x]), ["bev", "phev"], [...POWERTRAINS]] as Powertrain[][]) {
      const groups = assortmentFor(p);
      const all = groups.flatMap((g) => g.items.map((i) => i.id));
      expect(new Set(all).size, p.join("+")).toBe(all.length);
      for (const g of groups) {
        expect(g.count, g.id).toBe(g.items.length);
        expect(g.count, g.id).toBeGreaterThan(0);
        expect(g.popularCount, g.id).toBe(g.items.filter((i) => i.popular).length);
        const firstPlain = g.items.findIndex((i) => !i.popular);
        if (firstPlain >= 0) expect(g.items.slice(firstPlain).some((i) => i.popular), g.id).toBe(false);
      }
      expect(assortmentSize(groups)).toBe(all.length);
    }
  });

  it("fills items from the dictionary", () => {
    const [group] = assortmentFor("ice");
    const item = group.items[0];
    expect(item).toMatchObject({ id: "cabin-filter", name: "Салонный фильтр", nameZh: "空调滤芯", popular: true });
    expect(item.partType).toBe(getPartType("cabin-filter"));
  });

  it("takes a catalog model, a list or nothing", () => {
    const song = getModel("byd-song-plus-ev");
    expect(assortmentFor(song)).toEqual(assortmentFor("bev"));
    const han = getModel("byd-han");
    const hanIds = new Set(assortmentFor(han).flatMap((g) => g.items.map((i) => i.id)));
    expect(hanIds.has("engine-oil") && hanIds.has("hv-battery")).toBe(true);
    // Unknown powertrain: show everything rather than hide parts the car may have.
    expect(assortmentFor(null)).toEqual(assortmentFor([...POWERTRAINS]));
    expect(assortmentFor({ powertrains: [] })).toEqual(assortmentFor([...POWERTRAINS]));
    for (const m of MODELS) expect(assortmentFor(m).length, m.id).toBeGreaterThanOrEqual(11);
  });
});

describe("groupForPartType", () => {
  it("finds the group a part is shown in for this car", () => {
    expect(groupForPartType("brake-pads")).toBe("brakes");
    expect(groupForPartType("reducer", "bev")).toBe("hv");
    expect(groupForPartType("reducer", "erev")).toBe("powertrain");
    expect(groupForPartType("engine-oil", "bev")).toBeNull();
    expect(groupForPartType("unknown")).toBeNull();
  });
});

describe("zonePartTypes", () => {
  it("gives every zone 4–10 real parts for every powertrain", () => {
    for (const zone of ZONE_IDS) {
      for (const p of POWERTRAINS) {
        const list = zonePartTypes(zone, p);
        expect(list.length, `${zone} ${p}`).toBeGreaterThanOrEqual(4);
        expect(list.length, `${zone} ${p}`).toBeLessThanOrEqual(ZONE_LIMIT);
        expect(new Set(list.map((x) => x.id)).size, `${zone} ${p}`).toBe(list.length);
        const shown = ids(p);
        for (const part of list) expect(shown.has(part.id), `${zone} ${p}: ${part.id}`).toBe(true);
      }
      for (const row of ZONE_PART_ROWS[zone]) expect(getPartType(row.partTypeId), `${zone}: ${row.partTypeId}`).not.toBeNull();
    }
  });

  it("opens the charge port on plug-in cars and the fuel flap on the others", () => {
    const charge = (p: Powertrain) => zonePartTypes("charge", p).map((x) => x.id);
    expect(charge("bev")[0]).toBe("charging-port");
    expect(charge("bev")).not.toContain("fuel-door");
    expect(charge("ice")[0]).toBe("fuel-door");
    expect(charge("hev")).not.toContain("charging-port");
    expect(charge("phev").slice(0, 2)).toEqual(["charging-port", "charge-port-door"]);
    expect(charge("phev")).toContain("fuel-door");
  });

  it("shows the battery under an electric car and the exhaust under a petrol one", () => {
    const under = (p: Powertrain) => zonePartTypes("underbody", p).map((x) => x.id);
    expect(under("bev")[0]).toBe("hv-battery");
    expect(under("bev")).not.toContain("exhaust-muffler");
    expect(under("ice")[0]).toBe("exhaust-muffler");
    expect(under("ice")).not.toContain("hv-battery");
    expect(under("phev")).toEqual(expect.arrayContaining(["hv-battery", "exhaust-muffler"]));
  });

  it("puts the most relevant part first in each zone", () => {
    const first = (zone: (typeof ZONE_IDS)[number]) => zonePartTypes(zone, "ice")[0]?.id;
    expect(first("front")).toBe("bumper");
    expect(first("hood")).toBe("hood");
    expect(first("windshield")).toBe("windshield");
    expect(first("mirror")).toBe("mirror");
    expect(first("door")).toBe("door");
    expect(first("wheel-front")).toBe("brake-pads");
    expect(first("rear")).toBe("tail-light");
    expect(first("interior")).toBe("central-screen");
    expect(zonePartTypes("windshield", "ice").map((x) => x.id)).toContain("front-camera");
    expect(zonePartTypes("hood", "bev").map((x) => x.id)).not.toContain("air-filter");
  });

  it("accepts a model or nothing", () => {
    expect(zonePartTypes("charge", getModel("li-auto-l9"))).toEqual(zonePartTypes("charge", "erev"));
    expect(zonePartTypes("charge").length).toBeLessThanOrEqual(ZONE_LIMIT);
    expect(zonePartTypes("charge").map((x) => x.id)).toEqual(expect.arrayContaining(["charging-port", "fuel-door"]));
  });
});

describe("partZone", () => {
  it("places a part where its hotspot is, else where its group is", () => {
    expect(partZone("bumper")).toBe("front");
    expect(partZone("brake-pads")).toBe("wheel-front");
    expect(partZone("tail-light")).toBe("rear");
    expect(partZone("central-screen")).toBe("interior");
    expect(partZone("spark-plug", "maintenance")).toBe("hood");
    expect(partZone("gearbox", "powertrain")).toBe("hood");
    expect(partZone("unknown")).toBeNull();
    for (const g of DISPLAY_GROUPS) for (const item of g.items) expect(partZone(item.partTypeId, g.id), item.partTypeId).not.toBeNull();
  });
});
