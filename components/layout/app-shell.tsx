import Link from "next/link";
import type { ReactNode } from "react";
import { getActor } from "@/lib/auth/current";
import { isAdmin, isStaff } from "@/lib/auth/session";
import { NavLinks, type NavItem } from "./nav-links";

export async function AppShell({ children }: { children: ReactNode }) {
  const actor = await getActor();
  const items: NavItem[] = actor
    ? [
        { href: "/", label: "Поиск", icon: "search" },
        { href: "/garage", label: "Гараж", icon: "car" },
        { href: "/requests", label: "Заявки", icon: "chat" },
        { href: "/orders", label: "Заказы", icon: "box" },
        ...(isStaff(actor) ? [{ href: "/sourcer", label: "Подбор 采购", icon: "queue" as const }] : []),
        ...(isAdmin(actor) ? [{ href: "/admin", label: "Управление", icon: "settings" as const }] : []),
      ]
    : [];
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-[max(16px,env(safe-area-inset-left))]">
          <Link href="/" className="text-[26px] font-extrabold tracking-[-0.06em]" aria-label="Tetix, главная">
            tetix<span className="ml-0.5 inline-block size-2 rounded-full bg-lime align-[2px] ring-1 ring-line" />
          </Link>
          <nav className="hidden flex-1 md:block" aria-label="Разделы">
            <NavLinks items={items} variant="top" />
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {actor ? (
              <Link href="/profile" className="rounded-full bg-soft px-3 py-1.5 text-sm font-semibold">
                {actor.name || "Профиль"}
              </Link>
            ) : (
              <Link href="/login" className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-paper">
                Войти
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-[max(16px,env(safe-area-inset-left))] pb-28 pt-6 md:pb-16">{children}</main>
      {items.length ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
          aria-label="Разделы"
        >
          <NavLinks items={items.slice(0, 5)} variant="bottom" />
        </nav>
      ) : null}
    </div>
  );
}
