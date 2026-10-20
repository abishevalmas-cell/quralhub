import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Actor } from "@/lib/auth/session";
import { CAR_COLOR_IDS, findBrand, findModel, getBrand, getModel, modelTitle, modelYears, type CarColorId, type CarModel } from "@/lib/catalog";
import type { Db } from "@/lib/db";
import { vehicles, type DecodeStatus, type VehicleCandidate } from "@/lib/db/schema";
import { getProvider, type DecodeResult, type PartsProvider, type ProviderSource } from "@/lib/providers";
import { badRequest } from "@/lib/server/errors";
import { modelYear, validateVin, wmiInfo } from "@/lib/vin";
import { loadVehicleForOwner } from "./access";
import { budgetedGateway } from "./catalog";

export type Vehicle = typeof vehicles.$inferSelect;
export type VehicleDeps = { provider?: PartsProvider; now?: Date };
export type AddVehicleResult = { vehicle: Vehicle; message: string; source: ProviderSource };

export const LABEL_MAX = 60;
const BRAND_MAX = 60;
const MODEL_MAX = 80;
const TRIM_MAX = 160;
export const MIN_YEAR = 1980;
export const maxYear = (now: Date = new Date()) => now.getUTCFullYear() + 1;

// Error codes carry the suggested VINs after a colon, so the form can offer them as one-tap fixes.
export const INVALID_VIN = "invalid_vin";

function cleanText(value: unknown, max: number, tooLong: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw badRequest("Проверьте заполнение формы");
  const clean = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length > max) throw badRequest(tooLong);
  return clean || null;
}

const cleanLabel = (label: unknown) => cleanText(label, LABEL_MAX, `Название — не длиннее ${LABEL_MAX} символов`);

const COLOR_IDS: readonly string[] = CAR_COLOR_IDS;

// A paint of components/car CAR_COLORS, or null for "not chosen": the picture then uses the model's usual color.
function cleanColor(value: unknown): CarColorId | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !COLOR_IDS.includes(value)) throw badRequest("Выберите цвет из списка", "unknown_color");
  return value as CarColorId;
}

/** The stored paint, if it is still one of CAR_COLORS. */
export const vehicleColor = (vehicle: Pick<Vehicle, "color">): CarColorId | null =>
  vehicle.color && COLOR_IDS.includes(vehicle.color) ? (vehicle.color as CarColorId) : null;

function catalogModel(modelId: unknown): CarModel {
  const model = typeof modelId === "string" ? getModel(modelId) : null;
  if (!model) throw badRequest("Такой модели нет в списке", "unknown_model");
  return model;
}

// The catalog model behind a car: the stored one, else a match by the decoded or typed name (rows added before
// model_id existed). Picks the illustration and the assortment only; it never says that a part fits.
export function vehicleCatalogModel(vehicle: Pick<Vehicle, "modelId" | "brand" | "model" | "year">): CarModel | null {
  return getModel(vehicle.modelId) ?? findModel(vehicle.brand, vehicle.model, vehicle.year);
}

/**
 * Catalog status of the car's brand, or null for an unknown brand. For a car with a VIN the decoded brand decides
 * (with the decoded model text, so "Changan" + "Deepal S07" is a Deepal): the model the owner picked changes the
 * picture, never which catalog the VIN opens. Without a VIN, or when the decoded brand is unknown, the model's
 * brand counts, then the typed brand.
 */
export function vehicleBrandStatus(vehicle: Pick<Vehicle, "modelId" | "brand" | "model" | "year"> & { vin?: string | null }) {
  const decoded = vehicle.vin ? findBrand(`${vehicle.brand ?? ""} ${vehicle.model ?? ""}`) ?? findBrand(vehicle.brand) : null;
  if (decoded) return decoded.catalogStatus;
  const model = vehicleCatalogModel(vehicle);
  return (model ? getBrand(model.brandId) : findBrand(vehicle.brand))?.catalogStatus ?? null;
}

export async function listVehicles(db: Db, actor: Actor): Promise<Vehicle[]> {
  return db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.ownerId, actor.id), isNull(vehicles.archivedAt)))
    .orderBy(desc(vehicles.createdAt), desc(vehicles.id));
}

export async function getVehicle(db: Db, actor: Actor, vehicleId: string): Promise<Vehicle> {
  return loadVehicleForOwner(db, actor, vehicleId);
}

// What the VIN itself says before any catalog: the maker from the WMI and the model year from position 10.
function vinHints(vin: string | null, now: Date): { brand: string | null; year: number | null } {
  if (!vin) return { brand: null, year: null };
  const info = wmiInfo(vin);
  return { brand: info.brands.length === 1 ? info.brands[0] : info.maker, year: modelYear(vin, now) };
}

function yearOf(value: string | null | undefined): number | null {
  const year = Number(value);
  return /^\d{4}$/.test(String(value ?? "").trim()) && year >= MIN_YEAR - 30 && year <= 2100 ? year : null;
}

const trimOf = (c: VehicleCandidate) => (c.version || c.description || "").slice(0, TRIM_MAX) || null;

// Brand, model, year and trim from the candidates. With several trims and no choice by the owner, a field is
// filled only when every candidate agrees on it, and the trim stays empty: the first candidate is never taken.
function describeCar(candidates: VehicleCandidate[], selectedId: string | null, hints: { brand: string | null; year: number | null }) {
  const chosen = candidates.length === 1 ? candidates[0] : (candidates.find((c) => c.id === selectedId) ?? null);
  if (chosen) {
    return {
      brand: chosen.brand || hints.brand,
      model: chosen.model || null,
      year: yearOf(chosen.year) ?? hints.year,
      trim: trimOf(chosen),
    };
  }
  const shared = (pick: (c: VehicleCandidate) => string) => {
    const values = new Set(candidates.map((c) => pick(c).trim()));
    return values.size === 1 ? [...values][0] || null : null;
  };
  const anyBrand = candidates.some((c) => c.brand.trim());
  return {
    brand: shared((c) => c.brand) ?? (anyBrand ? null : hints.brand),
    model: shared((c) => c.model),
    year: yearOf(shared((c) => c.year)) ?? hints.year,
    trim: null,
  };
}

// The catalog model of a decoded car: of the chosen trim, or the one every candidate maps to. A model the owner named
// is never overwritten; names that disagree or match nothing leave the model as it was.
function decodedModelId(
  candidates: VehicleCandidate[],
  selectedId: string | null,
  hints: { brand: string | null; year: number | null },
  row: Pick<Vehicle, "modelId" | "modelByOwner">,
): string | null {
  const current = row.modelId;
  if (row.modelByOwner && current) return current;
  const chosen = candidates.length === 1 ? candidates[0] : (candidates.find((c) => c.id === selectedId) ?? null);
  const pool = chosen ? [chosen] : candidates;
  const ids = new Set(pool.map((c) => findModel(c.brand || hints.brand, c.model, c.year)?.id ?? null));
  const [only] = [...ids];
  return ids.size === 1 && only ? only : current;
}

// Maps a decode answer onto the row. Returns null when the row must stay as it is.
function decodePatch(row: Vehicle, result: DecodeResult, now: Date): Partial<typeof vehicles.$inferInsert> | null {
  const hints = vinHints(row.vin, now);
  const found = result.status === "success" ? result.candidates : [];
  const provided = {
    epc: result.epc ?? null,
    epcId: result.epcId ?? null,
    buildDate: result.buildDate ?? null,
  };
  if (found.length) {
    const ambiguous = found.length > 1;
    // A trim the owner chose earlier survives a repeated decode while it is still on the list.
    const selected = ambiguous && row.selectedCandidateId && found.some((c) => c.id === row.selectedCandidateId) ? row.selectedCandidateId : null;
    return {
      decodeStatus: ambiguous ? "ambiguous" : "decoded",
      ...describeCar(found, selected, hints),
      modelId: decodedModelId(found, selected, hints, row),
      ...provided,
      candidates: found,
      selectedCandidateId: selected,
    };
  }
  if (result.status === "success" || result.status === "empty" || result.status === "unsupported") {
    return {
      decodeStatus: "unsupported",
      brand: hints.brand,
      model: null,
      year: hints.year,
      trim: null,
      ...provided,
      candidates: [],
      selectedCandidateId: null,
    };
  }
  // Timeouts, limits and account errors say nothing about the car, so an earlier decode is kept.
  if (row.decodeStatus !== "pending" && row.decodeStatus !== "error") return null;
  return { decodeStatus: "error", brand: row.brand ?? hints.brand, year: row.year ?? hints.year };
}

const DECODE_BUDGET_MESSAGE = "Сегодня вы уже много раз расшифровывали VIN. Попробуйте завтра или оставьте заявку на ручной подбор";

// A VIN decoded in the last 90 days comes from the cache for free; only a paid call counts against the daily budget.
function decodeVin(db: Db, actor: Actor, vin: string, provider: PartsProvider, now: Date): Promise<DecodeResult> {
  return budgetedGateway(db, actor, provider, now, DECODE_BUDGET_MESSAGE).decodeVin(vin);
}

async function applyDecode(db: Db, row: Vehicle, result: DecodeResult, now: Date): Promise<AddVehicleResult> {
  const patch = decodePatch(row, result, now);
  if (!patch) return { vehicle: row, message: result.message, source: result.source };
  const [vehicle] = await db
    .update(vehicles)
    .set({ ...patch, updatedAt: now })
    .where(eq(vehicles.id, row.id))
    .returning();
  return { vehicle, message: result.message, source: result.source };
}

export function vinErrorCode(suggestions: string[]): string {
  return suggestions.length ? `${INVALID_VIN}:${suggestions.slice(0, 3).join(",")}` : INVALID_VIN;
}

export async function addVehicleByVin(
  db: Db,
  actor: Actor,
  input: { vin: string; label?: string | null },
  deps: VehicleDeps = {},
): Promise<AddVehicleResult> {
  if (typeof input.vin !== "string" || input.vin.length > 200) throw badRequest("Введите VIN: 17 символов из техпаспорта", INVALID_VIN);
  const check = validateVin(input.vin);
  if (!check.ok) {
    const first = check.errors[0];
    const hint = check.suggestions.length ? `. Возможно, VIN такой: ${check.suggestions[0]}` : "";
    throw badRequest(first.message + hint, vinErrorCode(check.suggestions));
  }
  const label = cleanLabel(input.label);
  const provider = deps.provider ?? getProvider();
  const now = deps.now ?? new Date();
  // Decoded before the row is written: a refused paid call (over the daily budget) leaves the garage as it was.
  const result = await decodeVin(db, actor, check.vin, provider, now);
  // One row per owner and VIN: adding the same VIN again brings an archived car back instead of a duplicate.
  // A car that comes back from the archive moves to the top of the garage.
  const [row] = await db
    .insert(vehicles)
    .values({ ownerId: actor.id, vin: check.vin, label, decodeStatus: "pending", createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [vehicles.ownerId, vehicles.vin],
      set: {
        archivedAt: null,
        updatedAt: now,
        createdAt: sql`case when ${vehicles.archivedAt} is null then ${vehicles.createdAt} else ${now.toISOString()}::timestamptz end`,
        ...(label ? { label } : {}),
      },
    })
    .returning();
  return applyDecode(db, row, result, now);
}

export type ManualVehicleInput = {
  /** A model of lib/catalog: brand and model are taken from it. Without it, brand and model are free text. */
  modelId?: string | null;
  brand?: string | null;
  model?: string | null;
  year: number;
  trim?: string | null;
  color?: string | null;
  label?: string | null;
};

// The catalog years are the first ones we are sure of, and a car sold early can carry the next model year:
// one year either side is accepted.
function checkModelYear(model: CarModel, year: number) {
  if (year < model.yearFrom - 1 || (model.yearTo !== null && year > model.yearTo + 1))
    throw badRequest(`${modelTitle(model)} выпускается ${modelYears(model)}. Проверьте год выпуска`, "year_out_of_range");
}

export async function addManualVehicle(db: Db, actor: Actor, input: ManualVehicleInput, deps: { now?: Date } = {}): Promise<Vehicle> {
  const now = deps.now ?? new Date();
  const picked = input.modelId !== undefined && input.modelId !== null ? catalogModel(input.modelId) : null;
  const brand = picked ? picked.brand : cleanText(input.brand, BRAND_MAX, `Марка — не длиннее ${BRAND_MAX} символов`);
  const model = picked ? picked.model : cleanText(input.model, MODEL_MAX, `Модель — не длиннее ${MODEL_MAX} символов`);
  const trim = cleanText(input.trim, TRIM_MAX, `Комплектация — не длиннее ${TRIM_MAX} символов`);
  const label = cleanLabel(input.label);
  const color = cleanColor(input.color);
  if (!brand) throw badRequest("Укажите марку");
  if (!model) throw badRequest("Укажите модель");
  const top = maxYear(now);
  if (!Number.isInteger(input.year) || input.year < MIN_YEAR || input.year > top)
    throw badRequest(`Укажите год выпуска от ${MIN_YEAR} до ${top}`);
  if (picked) checkModelYear(picked, input.year);
  const [vehicle] = await db
    .insert(vehicles)
    .values({
      ownerId: actor.id,
      vin: null,
      label,
      brand,
      model,
      year: input.year,
      trim,
      modelId: picked?.id ?? findModel(brand, model, input.year)?.id ?? null,
      modelByOwner: Boolean(picked),
      color,
      decodeStatus: "manual",
      candidates: [],
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return vehicle;
}

const REDECODABLE: DecodeStatus[] = ["error", "pending"];

export async function redecode(db: Db, actor: Actor, vehicleId: string, deps: VehicleDeps = {}): Promise<AddVehicleResult> {
  const row = await loadVehicleForOwner(db, actor, vehicleId);
  if (!row.vin) throw badRequest("У машины нет VIN: расшифровывать нечего", "no_vin");
  if (!REDECODABLE.includes(row.decodeStatus)) throw badRequest("VIN уже расшифрован, повторять не нужно", "already_decoded");
  const provider = deps.provider ?? getProvider();
  const now = deps.now ?? new Date();
  return applyDecode(db, row, await decodeVin(db, actor, row.vin, provider, now), now);
}

// The owner confirms their trim from the candidates (or clears the choice). It is the owner's statement,
// checked against the door plate or the registration certificate, never an automatic pick.
export async function selectCandidate(
  db: Db,
  actor: Actor,
  vehicleId: string,
  candidateId: string | null,
  deps: { now?: Date } = {},
): Promise<Vehicle> {
  const row = await loadVehicleForOwner(db, actor, vehicleId);
  if (row.decodeStatus !== "ambiguous") throw badRequest("Выбирать нечего: у этой машины одна комплектация или её нет", "not_ambiguous");
  if (candidateId !== null && !row.candidates.some((c) => c.id === candidateId))
    throw badRequest("Такой комплектации нет в списке", "unknown_candidate");
  const now = deps.now ?? new Date();
  const hints = vinHints(row.vin, now);
  const [vehicle] = await db
    .update(vehicles)
    .set({
      selectedCandidateId: candidateId,
      ...describeCar(row.candidates, candidateId, hints),
      modelId: decodedModelId(row.candidates, candidateId, hints, row),
      updatedAt: now,
    })
    .where(eq(vehicles.id, row.id))
    .returning();
  return vehicle;
}

export async function renameVehicle(db: Db, actor: Actor, vehicleId: string, label: string | null): Promise<Vehicle> {
  const row = await loadVehicleForOwner(db, actor, vehicleId);
  const [vehicle] = await db
    .update(vehicles)
    .set({ label: cleanLabel(label), updatedAt: new Date() })
    .where(eq(vehicles.id, row.id))
    .returning();
  return vehicle;
}

// The paint of the car's picture. Purely cosmetic, so it is the owner's choice at any time; null goes back to the
// model's usual color.
export async function setVehicleColor(
  db: Db,
  actor: Actor,
  vehicleId: string,
  color: string | null,
  deps: { now?: Date } = {},
): Promise<Vehicle> {
  const row = await loadVehicleForOwner(db, actor, vehicleId);
  const [vehicle] = await db
    .update(vehicles)
    .set({ color: cleanColor(color), updatedAt: deps.now ?? new Date() })
    .where(eq(vehicles.id, row.id))
    .returning();
  return vehicle;
}

// The owner names the catalog model when the decoded or typed name matched none (or the wrong one). It changes the
// picture and the assortment shown, never a fitment. A car without VIN takes brand and model from the catalog too;
// a decoded car keeps what its VIN says.
export async function setVehicleModel(
  db: Db,
  actor: Actor,
  vehicleId: string,
  modelId: string | null,
  deps: { now?: Date } = {},
): Promise<Vehicle> {
  const row = await loadVehicleForOwner(db, actor, vehicleId);
  const model = modelId === null ? null : catalogModel(modelId);
  const names = model && row.decodeStatus === "manual" ? { brand: model.brand, model: model.model } : {};
  const [vehicle] = await db
    .update(vehicles)
    .set({ modelId: model?.id ?? null, modelByOwner: model !== null, ...names, updatedAt: deps.now ?? new Date() })
    .where(eq(vehicles.id, row.id))
    .returning();
  return vehicle;
}

// Archived, not deleted: requests and orders keep pointing at the car, and adding the VIN again restores it.
export async function archiveVehicle(db: Db, actor: Actor, vehicleId: string, deps: { now?: Date } = {}): Promise<void> {
  const row = await loadVehicleForOwner(db, actor, vehicleId);
  const now = deps.now ?? new Date();
  await db.update(vehicles).set({ archivedAt: now, updatedAt: now }).where(eq(vehicles.id, row.id));
}
