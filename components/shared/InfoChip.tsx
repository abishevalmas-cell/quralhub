export function InfoChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] px-3 py-1.5 rounded-full bg-accent text-accent-foreground font-semibold border border-primary/10 whitespace-nowrap">
      {children}
    </span>
  )
}
