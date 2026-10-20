import Link from "next/link";
import type { ReactNode } from "react";
import { getActor } from "@/lib/auth/current";
import { isAdmin, isStaff } from "@/lib/auth/session";
import { NavLinks, type NavItem } from "./nav-links";

export async function AppShell({ children }: { children: ReactNode }) {
  const actor = await getActor();
  const search: NavItem = { href: "/", label: "Поиск", icon: "search" };
  const garage: NavItem = { href: "/garage", label: "Гараж", icon: "car" };
  const staff = actor ? isStaff(actor) : false;
  // Staff have their own requests and orders too; "Мои" keeps them apart from the work queue and customers' orders.
  const requests: NavItem = { href: "/requests", label: staff ? "Мои заявки" : "Заявки", icon: "chat" };
  const orders: NavItem = { href: "/orders", label: staff ? "Мои заказы" : "Заказы", icon: "box" };
  const queue: NavItem = { href: "/sourcer", label: "Подбор 采购", icon: "queue" };
  const staffOrders: NavItem = { href: "/sourcer/orders", label: "Заказы клиентов 订单", short: "Заказы 订单", icon: "box" };
  const admin: NavItem = { href: "/admin", label: "Управление", icon: "settings" };
  const items: NavItem[] = actor
    ? [search, garage, requests, orders, ...(staff ? [queue, staffOrders] : []), ...(isAdmin(actor) ? [admin] : [])]
    : [];
  // The bottom bar (phones and tablets) fits five items. Staff get their work sections first; their own garage and
  // orders stay on the home page.
  const mobileItems: NavItem[] = !actor
    ? []
    : staff
      ? [search, queue, staffOrders, requests, isAdmin(actor) ? admin : garage]
      : [search, garage, requests, orders];
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-[max(16px,env(safe-area-inset-left))]">
          <Link href="/" className="text-[26px] font-extrabold tracking-[-0.06em]" aria-label="Tetix, главная">
            tetix<span className="ml-0.5 inline-block size-2 rounded-full bg-lime align-[2px] ring-1 ring-line" />
          </Link>
          <nav className="hidden min-w-0 flex-1 overflow-x-auto lg:block" aria-label="Разделы">
            <NavLinks items={items} variant="top" />
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
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
      <main className="mx-auto max-w-6xl px-[max(16px,env(safe-area-inset-left))] pb-28 pt-6 lg:pb-16">{children}</main>
      {mobileItems.length ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
          aria-label="Разделы"
        >
          <NavLinks items={mobileItems} variant="bottom" />
        </nav>
      ) : null}
    </div>
  );
}
