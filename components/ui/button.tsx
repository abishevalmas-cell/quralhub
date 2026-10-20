import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-lime text-[#17232c] hover:brightness-95",
  dark: "bg-ink text-paper hover:opacity-90",
  ghost: "bg-transparent text-ink hover:bg-soft",
  soft: "bg-soft text-ink hover:bg-line",
  danger: "bg-bad-bg text-bad hover:brightness-95",
} as const;
const sizes = { sm: "h-9 px-3 text-sm", md: "h-11 px-4 text-[15px]", lg: "h-12 px-5 text-base" } as const;

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition disabled:opacity-50 disabled:pointer-events-none";

export function Button({
  variant = "dark",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

export function ButtonLink({
  variant = "dark",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
