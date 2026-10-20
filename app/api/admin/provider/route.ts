import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { json, route } from "@/lib/server/http";
import { providerStatus } from "@/lib/services/admin";

// Mode, today's paid calls against the daily limit and the call journal. Never the 17VIN credentials.
export const GET = route(async () => {
  const actor = await requireActor();
  return json(await providerStatus(await getDb(), actor));
});
