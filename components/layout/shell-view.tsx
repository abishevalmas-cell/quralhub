import type { ReactNode } from "react";
import { Assistant } from "@/components/assistant/assistant";
import type { HomeVehicle } from "@/lib/services/search";
import { Header } from "./header";
import { bottomItems, navSections, type ShellCounts } from "./nav";
import { BottomNav } from "./nav-links";
import { Sidebar, type ShellUser } from "./sidebar";

// The whole page frame without data access: fixed sidebar (desktop), sticky header, content, bottom bar (phones)
// and the assistant button. AppShell feeds it; previews and tests can render it with plain props.
export function ShellView({
  user,
  counts,
  note,
  vehicles,
  children,
}: {
  user: ShellUser | null;
  counts: ShellCounts;
  note: string | null;
  vehicles: HomeVehicle[];
  children: ReactNode;
}) {
  const role = user?.role ?? null;
  return (
    <div className="min-h-dvh lg:pl-[236px]">
      <a
        href="#main"
        className="sr-only rounded-xl bg-strong px-4 py-2 font-semibold text-on-strong focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        К содержимому
      </a>
      <Sidebar sections={navSections(role, counts)} user={user} note={note} />
      <Header user={user} counts={counts} hasGarage={vehicles.length > 0} />
      <main
        id="main"
        className="mx-auto w-full max-w-[1400px] px-[max(16px,env(safe-area-inset-left))] pb-[calc(9rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6 lg:px-12 lg:pb-28 lg:pt-9"
      >
        {children}
      </main>
      <nav
        aria-label="Разделы"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card px-1.5 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-6px_20px_rgb(10_20_28/0.05)] lg:hidden"
      >
        <BottomNav items={bottomItems(role)} />
      </nav>
      <Assistant signedIn={Boolean(user)} vehicles={vehicles} />
    </div>
  );
}
