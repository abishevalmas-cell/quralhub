import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// primary: lime, the one main action on a screen; disabled it turns soft gray, never a muddy lime. dark and strong:
// graphite with white text in both themes (a hairline sets it off a dark card). light: white with a hairline, for
// actions over a tinted surface such as the vehicle stage.
const graphite = "bg-strong text-on-strong hover:opacity-90 dark:ring-1 dark:ring-line-strong";
const variants = {
  primary:
    "bg-lime font-bold text-on-lime hover:bg-lime-hover disabled:bg-soft disabled:text-muted disabled:opacity-100 aria-disabled:bg-soft aria-disabled:text-muted aria-disabled:opacity-100",
  dark: graphite,
  strong: graphite,
  light: "border border-line bg-card text-ink hover:border-line-strong hover:bg-soft",
  ghost: "bg-transparent text-ink hover:bg-soft",
  soft: "bg-soft text-ink hover:bg-line",
  danger: "bg-bad-bg text-bad hover:brightness-95",
} as const;
const sizes = {
  sm: "h-9 rounded-[10px] px-3 text-[13px]",
  md: "h-11 rounded-xl px-4 text-[15px]",
  lg: "h-12 rounded-xl px-5 text-base",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

const base =
  "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition select-none disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

export const buttonClass = (variant: ButtonVariant = "dark", size: ButtonSize = "md", className?: string) =>
  cn(base, variants[variant], sizes[size], className);

export function Button({
  variant = "dark",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  // No default type: a Button inside a form submits it, as a plain <button> does. Pass type="button" otherwise.
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "dark",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
