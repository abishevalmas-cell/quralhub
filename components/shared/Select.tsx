import { cn } from '@/lib/utils'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export function Select({ label, className, children, ...props }: SelectProps) {
  return (
    <div>
      {label && <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}</label>}
      <select
        className={cn(
          "w-full px-3 py-3 bg-white/40 dark:bg-white/[0.04] backdrop-blur-xl border border-white/30 dark:border-white/[0.08] rounded-xl text-sm outline-none focus:border-primary transition-colors",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}
