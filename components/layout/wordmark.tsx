import Link from "next/link";
import { cn } from "@/lib/utils";

// "tetix" with the lime dot. Large in the sidebar, smaller in the phone header.
export function Wordmark({ size = "lg", className }: { size?: "lg" | "md"; className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Tetix, на главную"
      className={cn(
        "inline-flex items-baseline font-extrabold leading-none text-ink",
        size === "lg" ? "text-[40px] tracking-[-0.05em]" : "text-[30px] tracking-[-0.05em]",
        className,
      )}
    >
      tetix
      <span
        aria-hidden="true"
        className={cn("ml-[3px] inline-block rounded-full bg-dot", size === "lg" ? "size-[10px]" : "size-2")}
      />
    </Link>
  );
}
