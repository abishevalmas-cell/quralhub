import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  warn: { box: "bg-warn-bg border-warn/25", title: "text-warn" },
  hand: { box: "bg-hand-bg border-hand/25", title: "text-hand" },
  bad: { box: "bg-bad-bg border-bad/25", title: "text-bad" },
  ok: { box: "bg-ok-bg border-ok/25", title: "text-ok" },
  neutral: { box: "bg-soft border-line", title: "text-ink" },
} as const;

// A calm, honest explanation with an optional next step. Not an error screen.
export function Notice({
  tone = "neutral",
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof tones;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-2 rounded-[18px] border px-4 py-3.5 sm:px-5", tones[tone].box, className)}>
      <h2 className={cn("font-bold", tones[tone].title)}>{title}</h2>
      {children ? <div className="text-[15px] text-ink">{children}</div> : null}
      {action ? <div className="mt-1 flex flex-wrap gap-2">{action}</div> : null}
    </section>
  );
}
