'use client'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Tool } from '@/lib/tools'
import { useApp } from '@/components/layout/Providers'

export function ToolCard({ tool }: { tool: Tool }) {
  const { lang } = useApp()

  return (
    <Link
      href={tool.href}
      className="tool-card group relative overflow-hidden rounded-2xl p-5 pb-4 sm:p-6 sm:pb-5 text-center active:scale-[0.97] transition-transform duration-200 cursor-pointer border border-border/40 dark:border-white/[0.08] bg-card/90 dark:bg-card/80 shadow-sm hover:shadow-md"
    >
      {tool.badge && (
        <span className={cn(
          'absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-lg tracking-wide z-10',
          tool.badge.type === 'hot' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
          tool.badge.type === 'new' && 'bg-accent text-primary border border-primary/15',
          tool.badge.type === 'ai' && 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
        )}>
          {tool.badge.text}
        </span>
      )}

      {/* Icon — simple colored bg, no blur */}
      <div className="w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-[18px] mx-auto mb-3 flex items-center justify-center relative">
        <div className={cn('absolute inset-0 rounded-[18px] opacity-20 bg-gradient-to-br', tool.glowClass)} />
        <span className="relative z-1 text-3xl sm:text-4xl">{tool.icon}</span>
      </div>

      <h3 className="text-[13px] sm:text-sm font-bold text-foreground tracking-tight mb-0.5">{lang === 'ru' ? tool.nameRu : tool.name}</h3>
      <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">{lang === 'ru' ? tool.descriptionRu : tool.description}</p>
    </Link>
  )
}
