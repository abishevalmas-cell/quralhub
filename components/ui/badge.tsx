import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Small status labels. warn is the warm "Нужна проверка VIN" tag of the original design.
const tones = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  hand: "bg-hand-bg text-hand",
  bad: "bg-bad-bg text-bad",
  neutral: "bg-soft text-ink",
  lime: "bg-lime text-on-lime",
} as const;
export type Tone = keyof typeof tones;

export function Badge({
  tone = "neutral",
  wrap = false,
  children,
  className,
}: {
  tone?: Tone;
  /** Let a long label wrap instead of staying on one line. */
  wrap?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-[3px] text-xs leading-4 font-semibold",
        wrap ? "whitespace-normal" : "whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const dots: Record<Tone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  hand: "bg-hand",
  bad: "bg-bad",
  neutral: "bg-muted",
  lime: "bg-dot",
};

// The status of a request or order in a page header: a white pill with a coloured dot, like the vehicle pill of the
// original Tetix ("● Zeekr X"). The text carries the meaning; the dot is decoration.
export function StatusPill({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-[30px] border border-line bg-card px-3.5 text-[13px] font-semibold text-ink",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", dots[tone])} />
      {children}
    </span>
  );
}
