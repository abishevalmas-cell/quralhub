import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { json, readJson, route } from "@/lib/server/http";

const Body = z.object({
  name: z.string().trim().max(80).optional(),
  company: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  // A customer can switch to the workshop mode and back; staff roles are granted only by an admin.
  mode: z.enum(["customer", "master"]).optional(),
});

export const PUT = route(async (request) => {
  const actor = await requireActor();
  const body = await readJson(request, Body);
  const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (body.name !== undefined) patch.name = body.name || null;
  if (body.company !== undefined) patch.company = body.company || null;
  if (body.city !== undefined) patch.city = body.city || null;
  if (body.mode && (actor.role === "customer" || actor.role === "master")) patch.role = body.mode;
  await (await getDb()).update(users).set(patch).where(eq(users.id, actor.id));
  return json({ ok: true });
});
