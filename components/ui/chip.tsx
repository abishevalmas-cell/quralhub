import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ScrollRow } from "./scroll-row";

// Category and filter chips of the original Tetix: white pill with a hairline; the chosen one is graphite.
const base =
  "inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[30px] border px-3.5 text-[13px] font-semibold transition";
const state = (active: boolean) =>
  active ? "border-strong bg-strong text-on-strong dark:border-line-strong" : "border-line bg-card text-ink hover:border-line-strong hover:bg-soft";

export const chipClass = (active = false, className?: string) => cn(base, state(active), className);

// A toggle: `active` is announced as pressed. Inside a form it never submits.
export function Chip({ active = false, className, type = "button", ...props }: ComponentProps<"button"> & { active?: boolean }) {
  return <button type={type} aria-pressed={active} className={chipClass(active, className)} {...props} />;
}

// A filter that is a link (?category=…): the current one is marked for screen readers too.
export function ChipLink({ active = false, className, ...props }: ComponentProps<typeof Link> & { active?: boolean }) {
  return <Link aria-current={active ? "true" : undefined} className={chipClass(active, className)} {...props} />;
}

// A labelled row of chips. `scroll` keeps one line at every width and scrolls sideways, with fades at the edges
// that have more chips; without it the chips wrap.
export function ChipGroup({
  label,
  scroll = false,
  className,
  children,
}: {
  label: string;
  scroll?: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (scroll)
    return (
      <ScrollRow label={label} className={cn("-mx-4 px-4 pb-1 sm:-mx-1 sm:px-1", className)}>
        {children}
      </ScrollRow>
    );
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {children}
    </div>
  );
}
