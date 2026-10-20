import { z } from "zod";
import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { badRequest } from "@/lib/server/errors";
import { json, readJson, route } from "@/lib/server/http";
import { catalogAvailability } from "@/lib/services/catalog";
import { archiveVehicle, getVehicle, renameVehicle, selectCandidate } from "@/lib/services/vehicles";

type Context = { params: Promise<{ id: string }> };

const Patch = z.object({
  label: z.string({ invalid_type_error: "Проверьте название" }).max(200, "Название слишком длинное").nullable().optional(),
  selectedCandidateId: z.string({ invalid_type_error: "Выберите комплектацию из списка" }).max(200).nullable().optional(),
});

export const GET = route(async (_request, { params }: Context) => {
  const actor = await requireActor();
  const { id } = await params;
  const vehicle = await getVehicle(await getDb(), actor, id);
  return json({ vehicle, availability: catalogAvailability(vehicle) });
});

export const PATCH = route(async (request, { params }: Context) => {
  const actor = await requireActor();
  const { id } = await params;
  const body = await readJson(request, Patch);
  if (body.label === undefined && body.selectedCandidateId === undefined) throw badRequest("Нечего сохранять");
  const db = await getDb();
  let vehicle = await getVehicle(db, actor, id);
  if (body.label !== undefined) vehicle = await renameVehicle(db, actor, id, body.label);
  if (body.selectedCandidateId !== undefined) vehicle = await selectCandidate(db, actor, id, body.selectedCandidateId);
  return json({ vehicle, availability: catalogAvailability(vehicle) });
});

export const DELETE = route(async (_request, { params }: Context) => {
  const actor = await requireActor();
  const { id } = await params;
  await archiveVehicle(await getDb(), actor, id);
  return json({ ok: true });
});
