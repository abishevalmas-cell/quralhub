import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import { providerCalls, vehicles } from "@/lib/db/schema";
import { FIXTURE_NOTICE, FIXTURE_VINS, FixtureProvider, syntheticVin } from "@/lib/providers/fixture";
import type { DecodeResult, PartsProvider, VehicleCandidate } from "@/lib/providers/types";
import { makeUser, testDb } from "@/tests/helpers/db";
import {
  addManualVehicle,
  addVehicleByVin,
  archiveVehicle,
  getVehicle,
  listVehicles,
  redecode,
  renameVehicle,
  selectCandidate,
} from "../vehicles";

// Route handlers read the actor from the session cookie and the database from getDb(); both are swapped here,
// everything else (zod bodies, services, the fixture provider) runs for real.
const routeState = vi.hoisted(() => ({ db: null as Db | null, actor: null as Actor | null }));
vi.mock("@/lib/auth/current", async () => {
  const { unauthorized } = await import("@/lib/server/errors");
  return {
    getActor: async () => routeState.actor,
    requireActor: async () => {
      if (!routeState.actor) throw unauthorized();
      return routeState.actor;
    },
  };
});
vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  getDb: async () => routeState.db,
}));

const T0 = new Date("2026-10-20T08:00:00Z");
const fixture = () => ({ provider: new FixtureProvider(), now: T0 });

function candidate(id: string, extra: Partial<VehicleCandidate> = {}): VehicleCandidate {
  return {
    id,
    brand: "BYD",
    model: "Seal",
    year: "2024",
    version: `Trim ${id}`,
    description: "",
    engine: "",
    fuel: "",
    drive: "",
    epcId: "77",
    image: null,
    ...extra,
  };
}

// A live-mode provider with scripted decode answers; it never touches the network.
function scripted(...answers: DecodeResult[]): PartsProvider & { decodeVin: ReturnType<typeof vi.fn> } {
  const empty = { status: "empty" as const, message: "", source: "provider" as const };
  return {
    name: "17vin",
    mode: "live",
    decodeVin: vi.fn(async () => answers.shift() ?? { ...empty, candidates: [], ambiguous: false }),
    categories: async () => ({ ...empty, categories: [] }),
    parts: async () => ({ ...empty, parts: [] }),
    searchOe: async () => ({ ...empty, parts: [] }),
  };
}

const ok = (candidates: VehicleCandidate[], extra: Partial<DecodeResult> = {}): DecodeResult => ({
  status: "success",
  message: "Ответ 17VIN",
  providerCode: 1,
  source: "provider",
  epc: "byd",
  epcId: "77",
  candidates,
  ambiguous: candidates.length > 1,
  ...extra,
});
const failed = (status: DecodeResult["status"]): DecodeResult => ({ status, message: status, source: "provider", candidates: [], ambiguous: false });

async function rowOf(db: Db, id: string) {
  const [row] = await db.select().from(vehicles).where(eq(vehicles.id, id));
  return row;
}

describe("addVehicleByVin", () => {
  it("keeps several trims as ambiguous and never picks one", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const { vehicle, message, source } = await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.bydSongPlus.toLowerCase(), label: " Папина " }, fixture());
    expect(source).toBe("fixture");
    expect(message).toContain(FIXTURE_NOTICE);
    expect(vehicle).toMatchObject({
      ownerId: owner.id,
      vin: FIXTURE_VINS.bydSongPlus,
      label: "Папина",
      decodeStatus: "ambiguous",
      brand: "BYD",
      model: "Song Plus DM-i",
      year: 2023,
      trim: null,
      selectedCandidateId: null,
      epc: "byd",
      epcId: "fx-9001",
      buildDate: "202303",
    });
    expect(vehicle.candidates).toHaveLength(2);
  });

  it("decodes a single trim into brand, model, year and trim", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const { vehicle } = await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.geelyGalaxyE5 }, fixture());
    expect(vehicle).toMatchObject({
      decodeStatus: "decoded",
      brand: "Geely Galaxy",
      model: "Galaxy E5",
      year: 2025,
      trim: "530km Star Warship Edition",
      epc: "geely",
      epcId: "fx-9002",
      selectedCandidateId: null,
    });
  });

  it("marks a VIN the catalog does not know as unsupported, keeping the WMI brand and the model year", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const vin = syntheticVin("LGX", "TXUNK", "PATX0099");
    const { vehicle } = await addVehicleByVin(db, owner, { vin }, fixture());
    expect(vehicle).toMatchObject({ decodeStatus: "unsupported", brand: "BYD", model: null, year: 2023, trim: null, candidates: [] });
    const unsupported = await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.zeekr001 }, { provider: scripted(failed("unsupported")), now: T0 });
    // L6T is shared by several Geely brands, so the maker is kept rather than a guessed brand.
    expect(unsupported.vehicle).toMatchObject({ decodeStatus: "unsupported", brand: "Geely Holding", year: 2024 });
  });

  it("fills brand and model of an ambiguous car only when every trim agrees", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const provider = scripted(ok([candidate("a"), candidate("b", { brand: "Denza", model: "Z9", year: "2025" })]));
    const { vehicle } = await addVehicleByVin(db, owner, { vin: syntheticVin("LGX", "TXAMB", "RATX0010") }, { provider, now: T0 });
    expect(vehicle).toMatchObject({ decodeStatus: "ambiguous", brand: null, model: null, trim: null, selectedCandidateId: null });
    // Candidates disagree on the year, so the year comes from the VIN (R = 2024).
    expect(vehicle.year).toBe(2024);
  });

  it("stores transport and account errors as a retryable error and decodes again on redecode", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const vin = syntheticVin("LGX", "TXERR", "RATX0011");
    for (const status of ["timeout", "network", "not_configured", "rate_limit", "auth", "quota_or_expired", "provider_error"] as const) {
      const { vehicle, message } = await addVehicleByVin(db, owner, { vin }, { provider: scripted(failed(status)), now: T0 });
      expect(vehicle).toMatchObject({ decodeStatus: "error", brand: "BYD", year: 2024 });
      expect(message).toBe(status);
    }
    const { vehicle } = await redecode(db, owner, (await listVehicles(db, owner))[0].id, { provider: scripted(ok([candidate("only")])), now: T0 });
    expect(vehicle).toMatchObject({ decodeStatus: "decoded", brand: "BYD", model: "Seal", year: 2024, trim: "Trim only" });
    expect(await listVehicles(db, owner)).toHaveLength(1);
  });

  it("does not throw away a good decode when a repeated decode fails", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const vin = syntheticVin("LGX", "TXKEP", "RATX0012");
    const first = await addVehicleByVin(db, owner, { vin }, { provider: scripted(ok([candidate("only")])), now: T0 });
    const again = await addVehicleByVin(db, owner, { vin }, { provider: scripted(failed("timeout")), now: T0 });
    expect(again.vehicle.id).toBe(first.vehicle.id);
    expect(again.vehicle).toMatchObject({ decodeStatus: "decoded", model: "Seal", trim: "Trim only" });
  });

  it("rejects an invalid VIN with the first error and offers fixes in the error code", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const typo = FIXTURE_VINS.bydSongPlus.slice(0, 13) + "O" + FIXTURE_VINS.bydSongPlus.slice(14);
    await expect(addVehicleByVin(db, owner, { vin: typo }, fixture())).rejects.toMatchObject({
      status: 400,
      code: `invalid_vin:${FIXTURE_VINS.bydSongPlus}`,
      message: expect.stringContaining(FIXTURE_VINS.bydSongPlus),
    });
    await expect(addVehicleByVin(db, owner, { vin: "LGX123" }, fixture())).rejects.toMatchObject({
      status: 400,
      code: "invalid_vin",
      message: expect.stringContaining("17 символов"),
    });
    // A Chinese VIN with a wrong check digit is a typo.
    const badCheck = FIXTURE_VINS.bydSongPlus.slice(0, 8) + "5" + FIXTURE_VINS.bydSongPlus.slice(9);
    await expect(addVehicleByVin(db, owner, { vin: badCheck }, fixture())).rejects.toMatchObject({ status: 400 });
    expect(await listVehicles(db, owner)).toHaveLength(0);
  });

  it("keeps one row per owner and VIN and brings an archived car back to the top", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const byd = await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.bydSongPlus }, { ...fixture(), now: T0 });
    const geely = await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.geelyGalaxyE5 }, { ...fixture(), now: new Date(T0.getTime() + 1000) });
    expect((await listVehicles(db, owner)).map((v) => v.id)).toEqual([geely.vehicle.id, byd.vehicle.id]);

    const same = await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.bydSongPlus, label: "Работа" }, { ...fixture(), now: new Date(T0.getTime() + 2000) });
    expect(same.vehicle.id).toBe(byd.vehicle.id);
    expect(same.vehicle.label).toBe("Работа");
    // Not archived, so its place in the list does not change.
    expect((await listVehicles(db, owner)).map((v) => v.id)).toEqual([geely.vehicle.id, byd.vehicle.id]);

    await archiveVehicle(db, owner, byd.vehicle.id, { now: new Date(T0.getTime() + 3000) });
    expect((await listVehicles(db, owner)).map((v) => v.id)).toEqual([geely.vehicle.id]);
    await expect(getVehicle(db, owner, byd.vehicle.id)).rejects.toMatchObject({ status: 404 });

    const back = await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.bydSongPlus }, { ...fixture(), now: new Date(T0.getTime() + 4000) });
    expect(back.vehicle).toMatchObject({ id: byd.vehicle.id, archivedAt: null, label: "Работа" });
    expect((await listVehicles(db, owner)).map((v) => v.id)).toEqual([byd.vehicle.id, geely.vehicle.id]);
  });

  it("lets two owners add the same VIN independently", async () => {
    const db = await testDb();
    const a = await makeUser(db);
    const b = await makeUser(db, "master");
    const first = await addVehicleByVin(db, a, { vin: FIXTURE_VINS.deepalS7 }, fixture());
    const second = await addVehicleByVin(db, b, { vin: FIXTURE_VINS.deepalS7 }, fixture());
    expect(first.vehicle.id).not.toBe(second.vehicle.id);
    expect((await listVehicles(db, a)).map((v) => v.id)).toEqual([first.vehicle.id]);
    expect((await listVehicles(db, b)).map((v) => v.id)).toEqual([second.vehicle.id]);
  });

  it("limits paid decodes per customer per day, but not staff and not fixture mode", async () => {
    const db = await testDb();
    const customer = await makeUser(db);
    const sourcer = await makeUser(db, "sourcer");
    const rows = (userId: string) =>
      Array.from({ length: 60 }, () => ({
        provider: "17vin",
        operation: "decode",
        mode: "live" as const,
        inputMask: "LGX…0001",
        status: "success",
        durationMs: 1,
        userId,
        createdAt: T0,
      }));
    await db.insert(providerCalls).values([...rows(customer.id), ...rows(sourcer.id)]);
    const vin = syntheticVin("LGX", "TXLMT", "RATX0013");
    const provider = scripted(ok([candidate("only")]), ok([candidate("only")]));
    await expect(addVehicleByVin(db, customer, { vin }, { provider, now: T0 })).rejects.toMatchObject({ status: 429 });
    expect(provider.decodeVin).not.toHaveBeenCalled();
    expect(await listVehicles(db, customer)).toHaveLength(0);
    expect((await addVehicleByVin(db, sourcer, { vin }, { provider, now: T0 })).vehicle.decodeStatus).toBe("decoded");
    expect((await addVehicleByVin(db, customer, { vin: FIXTURE_VINS.geelyGalaxyE5 }, fixture())).vehicle.decodeStatus).toBe("decoded");
    // The next UTC day starts a new budget.
    const tomorrow = new Date("2026-10-21T00:00:01Z");
    expect((await addVehicleByVin(db, customer, { vin }, { provider, now: tomorrow })).vehicle.decodeStatus).toBe("decoded");
  });
});

describe("addManualVehicle", () => {
  it("adds a car without VIN as manual", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const vehicle = await addManualVehicle(db, owner, { brand: " Chery ", model: "Tiggo 7 Pro", year: 2022, trim: "", label: "Дача" }, { now: T0 });
    expect(vehicle).toMatchObject({
      ownerId: owner.id,
      vin: null,
      decodeStatus: "manual",
      brand: "Chery",
      model: "Tiggo 7 Pro",
      year: 2022,
      trim: null,
      label: "Дача",
      candidates: [],
    });
    // Several cars without VIN do not collide on the (owner, vin) index.
    await addManualVehicle(db, owner, { brand: "Haval", model: "Jolion", year: 2023 }, { now: T0 });
    expect(await listVehicles(db, owner)).toHaveLength(2);
  });

  it("checks brand, model and year", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    await expect(addManualVehicle(db, owner, { brand: " ", model: "X", year: 2022 })).rejects.toMatchObject({ status: 400, message: "Укажите марку" });
    await expect(addManualVehicle(db, owner, { brand: "BYD", model: "", year: 2022 })).rejects.toMatchObject({ message: "Укажите модель" });
    for (const year of [1979, 2028, 2022.5, Number.NaN])
      await expect(addManualVehicle(db, owner, { brand: "BYD", model: "Han", year }, { now: T0 })).rejects.toMatchObject({ status: 400 });
    expect((await addManualVehicle(db, owner, { brand: "BYD", model: "Han", year: 2027 }, { now: T0 })).year).toBe(2027);
    await expect(addManualVehicle(db, owner, { brand: "B".repeat(61), model: "Han", year: 2022 })).rejects.toMatchObject({ status: 400 });
  });
});

describe("selectCandidate", () => {
  it("records the owner's trim and clears it again", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const { vehicle } = await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.bydSongPlus }, fixture());
    const id5g = vehicle.candidates[1].id;
    const chosen = await selectCandidate(db, owner, vehicle.id, id5g);
    expect(chosen).toMatchObject({
      decodeStatus: "ambiguous",
      selectedCandidateId: id5g,
      trim: "Champion Edition 150KM Flagship PLUS 5G",
      brand: "BYD",
      year: 2023,
    });
    const cleared = await selectCandidate(db, owner, vehicle.id, null);
    expect(cleared).toMatchObject({ selectedCandidateId: null, trim: null, brand: "BYD", model: "Song Plus DM-i" });
  });

  it("keeps the choice across a repeated decode", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const { vehicle } = await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.bydSongPlus }, fixture());
    await selectCandidate(db, owner, vehicle.id, vehicle.candidates[0].id);
    const again = await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.bydSongPlus }, fixture());
    expect(again.vehicle).toMatchObject({ selectedCandidateId: vehicle.candidates[0].id, trim: "Champion Edition 150KM Flagship PLUS" });
  });

  it("refuses unknown candidates and cars with one trim", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const byd = (await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.bydSongPlus }, fixture())).vehicle;
    await expect(selectCandidate(db, owner, byd.id, "fx-other")).rejects.toMatchObject({ status: 400, code: "unknown_candidate" });
    const geely = (await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.geelyGalaxyE5 }, fixture())).vehicle;
    await expect(selectCandidate(db, owner, geely.id, geely.candidates[0].id)).rejects.toMatchObject({ code: "not_ambiguous" });
    const manual = await addManualVehicle(db, owner, { brand: "BYD", model: "Han", year: 2022 });
    await expect(selectCandidate(db, owner, manual.id, null)).rejects.toMatchObject({ code: "not_ambiguous" });
    expect((await rowOf(db, byd.id)).selectedCandidateId).toBeNull();
  });
});

describe("redecode, rename and archive", () => {
  it("redecodes only cars in error or pending state", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const decoded = (await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.geelyGalaxyE5 }, fixture())).vehicle;
    await expect(redecode(db, owner, decoded.id, fixture())).rejects.toMatchObject({ status: 400, code: "already_decoded" });
    const manual = await addManualVehicle(db, owner, { brand: "BYD", model: "Han", year: 2022 });
    await expect(redecode(db, owner, manual.id, fixture())).rejects.toMatchObject({ status: 400, code: "no_vin" });
    // A row left pending by an interrupted request can be decoded again.
    await db.update(vehicles).set({ decodeStatus: "pending" }).where(eq(vehicles.id, decoded.id));
    expect((await redecode(db, owner, decoded.id, fixture())).vehicle.decodeStatus).toBe("decoded");
  });

  it("renames with a trimmed label and clears it with an empty one", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const car = await addManualVehicle(db, owner, { brand: "BYD", model: "Han", year: 2022 });
    expect((await renameVehicle(db, owner, car.id, "  Машина   жены ")).label).toBe("Машина жены");
    expect((await renameVehicle(db, owner, car.id, "")).label).toBeNull();
    expect((await renameVehicle(db, owner, car.id, null)).label).toBeNull();
    await expect(renameVehicle(db, owner, car.id, "x".repeat(61))).rejects.toMatchObject({ status: 400 });
  });
});

describe("vehicle permissions", () => {
  it("hides a car from another customer and from staff as not found", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const stranger = await makeUser(db);
    const sourcer = await makeUser(db, "sourcer");
    const admin = await makeUser(db, "admin");
    const { vehicle } = await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.bydSongPlus, label: "Моя" }, fixture());
    for (const actor of [stranger, sourcer, admin]) {
      await expect(getVehicle(db, actor, vehicle.id)).rejects.toMatchObject({ status: 404 });
      await expect(selectCandidate(db, actor, vehicle.id, vehicle.candidates[0].id)).rejects.toMatchObject({ status: 404 });
      await expect(renameVehicle(db, actor, vehicle.id, "Чужая")).rejects.toMatchObject({ status: 404 });
      await expect(archiveVehicle(db, actor, vehicle.id)).rejects.toMatchObject({ status: 404 });
      await expect(redecode(db, actor, vehicle.id, fixture())).rejects.toMatchObject({ status: 404 });
      expect(await listVehicles(db, actor)).toEqual([]);
    }
    expect(await rowOf(db, vehicle.id)).toMatchObject({ label: "Моя", selectedCandidateId: null, archivedAt: null });
  });

  it("treats malformed and unknown ids as not found", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    for (const id of ["nope", "00000000-0000-0000-0000-000000000000", "' or 1=1 --"])
      await expect(getVehicle(db, owner, id)).rejects.toMatchObject({ status: 404 });
  });
});

describe("vehicle API routes", () => {
  afterEach(() => {
    routeState.db = null;
    routeState.actor = null;
  });

  const call = async (handler: (request: Request, context: never) => Promise<Response>, url: string, init: RequestInit = {}, id?: string) => {
    const request = new Request(`http://localhost${url}`, {
      ...init,
      headers: init.body ? { "content-type": "application/json" } : undefined,
    });
    const response = await handler(request, (id ? { params: Promise.resolve({ id }) } : undefined) as never);
    return { status: response.status, body: await response.json() };
  };

  it("adds, reads, picks a trim, browses and archives a car", async () => {
    const db = await testDb();
    routeState.db = db;
    routeState.actor = await makeUser(db);
    const list = await import("@/app/api/vehicles/route");
    const one = await import("@/app/api/vehicles/[id]/route");
    const categories = await import("@/app/api/vehicles/[id]/categories/route");
    const parts = await import("@/app/api/vehicles/[id]/parts/route");
    const decode = await import("@/app/api/vehicles/[id]/decode/route");

    const added = await call(list.POST, "/api/vehicles", { method: "POST", body: JSON.stringify({ vin: FIXTURE_VINS.bydSongPlus, label: "Моя" }) });
    expect(added.status).toBe(201);
    expect(added.body).toMatchObject({ source: "fixture", vehicle: { decodeStatus: "ambiguous", label: "Моя", trim: null } });
    const id = added.body.vehicle.id as string;

    const manual = await call(list.POST, "/api/vehicles", {
      method: "POST",
      body: JSON.stringify({ manual: { brand: "Chery", model: "Tiggo 4", year: 2021, trim: null } }),
    });
    expect(manual).toMatchObject({ status: 201, body: { vehicle: { decodeStatus: "manual", vin: null } } });
    expect((await call(list.GET, "/api/vehicles")).body.vehicles.map((v: { id: string }) => v.id)).toEqual([manual.body.vehicle.id, id]);

    const read = await call(one.GET, `/api/vehicles/${id}`, {}, id);
    expect(read.body).toMatchObject({ vehicle: { id }, availability: { available: true, reason: null } });

    const picked = await call(one.PATCH, `/api/vehicles/${id}`, { method: "PATCH", body: JSON.stringify({ selectedCandidateId: read.body.vehicle.candidates[0].id }) }, id);
    expect(picked.body.vehicle).toMatchObject({ selectedCandidateId: read.body.vehicle.candidates[0].id, trim: "Champion Edition 150KM Flagship PLUS" });
    const renamed = await call(one.PATCH, `/api/vehicles/${id}`, { method: "PATCH", body: JSON.stringify({ label: " Работа " }) }, id);
    expect(renamed.body.vehicle.label).toBe("Работа");

    const groups = await call(categories.GET, `/api/vehicles/${id}/categories?level=1`, {}, id);
    expect(groups.body).toMatchObject({ ok: true, status: "success", source: "fixture" });
    expect(groups.body.categories.map((c: { code: string }) => c.code)).toEqual(["01", "03", "06", "10"]);
    expect(groups.body.vehicle).toBeUndefined();
    const deeper = await call(categories.GET, `/api/vehicles/${id}/categories?level=4&parent=SA3HJ-10035`, {}, id);
    expect(deeper.body.categories).toMatchObject([{ code: "SA3HJ-10035-1", level: 4, last: true }]);

    const found = await call(parts.GET, `/api/vehicles/${id}/parts?code=SA3HJ-01021&level=3`, {}, id);
    expect(found.body.parts.map((p: { oe: string; fitment: string }) => [p.oe, p.fitment])).toEqual([
      ["10301727-00", "vin_confirmed"],
      ["10301731-00", "vin_confirmed"],
    ]);

    expect(await call(decode.POST, `/api/vehicles/${id}/decode`, { method: "POST" }, id)).toMatchObject({
      status: 400,
      body: { code: "already_decoded" },
    });
    expect(await call(one.DELETE, `/api/vehicles/${id}`, { method: "DELETE" }, id)).toMatchObject({ status: 200, body: { ok: true } });
    expect((await call(one.GET, `/api/vehicles/${id}`, {}, id)).status).toBe(404);
  });

  it("answers bad input with Russian messages and codes", async () => {
    const db = await testDb();
    routeState.db = db;
    routeState.actor = await makeUser(db);
    const list = await import("@/app/api/vehicles/route");
    const one = await import("@/app/api/vehicles/[id]/route");
    const categories = await import("@/app/api/vehicles/[id]/categories/route");
    const post = (body: unknown) => call(list.POST, "/api/vehicles", { method: "POST", body: JSON.stringify(body) });

    const typo = FIXTURE_VINS.bydSongPlus.slice(0, 13) + "O" + FIXTURE_VINS.bydSongPlus.slice(14);
    expect(await post({ vin: typo })).toMatchObject({ status: 400, body: { code: `invalid_vin:${FIXTURE_VINS.bydSongPlus}` } });
    expect(await post({})).toMatchObject({ status: 400, body: { error: "Введите VIN или укажите марку и модель" } });
    expect(await post({ manual: { brand: "BYD", model: "Han", year: "2022" } })).toMatchObject({ status: 400, body: { error: "Укажите год выпуска" } });
    expect(await post({ manual: { brand: "BYD", model: "Han" } })).toMatchObject({ status: 400, body: { error: "Укажите год выпуска" } });
    expect(await post({ vin: "x".repeat(201) })).toMatchObject({ status: 400, body: { error: "VIN слишком длинный" } });

    const car = (await post({ vin: FIXTURE_VINS.geelyGalaxyE5 })).body.vehicle.id as string;
    expect(await call(one.PATCH, `/api/vehicles/${car}`, { method: "PATCH", body: "{}" }, car)).toMatchObject({ status: 400, body: { error: "Нечего сохранять" } });
    expect(await call(categories.GET, `/api/vehicles/${car}/categories?level=2`, {}, car)).toMatchObject({ status: 400, body: { code: "invalid_code" } });
    expect(await call(categories.GET, `/api/vehicles/${car}/categories?level=abc`, {}, car)).toMatchObject({ status: 400, body: { code: "invalid_level" } });
  });

  it("hides cars of other owners and requires a session", async () => {
    const db = await testDb();
    routeState.db = db;
    const owner = await makeUser(db);
    const { vehicle } = await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.bydSongPlus }, fixture());
    const one = await import("@/app/api/vehicles/[id]/route");
    const categories = await import("@/app/api/vehicles/[id]/categories/route");
    const parts = await import("@/app/api/vehicles/[id]/parts/route");
    const list = await import("@/app/api/vehicles/route");

    for (const role of ["customer", "sourcer"] as const) {
      routeState.actor = await makeUser(db, role);
      expect((await call(one.GET, `/api/vehicles/${vehicle.id}`, {}, vehicle.id)).status).toBe(404);
      expect((await call(one.PATCH, `/api/vehicles/${vehicle.id}`, { method: "PATCH", body: JSON.stringify({ label: "x" }) }, vehicle.id)).status).toBe(404);
      expect((await call(one.DELETE, `/api/vehicles/${vehicle.id}`, { method: "DELETE" }, vehicle.id)).status).toBe(404);
      expect((await call(categories.GET, `/api/vehicles/${vehicle.id}/categories?level=1`, {}, vehicle.id)).status).toBe(404);
      expect((await call(parts.GET, `/api/vehicles/${vehicle.id}/parts?code=SA3HJ-01021&level=3`, {}, vehicle.id)).status).toBe(404);
      expect((await call(list.GET, "/api/vehicles")).body.vehicles).toEqual([]);
    }
    routeState.actor = null;
    expect(await call(list.GET, "/api/vehicles")).toMatchObject({ status: 401, body: { code: "unauthorized" } });
    expect((await call(one.GET, `/api/vehicles/${vehicle.id}`, {}, vehicle.id)).status).toBe(401);
    expect((await getVehicle(db, owner, vehicle.id)).archivedAt).toBeNull();
  });
});
