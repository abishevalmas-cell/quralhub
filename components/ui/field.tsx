import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

const control =
  "w-full min-w-0 rounded-xl border border-line-strong bg-card px-3.5 py-2.5 text-[15px] text-ink transition placeholder:text-muted/80 hover:border-muted/50 disabled:opacity-60";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "h-11", className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-bad">{error}</p> : hint ? <p className="text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

// The big search bar of the original design (58px tall): icon, an input and the action buttons (`children`, e.g. a lime
// "Найти") inside one white box. The label is visually hidden unless `showLabel` is set; the box shows focus.
export function SearchBox({
  id,
  label,
  showLabel = false,
  hint,
  className,
  children,
  ...input
}: Omit<ComponentProps<"input">, "id" | "children"> & {
  id: string;
  label: ReactNode;
  showLabel?: boolean;
  /** A muted line under the box (examples that do not fit the placeholder on a phone). */
  hint?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className={showLabel ? "px-1 text-sm font-semibold" : "sr-only"}>
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-line-strong bg-card py-1.5 pl-4 pr-1.5 shadow-field transition has-[input:focus-visible]:border-ink/40 has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-lime-ink sm:gap-3">
        <Icon name="search" className="text-muted" />
        <input
          id={id}
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          className="h-11 w-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted/80 focus-visible:outline-none"
          aria-describedby={hint ? `${id}-hint` : undefined}
          {...input}
        />
        {children}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="px-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
