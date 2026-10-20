import Link from "next/link";
import { AssistantHeaderButton } from "@/components/assistant/assistant";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { DEFAULT_CITY, isStaffRole, MODE_LABEL, type ShellCounts } from "./nav";
import { Breadcrumb } from "./nav-links";
import type { ShellUser } from "./sidebar";
import { Wordmark } from "./wordmark";

function ModePill({ user }: { user: ShellUser }) {
  const mode = MODE_LABEL[user.role];
  return (
    <Link
      href="/profile"
      aria-label={`Режим: ${mode}. Открыть профиль`}
      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-strong px-3 text-xs font-semibold text-strong-lime transition hover:opacity-90 sm:h-10 sm:px-3.5 sm:text-[13px]"
    >
      <Icon name="car" className="hidden size-[18px] sm:block" />
      {mode}
    </Link>
  );
}

// The round counter of the original header. A customer sees their own open requests; staff see the new requests
// in the queue that nobody has taken yet, which is what "Подборщик" needs to know at a glance.
function Counter({ href, label, n }: { href: string; label: string; n: number }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-2.5 transition hover:border-line-strong sm:h-10 sm:px-3"
    >
      <Icon name="clipboard" className="size-[19px]" />
      <span className="min-w-[21px] rounded-full bg-lime px-1 text-center text-xs font-extrabold leading-5 text-on-lime">{n}</span>
    </Link>
  );
}

// 88px on desktop with the breadcrumb; 64px on phones with the wordmark. Sticky, over a blurred page.
export function Header({ user, counts, hasGarage }: { user: ShellUser | null; counts: ShellCounts; hasGarage: boolean }) {
  const city = `${user?.city ?? DEFAULT_CITY} · KZT`;
  const staff = user ? isStaffRole(user.role) : false;
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/95 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:bg-card/90">
      <div className="flex h-16 items-center gap-2 px-[max(16px,env(safe-area-inset-left))] sm:gap-3 sm:px-6 lg:h-[88px] lg:gap-4 lg:px-12">
        <Wordmark size="md" className="mr-auto lg:hidden" />
        <div className="hidden min-w-0 flex-1 lg:block">
          <Breadcrumb garage={hasGarage} />
        </div>
        {user ? (
          <>
            <ModePill user={user} />
            <Link
              href="/profile"
              aria-label={`Город и валюта: ${city}. Изменить город в профиле`}
              className="hidden shrink-0 rounded-lg px-2.5 py-2 text-sm transition hover:bg-soft xl:block"
            >
              {city}
            </Link>
            {staff ? (
              <Counter href="/sourcer" label={`Новые заявки в очереди: ${counts.queueNew ?? 0}`} n={counts.queueNew ?? 0} />
            ) : (
              <Counter href="/requests" label={`Открытые заявки: ${counts.openRequests}`} n={counts.openRequests} />
            )}
            <AssistantHeaderButton />
            <Link
              href="/requests"
              aria-label="Переписка по заявкам"
              className="hidden size-10 shrink-0 place-items-center rounded-full transition hover:bg-soft sm:grid"
            >
              <Icon name="chat" />
            </Link>
          </>
        ) : (
          <>
            <span className="hidden shrink-0 px-2.5 text-sm text-muted xl:block">{city}</span>
            <AssistantHeaderButton />
            <ButtonLink href="/login" size="sm" variant="dark" className="px-4">
              Войти
            </ButtonLink>
          </>
        )}
      </div>
    </header>
  );
}
