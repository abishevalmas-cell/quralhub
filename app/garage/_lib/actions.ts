"use server";

import { z } from "zod";
import { requireActor } from "@/lib/auth/current";
import type { Actor } from "@/lib/auth/session";
import { getDb, type Db } from "@/lib/db";
import { AppError } from "@/lib/server/errors";
import { addManualVehicle, setVehicleColor, setVehicleModel } from "@/lib/services/vehicles";

// Garage writes that the vehicle API routes do not cover yet: a car picked from the catalog, its paint and its
// catalog model. Each action checks the session; the services check that the car is the actor's own.
// Next.js rejects server action calls from other origins.

export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: string; code?: string };

const FAILED = "Сервис временно недоступен. Попробуйте ещё раз";
const INVALID = "Проверьте заполнение формы";

async function run<T>(work: (db: Db, actor: Actor) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const actor = await requireActor();
    return { ok: true, value: await work(await getDb(), actor) };
  } catch (error) {
    if (error instanceof AppError) return { ok: false, error: error.message, code: error.code };
    // Database errors carry bound values in their message; only the class is logged.
    console.error("garage action failed:", error instanceof Error ? error.name : typeof error);
    return { ok: false, error: FAILED };
  }
}

const id = z.string().max(100);
const nullableText = (max: number) => z.string().max(max).nullable().optional();

const CatalogCar = z.object({
  modelId: z.string().max(100),
  year: z.number().int(),
  color: nullableText(40),
  label: nullableText(200),
});

export async function addCatalogVehicle(input: z.input<typeof CatalogCar>): Promise<ActionResult<{ id: string }>> {
  const parsed = CatalogCar.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID };
  return run(async (db, actor) => {
    const vehicle = await addManualVehicle(db, actor, parsed.data);
    return { id: vehicle.id };
  });
}

export async function changeVehicleColor(vehicleId: string, color: string | null): Promise<ActionResult<{ color: string | null }>> {
  const parsed = z.object({ vehicleId: id, color: z.string().max(40).nullable() }).safeParse({ vehicleId, color });
  if (!parsed.success) return { ok: false, error: INVALID };
  return run(async (db, actor) => ({ color: (await setVehicleColor(db, actor, parsed.data.vehicleId, parsed.data.color)).color }));
}

export async function changeVehicleModel(vehicleId: string, modelId: string | null): Promise<ActionResult<{ modelId: string | null }>> {
  const parsed = z.object({ vehicleId: id, modelId: z.string().max(100).nullable() }).safeParse({ vehicleId, modelId });
  if (!parsed.success) return { ok: false, error: INVALID };
  return run(async (db, actor) => ({ modelId: (await setVehicleModel(db, actor, parsed.data.vehicleId, parsed.data.modelId)).modelId }));
}
