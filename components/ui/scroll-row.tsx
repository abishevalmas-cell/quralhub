"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// A single sideways-scrolling row (chips, tabs) at every width, with soft fades at the edges that still have more
// to show. The fades follow the scroll position, so the first and the last item are never dimmed for nothing.
export function ScrollRow({
  label,
  role = "group",
  className,
  children,
}: {
  label?: string;
  role?: "group" | "none";
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const start = el.scrollLeft > 2;
      const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };
    el.addEventListener("scroll", update, { passive: true });
    // Fires once right away, then whenever the row or its content changes size.
    const resize = new ResizeObserver(update);
    resize.observe(el);
    for (const child of el.children) resize.observe(child);
    return () => {
      el.removeEventListener("scroll", update);
      resize.disconnect();
    };
  }, []);

  const fade = 28;
  const mask = `linear-gradient(90deg, ${edges.start ? "transparent" : "#000"}, #000 ${fade}px, #000 calc(100% - ${fade}px), ${
    edges.end ? "transparent" : "#000"
  })`;
  return (
    <div
      ref={ref}
      role={role === "none" ? undefined : role}
      aria-label={label}
      className={cn("scroll-row flex gap-2", className)}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      {children}
    </div>
  );
}
