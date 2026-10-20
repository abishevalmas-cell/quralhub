import Link from "next/link";
import type { QueueView } from "@/lib/services/sourcing";
import { cn } from "@/lib/utils";
import { QUEUE_TABS } from "./labels";
import { Zh } from "./zh";

export const queueHref = (view: QueueView, q = "") => {
  const params = new URLSearchParams();
  if (view !== "new") params.set("view", view);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/sourcer?${query}` : "/sourcer";
};

export function QueueTabs({ view, q, counts }: { view: QueueView; q: string; counts: Partial<Record<QueueView, number>> }) {
  return (
    <nav aria-label="Разделы очереди" className="mb-4">
      <ul className="flex flex-wrap gap-2">
        {QUEUE_TABS.map((tab) => {
          const active = tab.view === view;
          const n = counts[tab.view];
          return (
            <li key={tab.view}>
              <Link
                href={queueHref(tab.view, q)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition",
                  active ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink hover:border-muted",
                )}
              >
                {tab.label}
                <Zh className={cn("font-normal", active ? "text-paper/75" : "text-muted")}>{tab.zh}</Zh>
                {n ? (
                  <span className={cn("rounded-full px-1.5 text-xs font-bold", active ? "bg-paper/20" : "bg-soft")}>{n}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
