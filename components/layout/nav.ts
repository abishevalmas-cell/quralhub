import type { IconName } from "@/components/ui/icon";
import { getModel, modelTitle } from "@/lib/catalog";
import type { UserRole } from "@/lib/db/schema";

// Pure navigation rules of the shell: which sections a role sees, what the breadcrumb says, where the
// assistant button shows. Kept free of React and the server so it is unit-tested directly.

export type NavItem = {
  href: string;
  label: string;
  // Chinese label for sourcer sections, shown next to the Russian one.
  zh?: string;
  // Shorter label for the phone bottom bar, where five items share the width.
  short?: string;
  icon: IconName;
  count?: number;
};
export type NavSection = { title: string; zh?: string; items: NavItem[] };
export type ShellCounts = { openRequests: number; activeOrders: number; queueNew?: number | null };

export const MODE_LABEL: Record<UserRole, string> = {
  customer: "Покупатель",
  master: "Мастер",
  sourcer: "Подборщик",
  admin: "Администратор",
};

export const isStaffRole = (role: UserRole | null | undefined) => role === "sourcer" || role === "admin";

const search: NavItem = { href: "/", label: "Найти деталь", short: "Поиск", icon: "search" };
const garage: NavItem = { href: "/garage", label: "Мой гараж", short: "Гараж", icon: "car" };
const models: NavItem = { href: "/models", label: "Модели", icon: "grid" };
// In the sidebar the queue sits under the "Подбор 采购" title, so it is named by what it holds.
const queue: NavItem = { href: "/sourcer", label: "Заявки клиентов", zh: "采购", short: "Подбор", icon: "queue" };
const staffOrders: NavItem = { href: "/sourcer/orders", label: "Заказы клиентов", zh: "订单", short: "Заказы", icon: "box" };
const admin: NavItem = { href: "/admin", label: "Управление", icon: "settings" };
const login: NavItem = { href: "/login", label: "Войти", icon: "user" };

function personal(staff: boolean, counts: ShellCounts): NavItem[] {
  // Staff have their own requests and orders too; "Мои" keeps them apart from the work queue and customers' orders.
  return [
    search,
    garage,
    models,
    { href: "/requests", label: staff ? "Мои заявки" : "Заявки", short: "Заявки", icon: "clipboard", count: counts.openRequests },
    { href: "/orders", label: staff ? "Мои заказы" : "Заказы", short: "Заказы", icon: "box", count: counts.activeOrders },
  ];
}

// Sidebar sections. Logged out: only the public pages; the "Войти" button sits at the bottom of the sidebar.
export function navSections(role: UserRole | null, counts: ShellCounts = { openRequests: 0, activeOrders: 0 }): NavSection[] {
  if (!role) return [{ title: "Мой автомобиль", items: [search, models] }];
  if (isStaffRole(role))
    return [
      { title: "Подбор", zh: "采购", items: role === "admin" ? [queue, staffOrders, admin] : [queue, staffOrders] },
      { title: "Мой автомобиль", items: personal(true, counts) },
    ];
  return [{ title: role === "master" ? "Кабинет мастера" : "Мой автомобиль", items: personal(false, counts) }];
}

// The phone bottom bar: five items at most. Staff get the queue instead of the model list, and an admin gets
// "Управление" instead of the garage (the garage stays one tap away on the search page).
export function bottomItems(role: UserRole | null): NavItem[] {
  if (!role) return [search, models, login];
  const [, , , requests, orders] = personal(isStaffRole(role), { openRequests: 0, activeOrders: 0 });
  const plain = (item: NavItem): NavItem => ({ ...item, count: undefined });
  if (role === "admin") return [search, queue, plain(requests), plain(orders), admin];
  if (role === "sourcer") return [search, garage, queue, plain(requests), plain(orders)];
  return [search, garage, models, plain(requests), plain(orders)];
}

const matches = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

// Only the most specific section is current, so /sourcer/orders marks "Заказы клиентов" and not "Подбор" too.
export function currentHref(path: string | null | undefined, hrefs: string[]): string | null {
  if (!path) return null;
  return hrefs.filter((href) => matches(path, href)).sort((a, b) => b.length - a.length)[0] ?? null;
}

export type Crumb = { label: string; href?: string };

const TOP: Record<string, Crumb> = {
  garage: { label: "Мой гараж", href: "/garage" },
  models: { label: "Модели", href: "/models" },
  requests: { label: "Заявки", href: "/requests" },
  orders: { label: "Заказы", href: "/orders" },
  sourcer: { label: "Подбор 采购", href: "/sourcer" },
  admin: { label: "Управление", href: "/admin" },
  profile: { label: "Профиль", href: "/profile" },
  login: { label: "Вход", href: "/login" },
};
const NEW: Record<string, string> = { garage: "Новая машина", requests: "Новая заявка" };
const ITEM: Record<string, string> = { garage: "Машина", models: "Модель", requests: "Заявка", orders: "Заказ" };

// Breadcrumb from the path ("/garage/<id>/catalog" → Мой гараж / Машина / Каталог, "/models/byd-han" → Модели /
// BYD Han). The last crumb is the current page and has no link. Unknown paths fall back to the top section, or to
// nothing. The home page is under "Мой гараж" only for someone who has a car there.
export function breadcrumbFor(path: string | null | undefined, { garage = true }: { garage?: boolean } = {}): Crumb[] {
  const parts = String(path ?? "/")
    .split("?")[0]
    .split("/")
    .filter(Boolean);
  if (!parts.length) return garage ? [{ label: "Мой гараж", href: "/garage" }, { label: "Поиск деталей" }] : [{ label: "Поиск деталей" }];
  const [section, second, third] = parts;
  const top = TOP[section];
  if (!top) return [];
  const trail: Crumb[] = [top];
  if (section === "sourcer") {
    if (second === "orders") {
      trail.push({ label: "Заказы клиентов 订单", href: "/sourcer/orders" });
      if (third) trail.push({ label: "Заказ" });
    } else if (second === "requests" && third) trail.push({ label: "Заявка" });
  } else if (second) {
    const model = section === "models" ? getModel(second) : null;
    if (second === "new" && NEW[section]) trail.push({ label: NEW[section] });
    else if (model) trail.push({ label: modelTitle(model) });
    else if (ITEM[section]) {
      trail.push({ label: ITEM[section], href: `/${section}/${second}` });
      if (section === "garage" && third === "catalog") trail.push({ label: "Каталог" });
    }
  }
  const last = trail[trail.length - 1];
  trail[trail.length - 1] = { label: last.label };
  return trail;
}

// The "Помочь с подбором" button: not on the login page, not in the staff work areas, and not on a request, where
// the form or the thread already is the way to ask.
export function showAssistant(path: string | null | undefined): boolean {
  const p = path ?? "/";
  if (p.startsWith("/requests/")) return false;
  return !(p === "/login" || matches(p, "/sourcer") || matches(p, "/admin"));
}

// Up to two letters from the name ("Алмас Абишев" → "АА"); without a name, null (the avatar shows an icon).
export function initials(name: string | null | undefined): string | null {
  const words = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter((w) => /\p{L}/u.test(w));
  if (!words.length) return null;
  const letters = words.slice(0, 2).map((w) => [...w].find((c) => /\p{L}/u.test(c)) ?? "");
  return letters.join("").toLocaleUpperCase("ru-RU") || null;
}

// One honest line under the "ДЕМО" tag, or null on a real deployment with the live parts provider.
export function demoNote({ demo, fixture }: { demo: boolean; fixture: boolean }): string | null {
  if (demo) return fixture ? "Демо-стенд: данные временные, каталог на тестовых примерах." : "Демо-стенд: данные временные.";
  if (fixture) return "Каталог на тестовых примерах: номера деталей не настоящие.";
  return null;
}

export const DEFAULT_CITY = "Алматы";
