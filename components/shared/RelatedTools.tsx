'use client'
import Link from 'next/link'
import { TOOLS } from '@/lib/tools'
import { useApp } from '@/components/layout/Providers'

interface RelatedToolsProps {
  toolIds: string[]
  title?: string
}

export function RelatedTools({ toolIds, title }: RelatedToolsProps) {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz
  const related = toolIds.map(id => TOOLS.find(t => t.id === id)).filter(Boolean)

  if (related.length === 0) return null

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">
        {title || L('Пайдалы құралдар', 'Полезные инструменты')}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {related.map(tool => tool && (
          <Link
            key={tool.id}
            href={tool.href}
            className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors"
          >
            <span className="text-xl">{tool.icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{lang === 'ru' ? tool.nameRu : tool.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{lang === 'ru' ? tool.descriptionRu : tool.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
