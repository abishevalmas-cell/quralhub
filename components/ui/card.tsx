import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-[18px] border border-line bg-card p-5", className)} {...props} />;
}

// Eyebrow ("МОЙ АВТОМОБИЛЬ"), a large h1 and an optional right slot (`actions`: a vehicle pill, a button).
// On phones the slot stays beside a short title and moves under a long one.
export function PageHeader({ eyebrow, title, actions, children }: { eyebrow?: ReactNode; title: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0 flex-[1_1_13rem]">
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h1 className="mt-2 text-[27px] font-bold leading-[1.18] tracking-[-0.03em] text-balance sm:text-[34px] sm:tracking-[-0.035em]">{title}</h1>
        {children ? <div className="mt-2 max-w-2xl text-[15px] text-muted">{children}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

// A section title row inside a page: "Детали для вашего авто" with a small note on the right.
export function SectionHeading({ title, note, level = 2, id }: { title: ReactNode; note?: ReactNode; level?: 2 | 3; id?: string }) {
  const Heading = level === 3 ? "h3" : "h2";
  return (
    <div className="mb-4 mt-8 flex items-baseline justify-between gap-3">
      <Heading id={id} className="text-lg font-bold tracking-[-0.02em] sm:text-xl">
        {title}
      </Heading>
      {note ? <span className="shrink-0 text-xs text-muted">{note}</span> : null}
    </div>
  );
}

// The title is an h2: an empty state usually sits right under the page's h1. Pass `level={3}` inside a section.
export function EmptyState({
  title,
  children,
  action,
  level = 2,
}: {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  level?: 2 | 3;
}) {
  const Heading = level === 3 ? "h3" : "h2";
  return (
    <div className="grid justify-items-center gap-2 rounded-[18px] border border-dashed border-line-strong bg-card px-6 py-11 text-center">
      <Heading className="text-lg font-bold">{title}</Heading>
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

// A section title inside a page grid (no outer margins, the grid gap spaces it): "Предложения", "История".
export function SectionTitle({ id, level = 2, className, children }: { id?: string; level?: 2 | 3; className?: string; children: ReactNode }) {
  const Heading = level === 3 ? "h3" : "h2";
  return (
    <Heading id={id} className={cn("text-lg font-bold tracking-[-0.02em] sm:text-xl", className)}>
      {children}
    </Heading>
  );
}

// The title row of a card: "Машина", "Что ищем". A slot on the right for a tag or a link.
export function CardTitle({ children, aside, className }: { children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2", className)}>
      <h2 className="text-[15px] font-bold">{children}</h2>
      {aside}
    </div>
  );
}
