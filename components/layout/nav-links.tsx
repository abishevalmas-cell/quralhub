"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { breadcrumbFor, currentHref, type NavItem, type NavSection } from "./nav";

export type { NavItem } from "./nav";

function Zh({ text, className }: { text?: string; className?: string }) {
  return text ? (
    <span className={cn("zh font-normal", className)} lang="zh-CN">
      {text}
    </span>
  ) : null;
}

// Desktop sidebar: letter-spaced section titles and items with icons; the current one is a graphite pill.
export function SideNav({ sections }: { sections: NavSection[] }) {
  const path = usePathname();
  const current = currentHref(
    path,
    sections.flatMap((s) => s.items.map((i) => i.href)),
  );
  return (
    <div className="grid gap-7">
      {sections.map((section) => (
        <div key={section.title}>
          <div className="eyebrow mx-3 mb-3 flex items-baseline gap-1.5 font-semibold">
            <span>{section.title}</span>
            <Zh text={section.zh} className="tracking-normal" />
          </div>
          <ul className="grid gap-1.5">
            {section.items.map((item) => {
              const active = item.href === current;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-[10px] px-3 text-sm font-semibold transition",
                      active ? "bg-strong text-on-strong dark:ring-1 dark:ring-line-strong" : "text-muted hover:bg-soft hover:text-ink",
                    )}
                  >
                    <Icon name={item.icon} className="size-[22px]" />
                    <span className="min-w-0 flex-1 truncate">
                      {item.label} <Zh text={item.zh} className={active ? "text-on-strong/70" : "text-muted"} />
                    </span>
                    {item.count ? (
                      <span
                        className={cn(
                          "min-w-6 rounded-full px-1.5 text-center text-xs font-bold leading-6",
                          active ? "bg-lime text-on-lime" : "bg-soft text-ink",
                        )}
                      >
                        {item.count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

// Phone bottom bar: icon over a short label; the current item is darker and bolder.
export function BottomNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const current = currentHref(
    path,
    items.map((i) => i.href),
  );
  return (
    <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((item) => {
        const active = item.href === current;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 px-0.5 text-[11px] leading-tight transition",
                active ? "font-bold text-ink" : "font-semibold text-muted hover:text-ink",
              )}
            >
              <Icon name={item.icon} className="size-[22px]" strokeWidth={active ? 2.3 : 1.7} />
              {/* Five items share a phone's width: the short Russian label only; the sidebar and breadcrumb carry the Chinese. */}
              <span className="max-w-full truncate">{item.short ?? item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// "Мой гараж / Поиск деталей": earlier crumbs are links, the last one is the current page.
export function Breadcrumb({ garage = true }: { garage?: boolean }) {
  const crumbs = breadcrumbFor(usePathname(), { garage });
  if (!crumbs.length) return <span />;
  return (
    <nav aria-label="Вы здесь" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-3 text-sm text-muted">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={i} className={cn("flex min-w-0 items-center gap-3", last ? "shrink" : "shrink-0")}>
              {i > 0 ? (
                <span aria-hidden="true" className="text-line-strong">
                  /
                </span>
              ) : null}
              {last || !crumb.href ? (
                <span aria-current={last ? "page" : undefined} className={cn("truncate", last && "font-semibold text-ink")}>
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="truncate hover:text-ink">
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
