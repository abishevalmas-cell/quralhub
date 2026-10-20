import { z } from "zod";
import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { badRequest } from "@/lib/server/errors";
import { json, readJson, route } from "@/lib/server/http";
import { addManualVehicle, addVehicleByVin, listVehicles } from "@/lib/services/vehicles";

const text = (max: number, message: string) => z.string({ invalid_type_error: "Проверьте заполнение формы" }).max(max, message);

// One body for both ways of adding a car: {vin, label} or {manual: {brand, model, year, trim}, label}.
const Body = z.object({
  vin: text(200, "VIN слишком длинный").optional(),
  label: text(200, "Название слишком длинное").nullable().optional(),
  manual: z
    .object({
      brand: text(200, "Марка слишком длинная"),
      model: text(200, "Модель слишком длинная"),
      year: z
        .number({ invalid_type_error: "Укажите год выпуска", required_error: "Укажите год выпуска" })
        .int("Укажите год выпуска"),
      trim: text(400, "Комплектация слишком длинная").nullable().optional(),
    })
    .optional(),
});

export const GET = route(async () => {
  const actor = await requireActor();
  return json({ vehicles: await listVehicles(await getDb(), actor) });
});

export const POST = route(async (request) => {
  const actor = await requireActor();
  const body = await readJson(request, Body);
  const db = await getDb();
  if (body.manual) {
    const vehicle = await addManualVehicle(db, actor, { ...body.manual, label: body.label });
    return json({ vehicle, message: "Машина добавлена без VIN", source: null }, 201);
  }
  if (body.vin === undefined) throw badRequest("Введите VIN или укажите марку и модель");
  return json(await addVehicleByVin(db, actor, { vin: body.vin, label: body.label }), 201);
});
