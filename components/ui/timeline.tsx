import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

export type TimelineState = "done" | "current" | "todo";

// A vertical line of steps or events: graphite dots for what happened, a lime dot for where things are now and
// hollow ones for what is still ahead. The state is also said in words for screen readers.
export function Timeline({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <ol aria-label={label} className={cn("grid", className)}>
      {children}
    </ol>
  );
}

const SR: Record<TimelineState, string> = { done: "пройден", current: "сейчас", todo: "впереди" };

export function TimelineItem({
  state,
  title,
  meta,
  children,
  srState = true,
}: {
  state: TimelineState;
  title: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  /** Say "пройден / сейчас / впереди" after the title (a list of stages); off for a history of events. */
  srState?: boolean;
}) {
  return (
    <li
      aria-current={state === "current" ? "step" : undefined}
      className="relative grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 pb-4 last:pb-0 before:absolute before:bottom-0 before:left-[11.5px] before:top-7 before:w-px before:bg-line-strong last:before:hidden"
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative z-[1] mt-px grid size-6 place-items-center rounded-full",
          state === "done" && "bg-strong text-on-strong",
          state === "current" && "bg-lime text-on-lime shadow-[0_0_0_4px_rgb(213_250_100/0.3)]",
          state === "todo" && "border border-line-strong bg-card",
        )}
      >
        {state === "done" ? <Icon name="check" strokeWidth={2.4} className="size-3.5" /> : null}
        {state === "current" ? <span className="size-2 rounded-full bg-on-lime" /> : null}
      </span>
      <div className="grid min-w-0 gap-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={cn("text-[15px] leading-6", state === "current" ? "font-bold" : state === "todo" ? "text-muted" : "font-semibold")}>
            {title}
            {srState ? <span className="sr-only"> — {SR[state]}</span> : null}
          </span>
          {meta ? <span className="text-[13px] text-muted">{meta}</span> : null}
        </div>
        {children ? <div className="text-sm text-muted">{children}</div> : null}
      </div>
    </li>
  );
}
