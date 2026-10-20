import { describe, expect, it } from "vitest";
import { fitments } from "@/lib/db/schema";
import { FIXTURE_VINS } from "@/lib/providers";
import { makeUser, testDb } from "@/tests/helpers/db";
import { fitmentOeKey, fitmentSummaryForOe, fitmentsForVin, fitmentVin, recordFitment } from "../fitments";

const SONG = { vin: FIXTURE_VINS.bydSongPlus, brand: "BYD", model: "Song Plus", year: 2023, trim: "Flagship" };
const GALAXY = { vin: FIXTURE_VINS.geelyGalaxyE5, brand: "Geely", model: "Galaxy E5", year: 2024 };

describe("fitmentOeKey and fitmentVin", () => {
  it("keeps one spelling per OE number and refuses VINs in the OE field", () => {
    expect(fitmentOeKey("10086115-00")).toBe("1008611500");
    expect(fitmentOeKey(" 10086115 00 ")).toBe("1008611500");
    expect(fitmentOeKey("sa3hj-3501080")).toBe("SA3HJ3501080");
    expect(fitmentOeKey("")).toBeNull();
    expect(fitmentOeKey(null)).toBeNull();
    expect(fitmentOeKey("—")).toBeNull();
    expect(fitmentOeKey("A".repeat(41))).toBeNull();
    expect(fitmentOeKey(FIXTURE_VINS.bydSongPlus)).toBeNull();
    expect(fitmentOeKey(FIXTURE_VINS.bydSongPlus.toLowerCase().replace(/(.{5})/g, "$1-"))).toBeNull();
  });

  it("normalizes VINs and rejects anything that is not VIN-shaped", () => {
    expect(fitmentVin(` ${FIXTURE_VINS.zeekr001.toLowerCase()} `)).toBe(FIXTURE_VINS.zeekr001);
    expect(fitmentVin("LGXTXSP2")).toBeNull();
    expect(fitmentVin("LGXTXSP24PATX000I")).toBeNull();
    expect(fitmentVin(null)).toBeNull();
  });
});

describe("recordFitment", () => {
  it("stores a normalized row", async () => {
    const db = await testDb();
    const user = await makeUser(db);
    const row = await recordFitment(db, {
      ...SONG,
      vin: SONG.vin.toLowerCase(),
      brand: "  BYD ",
      trim: "Flagship\u0007 ",
      oe: "10086115-00",
      partTypeId: "brake-pads",
      source: "install_feedback",
      result: "fits",
      createdBy: user.id,
    });
    expect(row).toMatchObject({
      vin: SONG.vin,
      brand: "BYD",
      model: "Song Plus",
      year: 2023,
      trim: "Flagship",
      oe: "1008611500",
      partTypeId: "brake-pads",
      source: "install_feedback",
      result: "fits",
      orderId: null,
      createdBy: user.id,
    });
    const minimal = await recordFitment(db, { oe: "SA3HJ-3501080", source: "sourcer", result: "unknown" });
    expect(minimal).toMatchObject({ vin: null, brand: null, model: null, year: null, oe: "SA3HJ3501080" });
    expect(await db.select().from(fitments)).toHaveLength(2);
  });

  it("refuses bad input and writes nothing", async () => {
    const db = await testDb();
    const base = { oe: "10086115-00", source: "sourcer" as const, result: "fits" as const };
    await expect(recordFitment(db, { ...base, oe: "" })).rejects.toMatchObject({ status: 400 });
    await expect(recordFitment(db, { ...base, oe: FIXTURE_VINS.bydSongPlus })).rejects.toMatchObject({ status: 400 });
    await expect(recordFitment(db, { ...base, vin: "LGX123" })).rejects.toMatchObject({ status: 400 });
    await expect(recordFitment(db, { ...base, year: 1800 })).rejects.toMatchObject({ status: 400 });
    await expect(recordFitment(db, { ...base, year: 2023.5 })).rejects.toMatchObject({ status: 400 });
    await expect(recordFitment(db, { ...base, partTypeId: "no-such-part" })).rejects.toMatchObject({ status: 400 });
    await expect(recordFitment(db, { ...base, result: "maybe" as never })).rejects.toMatchObject({ status: 400 });
    await expect(recordFitment(db, { ...base, source: "guess" as never })).rejects.toMatchObject({ status: 400 });
    expect(await db.select().from(fitments)).toHaveLength(0);
  });
});

describe("fitmentSummaryForOe", () => {
  it("counts answers across spellings and lists cars without VINs", async () => {
    const db = await testDb();
    const oe = "10086115-00";
    const write = (car: Partial<typeof SONG>, result: "fits" | "not_fits" | "unknown", spelling = oe) =>
      recordFitment(db, { ...car, oe: spelling, source: "install_feedback", result });
    await write(SONG, "fits");
    await write(SONG, "fits", "1008611500");
    await write({ ...SONG, vin: FIXTURE_VINS.deepalS7 }, "fits", "10086115 00");
    await write(GALAXY, "fits");
    await write(GALAXY, "not_fits");
    await write({ brand: "BYD", model: "Han", year: 2022 }, "not_fits");
    await write({}, "fits");
    await write(SONG, "unknown");
    await write(SONG, "fits", "OTHER-1");

    const summary = await fitmentSummaryForOe(db, "10086115-00");
    expect(summary).toEqual({
      oe: "1008611500",
      fits: 5,
      notFits: 2,
      vehicles: [
        { brand: "BYD", model: "Song Plus", year: 2023 },
        { brand: "Geely", model: "Galaxy E5", year: 2024 },
      ],
    });
    const serialized = JSON.stringify(summary);
    for (const vin of Object.values(FIXTURE_VINS)) expect(serialized).not.toContain(vin);

    expect(await fitmentSummaryForOe(db, "1008611500")).toEqual(summary);
    expect(await fitmentSummaryForOe(db, "NOPE-1")).toEqual({ oe: "NOPE1", fits: 0, notFits: 0, vehicles: [] });
    // A VIN pasted as an OE is not echoed back.
    expect(await fitmentSummaryForOe(db, FIXTURE_VINS.bydSongPlus)).toEqual({ oe: null, fits: 0, notFits: 0, vehicles: [] });
  });
});

describe("fitmentsForVin", () => {
  it("returns only that car's rows, newest first", async () => {
    const db = await testDb();
    const first = await recordFitment(db, { ...SONG, oe: "AAA-1", source: "sourcer", result: "fits" });
    await new Promise((r) => setTimeout(r, 5));
    const second = await recordFitment(db, { ...SONG, oe: "BBB-2", source: "install_feedback", result: "not_fits" });
    await recordFitment(db, { ...GALAXY, oe: "AAA-1", source: "sourcer", result: "fits" });
    await recordFitment(db, { oe: "AAA-1", source: "catalog", result: "fits" });

    const rows = await fitmentsForVin(db, ` ${SONG.vin.toLowerCase()}`);
    expect(rows.map((r) => r.id)).toEqual([second.id, first.id]);
    expect(rows.every((r) => r.vin === SONG.vin)).toBe(true);
    expect(await fitmentsForVin(db, SONG.vin, 1)).toHaveLength(1);
    expect(await fitmentsForVin(db, FIXTURE_VINS.liAutoL6)).toEqual([]);
    expect(await fitmentsForVin(db, "")).toEqual([]);
    expect(await fitmentsForVin(db, "not a vin")).toEqual([]);
  });
});
