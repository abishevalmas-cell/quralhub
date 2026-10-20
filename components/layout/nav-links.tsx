"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/ui/icon";

// `short` replaces the label in the bottom bar, where five items share a phone's width.
export type NavItem = { href: string; label: string; short?: string; icon: IconName };

export function NavLinks({ items, variant }: { items: NavItem[]; variant: "top" | "bottom" }) {
  const path = usePathname();
  const matches = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
  // Only the most specific section is marked, so /sourcer/orders highlights "Заказы клиентов" and not "Подбор" too.
  const current = items.filter((item) => matches(item.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const active = (href: string) => href === current;
  if (variant === "top")
    return (
      <ul className="flex w-max gap-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className={cn(
                "block whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:text-ink",
                active(item.href) && "bg-ink text-paper hover:text-paper",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    );
  return (
    <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            aria-current={active(item.href) ? "page" : undefined}
            className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-muted", active(item.href) && "text-ink")}
          >
            <Icon name={item.icon} className="size-6" />
            <span className="max-w-full truncate px-1">{item.short ?? item.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
