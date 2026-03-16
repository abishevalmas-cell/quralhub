import { Info } from 'lucide-react'
import type { ReactNode } from 'react'

export function TipBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 mt-4 text-[13px] text-amber-900 dark:text-amber-200 leading-relaxed border border-amber-200/30 dark:border-amber-800/30">
      <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
      <span>{children}</span>
    </div>
  )
}
