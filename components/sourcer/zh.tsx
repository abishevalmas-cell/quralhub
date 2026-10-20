import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Chinese label next to Russian copy on sourcer screens; suppliers and EPC catalogs use these words.
export function Zh({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("zh", className)} lang="zh">
      {children}
    </span>
  );
}
