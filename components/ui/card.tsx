import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-line bg-card p-5", className)} {...props} />;
}

export function PageHeader({ eyebrow, title, actions, children }: { eyebrow?: ReactNode; title: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{eyebrow}</div> : null}
        <h1 className="mt-1 text-[28px] font-extrabold leading-tight tracking-tight text-balance sm:text-[32px]">{title}</h1>
        {children ? <div className="mt-2 max-w-2xl text-muted">{children}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed border-line bg-card px-6 py-10 text-center">
      <h3 className="text-lg font-bold">{title}</h3>
      {children ? <p className="max-w-md text-muted">{children}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function KeyValue({ items }: { items: [ReactNode, ReactNode][] }) {
  return (
    <dl className="grid gap-0">
      {items.map(([k, v], i) => (
        <div key={i} className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-3 border-b border-dashed border-line py-2 text-[15px] last:border-0">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
