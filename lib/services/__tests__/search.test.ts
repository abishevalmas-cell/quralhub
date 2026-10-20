import { describe, expect, it, vi } from "vitest";
import { resolveActiveVehicle } from "@/components/home/active-vehicle";
import { analyzeQuery, missingPlacement, SEARCH_MAX_LENGTH, type TextView, type VinView } from "@/components/home/analyze";
import {
  findForMeHref,
  garageHref,
  loginHref,
  oeRequestHref,
  partRequestHref,
  photoRequestHref,
  requestParams,
} from "@/components/home/links";
import type { Db } from "@/lib/db";
import { partRequests, vehicles } from "@/lib/db/schema";
import { FIXTURE_VINS, FixtureProvider, syntheticVin } from "@/lib/providers/fixture";
import { getPartType } from "@/lib/taxonomy";
import { makeUser, testDb } from "@/tests/helpers/db";
import { getCategories } from "../catalog";
import { requestDraftFromQuery } from "../requests";
import { catalogMode, HOME_REQUESTS_LIMIT, homeData } from "../search";
import { addManualVehicle, addVehicleByVin, archiveVehicle, setVehicleColor } from "../vehicles";

const NOW = new Date("2026-10-20T08:00:00Z");
const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);
const fixture = (minutes = 0) => ({ provider: new FixtureProvider(), now: at(minutes) });

// Keys of the Russian ЙЦУКЕН layout, as in lib/vin/normalize.ts: what a VIN looks like typed without switching layout.
const EN_KEYS = "QWERTYUIOP[]ASDFGHJKL;'ZXCVBNM,.`";
const RU_KEYS = "ЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮЁ";
const onRussianLayout = (vin: string) => [...vin].map((c) => (EN_KEYS.includes(c) ? RU_KEYS[EN_KEYS.indexOf(c)] : c)).join("");

async function addRequest(db: Db, customerId: string, title: string, minutes: number, label?: string) {
  const [row] = await db
    .insert(partRequests)
    .values({
      customerId,
      title,
      status: "new",
      vehicleSnapshot: label ? { label } : null,
      createdAt: at(minutes),
      updatedAt: at(minutes),
    })
    .returning();
  return row;
}

describe("homeData", () => {
  it("returns the owner's garage with catalog modes and the latest requests", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const byd = (await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.bydSongPlus }, fixture(1))).vehicle;
    const zeekr = (await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.zeekr001, label: "Машина жены" }, fixture(2))).vehicle;
    const manual = await addManualVehicle(db, owner, { brand: "Chery", model: "Tiggo 7 Pro", year: 2023 }, { now: at(3) });
    const archived = await addManualVehicle(db, owner, { brand: "Haval", model: "H6", year: 2022 }, { now: at(4) });
    await archiveVehicle(db, owner, archived.id, { now: at(5) });

    for (let i = 0; i < HOME_REQUESTS_LIMIT + 2; i++) await addRequest(db, owner.id, `Заявка ${i}`, 10 + i, i === 5 ? "BYD Song Plus DM-i 2023" : undefined);

    const home = await homeData(db, owner);
    expect(home.vehicles.map(({ id, title, catalog }) => ({ id, title, catalog }))).toEqual([
      { id: manual.id, title: "Chery Tiggo 7 Pro 2023", catalog: "manual" },
      { id: zeekr.id, title: "Машина жены", catalog: "catalog_maybe" },
      { id: byd.id, title: "BYD Song Plus DM-i 2023", catalog: "catalog" },
    ]);
    expect(home.requests.map((r) => r.title)).toEqual(["Заявка 5", "Заявка 4", "Заявка 3", "Заявка 2"]);
    expect(home.requests[0]).toMatchObject({ status: "new", vehicleLabel: "BYD Song Plus DM-i 2023" });
    expect(home.requests[1].vehicleLabel).toBeNull();
  });

  it("describes each car for the vehicle stage: catalog model, paint and brand status, no VIN", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const byd = (await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.bydSongPlus }, fixture(1))).vehicle;
    const zeekr = (await addManualVehicle(db, owner, { modelId: "zeekr-x", year: 2024, color: "zeekr-green" }, { now: at(2) })).id;
    const odd = (await addManualVehicle(db, owner, { brand: "Avatr", model: "11", year: 2023 }, { now: at(3) })).id;
    await setVehicleColor(db, owner, byd.id, "black");
    const cars = Object.fromEntries((await homeData(db, owner)).vehicles.map((v) => [v.id, v]));
    expect(cars[byd.id]).toEqual({
      id: byd.id,
      title: "BYD Song Plus DM-i 2023",
      catalog: "catalog",
      label: null,
      name: "BYD Song Plus DM-i",
      year: 2023,
      // Two trims and no choice yet: the trim stays unknown.
      trim: null,
      modelId: "byd-song-plus-dmi",
      color: "black",
      hasVin: true,
      trimPending: true,
      brandStatus: "vin_catalog",
    });
    expect(cars[zeekr]).toMatchObject({ name: "Zeekr X", modelId: "zeekr-x", color: "zeekr-green", hasVin: false, brandStatus: "manual" });
    expect(cars[odd]).toMatchObject({ name: "Avatr 11", modelId: null, color: null, hasVin: false, brandStatus: null });
  });

  it("labels a car by what its catalog answered the last time, without calling the provider", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const provider = new FixtureProvider();
    const deps = { provider, now: NOW };
    const li = (await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.liAutoL6 }, deps)).vehicle;
    const zeekr = (await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.zeekr001 }, deps)).vehicle;
    const byd = (await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.bydSongPlus }, deps)).vehicle;
    const before = Object.fromEntries((await homeData(db, owner, { provider })).vehicles.map((v) => [v.id, v.catalog]));
    expect(before[li.id]).not.toBe("manual");
    for (const car of [li, zeekr, byd]) await getCategories(db, owner, car.id, { level: 1 }, deps);
    const categories = vi.spyOn(provider, "categories");
    const after = Object.fromEntries((await homeData(db, owner, { provider })).vehicles.map((v) => [v.id, v.catalog]));
    expect(after).toEqual({ [li.id]: "manual", [zeekr.id]: "manual", [byd.id]: "catalog" });
    expect(categories).not.toHaveBeenCalled();
  });

  it("never sends the VIN or decode details to the page", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.bydSongPlus }, fixture());
    const serialized = JSON.stringify(await homeData(db, owner));
    expect(serialized).not.toContain(FIXTURE_VINS.bydSongPlus);
    expect(serialized).not.toContain("candidates");
    expect(serialized).not.toContain("epc");
  });

  it("shows another customer nothing of the owner's", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const other = await makeUser(db);
    await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.geelyGalaxyE5 }, fixture());
    await addRequest(db, owner.id, "Фара левая", 1);
    expect(await homeData(db, other)).toEqual({ vehicles: [], requests: [] });
  });

  it("gives staff their own garage and requests, not the queue", async () => {
    const db = await testDb();
    const customer = await makeUser(db);
    const sourcer = await makeUser(db, "sourcer");
    const admin = await makeUser(db, "admin");
    await addRequest(db, customer.id, "Колодки передние", 1);
    await addRequest(db, sourcer.id, "Себе: фильтр салона", 2);
    expect((await homeData(db, sourcer)).requests.map((r) => r.title)).toEqual(["Себе: фильтр салона"]);
    expect(await homeData(db, admin)).toEqual({ vehicles: [], requests: [] });
  });

  it("marks a car whose VIN is not decoded yet", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const vin = syntheticVin("LS6", "TXERR", "SATX0099");
    await db.insert(vehicles).values({ ownerId: owner.id, vin, decodeStatus: "error", brand: "Changan" });
    expect((await homeData(db, owner)).vehicles).toEqual([expect.objectContaining({ title: "Changan", catalog: "not_decoded" })]);
    expect(catalogMode({ vin, decodeStatus: "unsupported", epc: null, epcId: null })).toBe("manual");
    expect(catalogMode({ vin: null, decodeStatus: "manual", epc: null, epcId: null })).toBe("manual");
    expect(catalogMode({ vin, decodeStatus: "pending", epc: null, epcId: null })).toBe("not_decoded");
  });
});

describe("analyzeQuery", () => {
  const analyze = (q: string) => analyzeQuery(q, NOW);

  it("recognises a valid VIN with maker and model year", () => {
    expect(analyze(FIXTURE_VINS.bydSongPlus)).toMatchObject({
      kind: "vin",
      vin: FIXTURE_VINS.bydSongPlus,
      complete: true,
      ok: true,
      errors: [],
      maker: "BYD",
      brands: [],
      year: 2023,
      china: true,
    });
    // Groups, lower case and a "VIN:" prefix are fine.
    const spaced = FIXTURE_VINS.liAutoL6.toLowerCase().replace(/(.{4})/g, "$1 ");
    expect(analyze(`VIN: ${spaced}`)).toMatchObject({ kind: "vin", vin: FIXTURE_VINS.liAutoL6, ok: true, maker: "Li Auto" });
    // One WMI, several brands: the hint lists them instead of guessing.
    expect(analyze(FIXTURE_VINS.zeekr001)).toMatchObject({ maker: "Geely Holding", brands: ["Zeekr", "Geely Galaxy", "Lynk & Co"] });
  });

  it("explains typos and offers one-tap fixes", () => {
    const withO = FIXTURE_VINS.bydSongPlus.replace("X0001", "XO001");
    const typo = analyze(withO) as VinView;
    expect(typo).toMatchObject({ kind: "vin", ok: false, complete: true });
    expect(typo.errors.map((e) => e.code)).toEqual(["forbidden_letters"]);
    expect(typo.suggestions).toEqual([FIXTURE_VINS.bydSongPlus]);

    // A wrong check digit is an error for a Chinese VIN.
    const vin = FIXTURE_VINS.bydSongPlus;
    const wrongDigit = vin.slice(0, 8) + (vin[8] === "1" ? "2" : "1") + vin.slice(9);
    const checked = analyze(wrongDigit) as VinView;
    expect(checked.ok).toBe(false);
    expect(checked.errors.map((e) => e.code)).toEqual(["check_digit"]);

    // Typed on the Russian layout: the retyped VIN is offered.
    const russian = analyze(onRussianLayout(vin)) as VinView;
    expect(russian.kind).toBe("vin");
    expect(russian.warnings.map((w) => w.code)).toContain("keyboard_layout");
    expect(russian.suggestions).toEqual([vin]);
  });

  it("follows a VIN while it is typed without shouting about the length", () => {
    const partial = analyze(FIXTURE_VINS.bydSongPlus.slice(0, 8)) as VinView;
    expect(partial).toMatchObject({ kind: "vin", length: 8, complete: false, ok: false, errors: [], maker: "BYD", year: null, oe: null });
    expect(analyze("HLX")).toMatchObject({ kind: "vin", length: 3, maker: "Li Auto" });
    // Too long: the length error shows, and the input may still be a part number.
    const long = analyze(FIXTURE_VINS.bydSongPlus + "1") as VinView;
    expect(long.errors.map((e) => e.code)).toEqual(["length"]);
    expect(long.oe).toBe(FIXTURE_VINS.bydSongPlus + "1");
  });

  it("keeps a part named next to a VIN for later", () => {
    expect(analyze(`фара левая ${FIXTURE_VINS.bydSongPlus}`)).toMatchObject({ kind: "vin", ok: true, part: { id: "headlight" } });
  });

  it("recognises part numbers", () => {
    expect(analyze("10273368-00")).toMatchObject({ kind: "oe", oe: "10273368-00", part: null });
    expect(analyze("колодки передние C385F270502-1300")).toMatchObject({
      kind: "oe",
      oe: "C385F270502-1300",
      part: { id: "brake-pads" },
      axis: "front",
    });
  });

  it("matches parts in text and leaves an ambiguous choice to the customer", () => {
    const pads = analyze("колодки передние") as TextView;
    expect(pads).toMatchObject({ kind: "text", preselected: "brake-pads", axis: "front", side: null });
    expect(pads.matches.map((p) => p.id)).toContain("brake-pads");

    const filter = analyze("фильтр") as TextView;
    expect(filter.preselected).toBeNull();
    expect(filter.matches.length).toBeGreaterThan(1);
    expect(filter.matches.length).toBeLessThanOrEqual(4);

    expect(analyze("стучит что-то")).toMatchObject({ kind: "text", matches: [], preselected: null });
    // Car names are text, not the start of a VIN.
    expect(analyze("Haval H6").kind).toBe("text");
    expect(analyze("Li Auto L9").kind).toBe("text");
    expect(analyze("   ").kind).toBe("empty");
    expect(analyze(null as unknown as string).kind).toBe("empty");
  });

  it("cuts very long input", () => {
    const view = analyze("фара ".repeat(1000)) as TextView;
    expect(view.kind).toBe("text");
    expect(view.text.length).toBeLessThanOrEqual(SEARCH_MAX_LENGTH);
  });

  it("asks for the axis and side a part needs", () => {
    const headlight = getPartType("headlight");
    const pads = getPartType("brake-pads");
    expect(missingPlacement(headlight, null, null)).toMatchObject({ side: true, hint: "Укажите сторону: у левой и правой детали разные номера." });
    expect(missingPlacement(headlight, null, "left").hint).toBeNull();
    expect(missingPlacement(pads, null, null)).toMatchObject({ axis: true, side: false, hint: "Укажите ось: у передней и задней детали разные номера." });
    expect(missingPlacement(null, null, null).hint).toBeNull();
  });
});

describe("home links", () => {
  const vehicleId = "6f1d1c2e-8a3b-4c5d-9e0f-1a2b3c4d5e6f";
  const asQuery = (href: string) => Object.fromEntries(requestParams(href));

  it("builds a request link the request form understands", () => {
    const pads = getPartType("brake-pads");
    const href = partRequestHref({ vehicleId, part: pads, axis: "front", side: null, q: "  колодки   передние " });
    expect(href.startsWith("/requests/new?")).toBe(true);
    expect(asQuery(href)).toEqual({ vehicle: vehicleId, part: "brake-pads", axis: "front", title: "Тормозные колодки", q: "колодки передние" });
    expect(requestDraftFromQuery(asQuery(href), [vehicleId])).toMatchObject({
      vehicleId,
      partTypeId: "brake-pads",
      axis: "front",
      side: null,
      title: "Тормозные колодки",
    });
  });

  it("leaves the part to the request form when the customer did not pick one", () => {
    const href = partRequestHref({ vehicleId: null, part: null, axis: "front", side: "left", q: "что-то стучит спереди" });
    expect(asQuery(href)).toEqual({ q: "что-то стучит спереди" });
    expect(requestDraftFromQuery(asQuery(href), []).title).toBe("что-то стучит спереди");
    expect(asQuery(partRequestHref({ vehicleId, part: null, axis: null, side: null, q: "ы".repeat(500) })).q).toHaveLength(300);
  });

  it("builds a part number link", () => {
    const href = oeRequestHref({ vehicleId, oe: " c385f270502-1300 " });
    expect(asQuery(href)).toEqual({ vehicle: vehicleId, oe: "C385F270502-1300", title: "Деталь по номеру C385F270502-1300" });
    expect(requestDraftFromQuery(asQuery(href), [vehicleId])).toMatchObject({ vehicleId, oe: "C385F270502-1300" });
    const named = oeRequestHref({ vehicleId: null, oe: "10273368-00", part: getPartType("headlight"), side: "left" });
    expect(asQuery(named)).toEqual({ oe: "10273368-00", part: "headlight", side: "left", title: "Фара" });
  });

  it("carries the typed request over to the photo request", () => {
    expect(photoRequestHref(vehicleId)).toBe(`/requests/new?vehicle=${vehicleId}&photo=1`);
    expect(photoRequestHref(null)).toBe("/requests/new?photo=1");
    const text = partRequestHref({ vehicleId, part: getPartType("headlight"), axis: null, side: "left", q: "левая фара" });
    expect(asQuery(photoRequestHref(vehicleId, requestParams(text)))).toEqual({ ...asQuery(text), photo: "1" });
  });

  it("keeps login and garage links on this site", () => {
    expect(loginHref("/")).toBe("/login?next=%2F");
    expect(loginHref("/requests/new?photo=1")).toBe("/login?next=%2Frequests%2Fnew%3Fphoto%3D1");
    expect(loginHref("//evil.example")).toBe("/login?next=%2F");
    expect(loginHref("https://evil.example")).toBe("/login?next=%2F");
    expect(loginHref("/\\evil.example")).toBe("/login?next=%2F");
    expect(garageHref(vehicleId)).toBe(`/garage/${vehicleId}`);
    expect(findForMeHref(vehicleId)).toBe(`/requests/new?vehicle=${vehicleId}`);
    expect(findForMeHref(null)).toBe("/requests/new");
  });
});

describe("resolveActiveVehicle", () => {
  it("keeps a stored car that is still in the garage, else takes the newest", () => {
    expect(resolveActiveVehicle("b", ["a", "b"])).toBe("b");
    expect(resolveActiveVehicle("gone", ["a", "b"])).toBe("a");
    expect(resolveActiveVehicle(null, ["a"])).toBe("a");
    expect(resolveActiveVehicle("a", [])).toBeNull();
  });
});
