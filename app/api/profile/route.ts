import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { json, readJson, route } from "@/lib/server/http";

// Control characters (a NUL from a pasted value) are dropped: Postgres refuses them in text columns.
const line = (max: number, message: string) =>
  z
    .string()
    .max(max * 2, message)
    .transform((s) => s.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max, message))
    .optional();

const Body = z.object({
  name: line(80, "Имя — не длиннее 80 символов"),
  company: line(120, "Название СТО — не длиннее 120 символов"),
  city: line(80, "Город — не длиннее 80 символов"),
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
