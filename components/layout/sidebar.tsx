import Link from "next/link";
import { AssistantSidebarButton } from "@/components/assistant/assistant";
import { Icon } from "@/components/ui/icon";
import type { UserRole } from "@/lib/db/schema";
import { initials, type NavSection } from "./nav";
import { SideNav } from "./nav-links";
import { Wordmark } from "./wordmark";

// What the shell shows about the signed-in person. `phone` is already formatted for display.
export type ShellUser = { name: string | null; phone: string; city: string | null; role: UserRole };

function Avatar({ name }: { name: string | null }) {
  const letters = initials(name);
  return (
    <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-soft text-xs font-bold text-ink">
      {letters ?? <Icon name="user" className="size-[18px]" />}
    </span>
  );
}

function Profile({ user }: { user: ShellUser }) {
  return (
    <Link
      href="/profile"
      className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 text-[13px] transition hover:bg-soft"
    >
      <Avatar name={user.name} />
      <span className="grid min-w-0">
        <span className="truncate font-semibold">{user.name || user.phone}</span>
        <span className="truncate text-[11px] text-muted">{user.city ?? "Город не указан"}</span>
      </span>
      <span className="sr-only">. Открыть профиль</span>
    </Link>
  );
}

function SignIn() {
  return (
    <Link href="/login" className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 text-[13px] transition hover:bg-soft">
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-soft">
        <Icon name="car" className="size-[18px]" />
      </span>
      <span className="grid min-w-0">
        <span className="font-semibold">Войти</span>
        <span className="text-[11px] text-muted">Покупатель или мастер</span>
      </span>
    </Link>
  );
}

// Fixed white column on desktop (lg and up): wordmark, sections, the demo note and the profile at the bottom.
export function Sidebar({ sections, user, note }: { sections: NavSection[]; user: ShellUser | null; note: string | null }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[236px] flex-col overflow-y-auto border-r border-line bg-card px-[22px] pb-6 pt-8 lg:flex">
      <Wordmark className="self-start" />
      <nav aria-label="Разделы" className="mt-[54px]">
        <SideNav sections={sections} />
      </nav>
      <div className="mt-auto grid gap-5 pt-8">
        <AssistantSidebarButton />
        {note ? (
          <div className="grid gap-2">
            <span className="w-fit rounded bg-soft px-2 py-1 text-[11px] font-semibold tracking-[0.1em] text-muted">ДЕМО</span>
            <p className="text-xs leading-relaxed text-muted">{note}</p>
          </div>
        ) : null}
        <div className="border-t border-line pt-4">{user ? <Profile user={user} /> : <SignIn />}</div>
      </div>
    </aside>
  );
}
