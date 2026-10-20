import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  hand: "bg-hand-bg text-hand",
  bad: "bg-bad-bg text-bad",
  neutral: "bg-soft text-ink",
  lime: "bg-lime text-[#17232c]",
} as const;
export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}
