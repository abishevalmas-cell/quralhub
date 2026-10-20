import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, route } from "@/lib/server/http";
import { listUsers } from "@/lib/services/admin";

// GET /api/admin/users?q=&role= — role is one of the user roles or "staff" (sourcers and admins).
export const GET = route(async (request) => {
  const actor = await requireActor();
  const params = new URL(request.url).searchParams;
  return json(await listUsers(await getDb(), actor, { q: params.get("q"), role: params.get("role") }));
});
