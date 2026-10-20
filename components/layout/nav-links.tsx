"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/ui/icon";

export type NavItem = { href: string; label: string; icon: IconName };

export function NavLinks({ items, variant }: { items: NavItem[]; variant: "top" | "bottom" }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
  if (variant === "top")
    return (
      <ul className="flex gap-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:text-ink",
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
            <span className="max-w-full truncate px-1">{item.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
