import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import { FIXTURE_VINS, FixtureProvider } from "@/lib/providers/fixture";
import { addVehicleByVin, getVehicle } from "@/lib/services/vehicles";
import { makeUser, testDb } from "@/tests/helpers/db";

// The actions read the actor from the session cookie and the database from getDb(); both are swapped here.
const state = vi.hoisted(() => ({ db: null as Db | null, actor: null as Actor | null }));
vi.mock("@/lib/auth/current", async () => {
  const { unauthorized } = await import("@/lib/server/errors");
  return {
    getActor: async () => state.actor,
    requireActor: async () => {
      if (!state.actor) throw unauthorized();
      return state.actor;
    },
  };
});
vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  getDb: async () => state.db,
}));

const { addCatalogVehicle, changeVehicleColor, changeVehicleModel } = await import("../actions");

async function setup() {
  const db = await testDb();
  state.db = db;
  const owner = await makeUser(db);
  const stranger = await makeUser(db);
  return { db, owner, stranger };
}

describe("garage actions", () => {
  it("adds a catalog car and changes its paint and model for the owner", async () => {
    const { db, owner } = await setup();
    state.actor = owner;
    const added = await addCatalogVehicle({ modelId: "tank-300", year: 2024, color: "tank-green", label: "Дача" });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(await getVehicle(db, owner, added.value.id)).toMatchObject({ brand: "Tank", model: "300", modelId: "tank-300", color: "tank-green" });
    expect(await changeVehicleColor(added.value.id, "black")).toEqual({ ok: true, value: { color: "black" } });
    expect(await changeVehicleModel(added.value.id, "tank-500")).toEqual({ ok: true, value: { modelId: "tank-500" } });
  });

  it("answers bad input with a Russian message, not an exception", async () => {
    const { owner } = await setup();
    state.actor = owner;
    expect(await addCatalogVehicle({ modelId: "nope", year: 2024 })).toMatchObject({ ok: false, code: "unknown_model" });
    expect(await addCatalogVehicle({ modelId: "zeekr-x", year: "2024" as unknown as number })).toEqual({ ok: false, error: "Проверьте заполнение формы" });
    const { vehicle } = await addVehicleByVin(state.db!, owner, { vin: FIXTURE_VINS.zeekr001 }, { provider: new FixtureProvider() });
    expect(await changeVehicleColor(vehicle.id, "pink")).toMatchObject({ ok: false, code: "unknown_color", error: "Выберите цвет из списка" });
  });

  it("refuses without a session and hides other owners' cars", async () => {
    const { db, owner, stranger } = await setup();
    const { vehicle } = await addVehicleByVin(db, owner, { vin: FIXTURE_VINS.bydSongPlus }, { provider: new FixtureProvider() });
    state.actor = null;
    expect(await changeVehicleColor(vehicle.id, "red")).toMatchObject({ ok: false, code: "unauthorized" });
    expect(await addCatalogVehicle({ modelId: "zeekr-x", year: 2024 })).toMatchObject({ ok: false, code: "unauthorized" });
    state.actor = stranger;
    expect(await changeVehicleColor(vehicle.id, "red")).toMatchObject({ ok: false, code: "not_found" });
    expect(await changeVehicleModel(vehicle.id, "byd-han")).toMatchObject({ ok: false, code: "not_found" });
    expect(await getVehicle(db, owner, vehicle.id)).toMatchObject({ color: null, modelId: "byd-song-plus-dmi" });
  });
});
