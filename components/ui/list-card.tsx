import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

// One row of a list of requests or orders: a picture (the car) on the left, the title with a line of facts, the
// status on the right and a chevron. The whole card is one link.
export function ListCard({
  href,
  media,
  title,
  meta,
  status,
  footer,
  className,
}: {
  href: string;
  media?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group grid items-center gap-3 rounded-[18px] border border-line bg-card p-3 transition hover:border-line-strong hover:shadow-[0_8px_30px_rgb(23_35_44/0.06)] sm:gap-4 sm:p-4",
        // cn() does not merge classes: exactly one column template.
        media ? "grid-cols-[auto_minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,1fr)_auto] pl-4 sm:pl-5",
        className,
      )}
    >
      {media ? <div className="w-[76px] shrink-0 overflow-hidden rounded-xl sm:w-[112px]">{media}</div> : null}
      <div className="grid min-w-0 gap-1.5">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
          <span className="min-w-0 break-words text-[16px] font-bold leading-snug sm:text-[17px]">{title}</span>
          {status ? <span className="shrink-0">{status}</span> : null}
        </div>
        {meta ? <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted sm:text-sm">{meta}</div> : null}
        {footer}
      </div>
      <Icon name="chevron" className="size-5 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
    </Link>
  );
}
