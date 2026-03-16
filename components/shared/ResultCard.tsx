import { type ReactNode } from 'react'

export function ResultCard({ children }: { children: ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3.5 sm:p-5 mt-4 shadow-sm animate-in fade-in slide-in-from-bottom-1 duration-300">
      {children}
    </div>
  )
}
