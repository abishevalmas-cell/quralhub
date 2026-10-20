import type { ReactNode } from "react";
import { getActor } from "@/lib/auth/current";
import { formatPhone } from "@/lib/auth/phone";
import { getDb } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import { isDemoDeployment } from "@/lib/server/demo";
import { homeData, type HomeVehicle } from "@/lib/services/search";
import { demoNote } from "./nav";
import { shellSummary } from "./shell-data";
import { ShellView } from "./shell-view";

const NO_COUNTS = { openRequests: 0, activeOrders: 0, queueNew: null };

export async function AppShell({ children }: { children: ReactNode }) {
  const actor = await getActor();
  const note = demoNote({ demo: isDemoDeployment(), fixture: getProvider().mode === "fixture" });
  if (!actor)
    return (
      <ShellView user={null} counts={NO_COUNTS} note={note} vehicles={[]}>
        {children}
      </ShellView>
    );
  const db = await getDb();
  const [summary, vehicles] = await Promise.all([
    shellSummary(db, actor),
    // The garage for the assistant's search box. Without it the assistant still searches, so a failure here
    // must not take every page down with it.
    homeData(db, actor).then(
      (data): HomeVehicle[] => data.vehicles,
      (): HomeVehicle[] => [],
    ),
  ]);
  const user = { name: actor.name, phone: formatPhone(actor.phone), city: summary.city, role: actor.role };
  return (
    <ShellView user={user} counts={summary} note={note} vehicles={vehicles}>
      {children}
    </ShellView>
  );
}
