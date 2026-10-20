import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import { providerCalls, vehicles } from "@/lib/db/schema";
import { FIXTURE_NOTICE, FIXTURE_VINS, FixtureProvider, syntheticVin } from "@/lib/providers/fixture";
import type { CatalogPart, PartsProvider, PartsResult } from "@/lib/providers/types";
import { makeUser, testDb } from "@/tests/helpers/db";
import { catalogAvailability, catalogSource, getCategories, getParts, partFitment, searchOe } from "../catalog";
import { addManualVehicle, addVehicleByVin, selectCandidate } from "../vehicles";

const T0 = new Date("2026-10-20T08:00:00Z");
const fixture = () => ({ provider: new FixtureProvider(), now: T0 });

async function car(db: Db, owner: Actor, vin: string) {
  return (await addVehicleByVin(db, owner, { vin }, fixture())).vehicle;
}

function catalogPart(oe: string, extra: Partial<CatalogPart> = {}): CatalogPart {
  return {
    oe,
    normalizedOe: oe.replace(/[^A-Z0-9]/g, ""),
    name: oe,
    nameZh: "",
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

// Live-mode provider with a fixed parts answer; it never touches the network.
function liveParts(parts: CatalogPart[]): PartsProvider & { parts: ReturnType<typeof vi.fn> } {
  const answer: PartsResult = { status: "success", message: "ok", providerCode: 1, source: "provider", parts };
  return {
    name: "17vin",
    mode: "live",
    decodeVin: async () => ({ status: "empty", message: "", source: "provider", candidates: [], ambiguous: false }),
    categories: async () => ({ status: "empty", message: "", source: "provider", categories: [] }),
    parts: vi.fn(async () => answer),
    searchOe: async () => answer,
  };
}

describe("catalogAvailability", () => {
  it("explains why the catalog cannot be opened", () => {
    const base = { vin: FIXTURE_VINS.bydSongPlus, epc: "byd", epcId: "9001" };
    expect(catalogAvailability({ ...base, decodeStatus: "decoded" })).toEqual({ available: true, reason: null });
    expect(catalogAvailability({ ...base, decodeStatus: "ambiguous" })).toEqual({ available: true, reason: null });
    expect(catalogAvailability({ ...base, vin: null, decodeStatus: "manual" })).toEqual({ available: false, reason: "manual" });
    expect(catalogAvailability({ ...base, vin: null, decodeStatus: "decoded" })).toEqual({ available: false, reason: "no_vin" });
    expect(catalogAvailability({ ...base, decodeStatus: "unsupported" })).toEqual({ available: false, reason: "unsupported" });
    for (const decodeStatus of ["error", "pending"] as const)
      expect(catalogAvailability({ ...base, decodeStatus })).toEqual({ available: false, reason: "no_epc" });
    expect(catalogAvailability({ ...base, epc: null, decodeStatus: "decoded" })).toEqual({ available: false, reason: "no_epc" });
  });

  it("only warns when epc_id is 0, as for Li Auto and Zeekr in the trial", () => {
    expect(catalogAvailability({ vin: FIXTURE_VINS.zeekr001, epc: "zeekr", epcId: "0", decodeStatus: "decoded" })).toEqual({
      available: true,
      reason: "likely_unavailable",
    });
  });
});

describe("partFitment", () => {
  const decoded = { decodeStatus: "decoded" as const, candidates: [], selectedCandidateId: null };
  const trims = [
    { id: "a", brand: "", model: "", year: "", version: "", description: "", engine: "", fuel: "", drive: "", epcId: "", image: null },
    { id: "b", brand: "", model: "", year: "", version: "", description: "", engine: "", fuel: "", drive: "", epcId: "", image: null },
  ];
  const ambiguous = { decodeStatus: "ambiguous" as const, candidates: trims, selectedCandidateId: null };

  it("confirms by VIN only with the provider's fit and an unambiguous trim", () => {
    expect(partFitment(catalogPart("1"), decoded)).toBe("vin_confirmed");
    expect(partFitment(catalogPart("1", { providerFit: null }), decoded)).toBe("needs_check");
    expect(partFitment(catalogPart("1", { providerFit: false }), decoded)).toBe("needs_check");
    expect(partFitment(catalogPart("1"), ambiguous)).toBe("needs_check");
    expect(partFitment(catalogPart("1"), { ...ambiguous, selectedCandidateId: "a" })).toBe("vin_confirmed");
    // A stale selection that is no longer on the list does not count.
    expect(partFitment(catalogPart("1"), { ...ambiguous, selectedCandidateId: "gone" })).toBe("needs_check");
    for (const decodeStatus of ["unsupported", "error", "pending", "manual"] as const)
      expect(partFitment(catalogPart("1"), { ...decoded, decodeStatus })).toBe("needs_check");
  });

  it("keeps option-specific parts for a check when the owner chose the trim", () => {
    const chosen = { ...ambiguous, selectedCandidateId: "b" };
    expect(partFitment(catalogPart("1", { modelOptional: "5G" }), chosen)).toBe("needs_check");
    expect(partFitment(catalogPart("1", { modelNotOptional: "5G" }), chosen)).toBe("needs_check");
    expect(partFitment(catalogPart("1", { modelOptional: "5G" }), decoded)).toBe("vin_confirmed");
  });
});

describe("getCategories", () => {
  it("walks the BYD fixture catalog by levels, down to level 4", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const byd = await car(db, owner, FIXTURE_VINS.bydSongPlus);
    const l1 = await getCategories(db, owner, byd.id, { level: 1 }, fixture());
    expect(l1).toMatchObject({ ok: true, status: "success", source: "fixture", availability: { available: true, reason: null } });
    expect(l1.message).toContain(FIXTURE_NOTICE);
    expect(l1.categories.map((c) => c.code)).toEqual(["01", "03", "06", "10"]);
    expect(l1.vehicle.id).toBe(byd.id);
    const l2 = await getCategories(db, owner, byd.id, { level: 2, parentCode: "10" }, fixture());
    expect(l2.categories.map((c) => c.code)).toContain("10-03");
    const l3 = await getCategories(db, owner, byd.id, { level: 3, parentCode: "10-03" }, fixture());
    expect(l3.categories.find((c) => c.code === "SA3HJ-10035")?.last).toBe(false);
    const l4 = await getCategories(db, owner, byd.id, { level: 4, parentCode: "SA3HJ-10035" }, fixture());
    expect(l4.categories).toMatchObject([{ code: "SA3HJ-10035-1", level: 4, last: true }]);
  });

  it("reports an empty or unsupported catalog as a calm answer, not an exception", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const li = await car(db, owner, FIXTURE_VINS.liAutoL6);
    expect(await getCategories(db, owner, li.id, { level: 1 }, fixture())).toMatchObject({ ok: false, status: "empty", categories: [] });
    const zeekr = await car(db, owner, FIXTURE_VINS.zeekr001);
    const answer = await getCategories(db, owner, zeekr.id, { level: 1 }, fixture());
    expect(answer).toMatchObject({ ok: false, status: "unsupported", availability: { available: true, reason: "likely_unavailable" } });
    expect(answer.message).toContain("1003");
  });

  it("refuses cars without a catalog and bad levels before calling the provider", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const provider = new FixtureProvider();
    const spy = vi.spyOn(provider, "categories");
    const manual = await addManualVehicle(db, owner, { brand: "BYD", model: "Han", year: 2022 });
    await expect(getCategories(db, owner, manual.id, { level: 1 }, { provider })).rejects.toMatchObject({ status: 400, code: "catalog_manual" });
    const unknown = await car(db, owner, syntheticVin("LGX", "TXUNK", "PATX0099"));
    await expect(getCategories(db, owner, unknown.id, { level: 1 }, { provider })).rejects.toMatchObject({ code: "catalog_unsupported" });
    await db.update(vehicles).set({ decodeStatus: "error", epc: null }).where(eq(vehicles.id, unknown.id));
    await expect(getCategories(db, owner, unknown.id, { level: 1 }, { provider })).rejects.toMatchObject({ code: "catalog_no_epc" });
    const byd = await car(db, owner, FIXTURE_VINS.bydSongPlus);
    for (const level of [0, 5, 1.5, Number.NaN])
      await expect(getCategories(db, owner, byd.id, { level }, { provider })).rejects.toMatchObject({ code: "invalid_level" });
    await expect(getCategories(db, owner, byd.id, { level: 2 }, { provider })).rejects.toMatchObject({ code: "invalid_code" });
    await expect(getCategories(db, owner, byd.id, { level: 2, parentCode: "  " }, { provider })).rejects.toMatchObject({ code: "invalid_code" });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("getParts", () => {
  it("needs a check for every part while the BYD trim is not chosen", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const byd = await car(db, owner, FIXTURE_VINS.bydSongPlus);
    const answer = await getParts(db, owner, byd.id, { categoryCode: "SA3HJ-01021", level: 3 }, fixture());
    expect(answer.ok).toBe(true);
    expect(answer.parts.map((p) => [p.oe, p.fitment])).toEqual([
      ["10301727-00", "needs_check"],
      ["10301731-00", "needs_check"],
    ]);
  });

  it("confirms by VIN after the owner picks the trim, except option-specific parts", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const byd = await car(db, owner, FIXTURE_VINS.bydSongPlus);
    await selectCandidate(db, owner, byd.id, byd.candidates[1].id);
    const oil = await getParts(db, owner, byd.id, { categoryCode: "SA3HJ-01021", level: 3 }, fixture());
    expect(oil.parts.every((p) => p.fitment === "vin_confirmed")).toBe(true);
    const tbox = await getParts(db, owner, byd.id, { categoryCode: "SA3HJ-10071", level: 3 }, fixture());
    expect(tbox.parts.map((p) => p.fitment)).toEqual(["needs_check", "needs_check"]);
    const tail = await getParts(db, owner, byd.id, { categoryCode: "SA3HJ-10035-1", level: 4 }, fixture());
    expect(tail.parts.map((p) => p.oe)).toEqual(["10248801-00", "10248802-00"]);
  });

  it("confirms a single-trim car only where the provider reports the fit", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const geely = await car(db, owner, FIXTURE_VINS.geelyGalaxyE5);
    const body = await getParts(db, owner, geely.id, { categoryCode: "5010-11", level: 3 }, fixture());
    expect(body.parts).toMatchObject([{ oe: "6608412345C15", fitment: "vin_confirmed" }]);

    const provider = liveParts([catalogPart("A-1"), catalogPart("A-2", { providerFit: null }), catalogPart("A-3", { providerFit: false })]);
    const live = await getParts(db, owner, geely.id, { categoryCode: "5010-11", level: 3 }, { provider, now: T0 });
    expect(live.parts.map((p) => [p.oe, p.fitment])).toEqual([
      ["A-1", "vin_confirmed"],
      ["A-2", "needs_check"],
      ["A-3", "needs_check"],
    ]);
    expect(live.source).toBe("provider");
  });

  it("answers empty for a group without parts", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const byd = await car(db, owner, FIXTURE_VINS.bydSongPlus);
    expect(await getParts(db, owner, byd.id, { categoryCode: "10-03", level: 2 }, fixture())).toMatchObject({ ok: false, status: "empty", parts: [] });
    await expect(getParts(db, owner, byd.id, { categoryCode: "", level: 3 }, fixture())).rejects.toMatchObject({ code: "invalid_code" });
  });
});

describe("catalog permissions", () => {
  it("hides another owner's car from customers and staff without calling the provider", async () => {
    const db = await testDb();
    const owner = await makeUser(db);
    const byd = await car(db, owner, FIXTURE_VINS.bydSongPlus);
    const provider = new FixtureProvider();
    const categories = vi.spyOn(provider, "categories");
    const parts = vi.spyOn(provider, "parts");
    for (const actor of [await makeUser(db), await makeUser(db, "master"), await makeUser(db, "sourcer"), await makeUser(db, "admin")]) {
      await expect(getCategories(db, actor, byd.id, { level: 1 }, { provider })).rejects.toMatchObject({ status: 404 });
      await expect(getParts(db, actor, byd.id, { categoryCode: "SA3HJ-01021", level: 3 }, { provider })).rejects.toMatchObject({
        status: 404,
      });
    }
    expect(categories).not.toHaveBeenCalled();
    expect(parts).not.toHaveBeenCalled();
  });

  it("caps paid catalog calls per customer and master, but not for staff", async () => {
    const db = await testDb();
    const customer = await makeUser(db);
    const master = await makeUser(db, "master");
    const sourcer = await makeUser(db, "sourcer");
    const calls = (userId: string, n: number) =>
      Array.from({ length: n }, () => ({
        provider: "17vin",
        operation: "parts",
        mode: "live" as const,
        inputMask: "LGX…0001 byd L3 X",
        status: "success",
        durationMs: 1,
        userId,
        createdAt: T0,
      }));
    await db.insert(providerCalls).values([...calls(customer.id, 60), ...calls(master.id, 60), ...calls(sourcer.id, 70)]);
    const provider = liveParts([catalogPart("A-1")]);
    const input = { categoryCode: "5010-11", level: 3 };
    const mine = async (actor: Actor) => car(db, actor, FIXTURE_VINS.geelyGalaxyE5);
    await expect(getParts(db, customer, (await mine(customer)).id, input, { provider, now: T0 })).rejects.toMatchObject({ status: 429 });
    expect((await getParts(db, master, (await mine(master)).id, input, { provider, now: T0 })).ok).toBe(true);
    expect((await getParts(db, sourcer, (await mine(sourcer)).id, input, { provider, now: T0 })).ok).toBe(true);
    await expect(searchOe(db, customer, "10301727-00", { provider, now: T0 })).rejects.toMatchObject({ status: 429 });
  });
});

describe("catalog budget and the cache", () => {
  it("keeps cached pages open for a customer over the budget: only paid calls are refused", async () => {
    const db = await testDb();
    const customer = await makeUser(db);
    const vehicle = await car(db, customer, FIXTURE_VINS.geelyGalaxyE5);
    const provider = liveParts([catalogPart("A-1")]);
    const input = { categoryCode: "5010-11", level: 3 };
    // The page is opened once while there is budget left: it is now cached.
    expect((await getParts(db, customer, vehicle.id, input, { provider, now: T0 })).ok).toBe(true);
    expect(provider.parts).toHaveBeenCalledTimes(1);
    await db.insert(providerCalls).values(
      Array.from({ length: 60 }, () => ({
        provider: "17vin",
        operation: "parts",
        mode: "live" as const,
        inputMask: "L6T…0002 geely L3 X",
        status: "success",
        durationMs: 1,
        userId: customer.id,
        createdAt: T0,
      })),
    );
    const again = await getParts(db, customer, vehicle.id, input, { provider, now: T0 });
    expect(again.ok).toBe(true);
    expect(provider.parts).toHaveBeenCalledTimes(1);
    // A page that is not cached would be a paid call: refused, and the provider is not called.
    await expect(getParts(db, customer, vehicle.id, { categoryCode: "5010-12", level: 3 }, { provider, now: T0 })).rejects.toMatchObject({
      status: 429,
    });
    expect(provider.parts).toHaveBeenCalledTimes(1);
  });
});

describe("searchOe", () => {
  it("finds OE numbers across catalogs, never as confirmed for a car", async () => {
    const db = await testDb();
    const actor = await makeUser(db);
    const found = await searchOe(db, actor, "1027336800", fixture());
    expect(found).toMatchObject({ ok: true, status: "success", source: "fixture" });
    expect(found.parts).toMatchObject([{ oe: "10273368-00", fitment: "needs_check" }]);
    expect(await searchOe(db, actor, "99999999-99", fixture())).toMatchObject({ ok: false, status: "empty", parts: [] });
  });

  it("rejects input that is not an OE number", async () => {
    const db = await testDb();
    const actor = await makeUser(db);
    for (const oe of ["", "   ", "<script>", "x".repeat(101)])
      await expect(searchOe(db, actor, oe, fixture())).rejects.toMatchObject({ status: 400, code: "invalid_oe" });
  });
});

describe("catalogSource", () => {
  it("tells fixture mode from the live provider", () => {
    expect(catalogSource({ provider: new FixtureProvider() })).toBe("fixture");
    expect(catalogSource({ provider: liveParts([]) })).toBe("provider");
  });
});
