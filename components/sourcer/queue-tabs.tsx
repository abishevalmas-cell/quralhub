import Link from "next/link";
import { chipClass } from "@/components/ui/chip";
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
    <nav aria-label="Разделы очереди" className="scroll-row -mx-4 mb-4 px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0">
      <ul className="flex gap-2 sm:flex-wrap">
        {QUEUE_TABS.map((tab) => {
          const active = tab.view === view;
          const n = counts[tab.view];
          return (
            <li key={tab.view}>
              <Link
                href={queueHref(tab.view, q)}
                aria-current={active ? "page" : undefined}
                className={chipClass(active, "min-h-10 text-sm")}
              >
                {tab.label}
                <Zh className={cn("font-normal", active ? "text-on-strong/75" : "text-muted")}>{tab.zh}</Zh>
                {n ? (
                  <span className={cn("grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold", active ? "bg-lime text-on-lime" : "bg-soft")}>
                    {n}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
