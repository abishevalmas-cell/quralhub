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
      className="group relative overflow-hidden rounded-2xl p-6 pb-5 text-center hover:-translate-y-1.5 active:scale-[0.97] transition-all duration-300 cursor-pointer border border-white/30 dark:border-white/[0.08] bg-white/40 dark:bg-white/[0.04] backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] hover:border-white/50 dark:hover:border-white/[0.14]"
      style={{ WebkitBackdropFilter: 'blur(20px) saturate(1.3)', backdropFilter: 'blur(20px) saturate(1.3)' }}
    >
      {/* Inner top shine */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent pointer-events-none" />

      {tool.badge && (
        <span className={cn(
          'absolute top-2.5 right-2.5 text-[9px] font-bold px-2 py-0.5 rounded-lg tracking-wide z-10',
          tool.badge.type === 'hot' && 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
          tool.badge.type === 'new' && 'bg-accent text-primary border border-primary/15',
          tool.badge.type === 'ai' && 'bg-gradient-to-r from-violet-100 to-purple-200 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
        )}>
          {tool.badge.text}
        </span>
      )}

      {/* Solid colored frosted glass icon — fully opaque, no light through */}
      <div className="glass-icon w-[72px] h-[72px] rounded-[22px] mx-auto mb-3.5 flex items-center justify-center">
        <div className={cn('color-fill bg-gradient-to-br', tool.glowClass)} />
        <div className="front-panel" />
        <span className="icon-emoji text-4xl">{tool.icon}</span>
      </div>

      <h3 className="text-sm font-bold text-foreground tracking-tight mb-1 relative">{lang === 'ru' ? tool.nameRu : tool.name}</h3>
      <p className="text-xs text-muted-foreground leading-snug relative">{lang === 'ru' ? tool.descriptionRu : tool.description}</p>
    </Link>
  )
}
