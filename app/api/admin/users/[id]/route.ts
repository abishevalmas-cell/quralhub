import { z } from "zod";
import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, readJson, route } from "@/lib/server/http";
import { ROLE_MESSAGE, setUserRole } from "@/lib/services/admin";

type Ctx = { params: Promise<{ id: string }> };

// The role itself is checked by the service after the admin check, so a non-admin always gets 403.
const Body = z.object({ role: z.string({ required_error: ROLE_MESSAGE, invalid_type_error: ROLE_MESSAGE }).max(32, ROLE_MESSAGE) });

export const PATCH = route(async (request, { params }: Ctx) => {
  const actor = await requireActor();
  const { id } = await params;
  const { role } = await readJson(request, Body);
  return json({ user: await setUserRole(await getDb(), actor, id, role) });
});
