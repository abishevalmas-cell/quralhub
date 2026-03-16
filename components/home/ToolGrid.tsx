'use client'
import { useState } from 'react'
import { ToolCard } from './ToolCard'
import { TOOLS, SECTIONS, type Tool } from '@/lib/tools'
import { useApp } from '@/components/layout/Providers'
import { Search } from 'lucide-react'

const VISIBLE_COUNT = 6

export function ToolGrid() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')

  const toggleSection = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const searchLower = search.toLowerCase().trim()
  const matchesTool = (tool: Tool) => {
    if (!searchLower) return true
    return (
      tool.name.toLowerCase().includes(searchLower) ||
      tool.nameRu.toLowerCase().includes(searchLower) ||
      tool.description.toLowerCase().includes(searchLower) ||
      tool.descriptionRu.toLowerCase().includes(searchLower) ||
      tool.search.toLowerCase().includes(searchLower)
    )
  }

  return (
    <div className="relative space-y-5">
      {/* Ambient shapes — desktop only */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 hidden md:block" aria-hidden="true">
        <div className="absolute w-32 h-32 top-[5%] left-[8%] bg-emerald-400 rounded-full opacity-[0.08] dark:opacity-[0.04] blur-3xl" style={{ animation: 'floatBlob 12s ease-in-out infinite' }} />
        <div className="absolute w-40 h-40 top-[25%] right-[5%] bg-blue-400 rounded-full opacity-[0.08] dark:opacity-[0.04] blur-3xl" style={{ animation: 'floatBlob 10s ease-in-out infinite 2s' }} />
        <div className="absolute w-28 h-28 top-[50%] left-[15%] bg-purple-400 rounded-full opacity-[0.08] dark:opacity-[0.04] blur-3xl" style={{ animation: 'floatBlob 14s ease-in-out infinite 4s' }} />
      </div>

      {/* Search bar */}
      <div className="relative z-10 px-5 max-w-[960px] mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={L('Құрал іздеу...', 'Поиск инструмента...')}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-card border border-border text-sm outline-none focus:border-primary transition-colors"
          />
        </div>
        {search && (
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {TOOLS.filter(matchesTool).length} {L('құрал табылды', 'инструментов найдено')}
          </p>
        )}
      </div>

      {/* Search results */}
      {searchLower && (
        <div className="relative z-10 px-5 max-w-[960px] mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {TOOLS.filter(matchesTool).map(tool => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
          {TOOLS.filter(matchesTool).length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">{L('Ештеңе табылмады', 'Ничего не найдено')}</p>
          )}
        </div>
      )}

      {/* Collapsible sections */}
      {!searchLower && SECTIONS.map(section => {
        const sectionTools = section.tools.map(id => TOOLS.find(t => t.id === id)!).filter(Boolean)
        const isExpanded = expanded[section.key] || sectionTools.length <= VISIBLE_COUNT
        const visibleTools = isExpanded ? sectionTools : sectionTools.slice(0, VISIBLE_COUNT)
        const hiddenCount = sectionTools.length - VISIBLE_COUNT

        return (
          <section key={section.key} className="relative z-10 px-5 max-w-[960px] mx-auto">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary tracking-widest uppercase bg-primary/10 backdrop-blur-sm border border-primary/10 px-3 py-1 rounded-full mb-1.5">
              {lang === 'ru' ? section.labelRu : section.label}
            </div>
            <h2 className="text-xl font-extrabold text-foreground tracking-tight mb-4">{lang === 'ru' ? section.titleRu : section.title}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {visibleTools.map(tool => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
            {!isExpanded && hiddenCount > 0 && (
              <button
                onClick={() => toggleSection(section.key)}
                className="mt-3 w-full py-2.5 rounded-xl border border-border/60 bg-card/50 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
              >
                {L(`Тағы +${hiddenCount} құрал`, `Ещё +${hiddenCount} инструментов`)} ▼
              </button>
            )}
            {isExpanded && sectionTools.length > VISIBLE_COUNT && (
              <button
                onClick={() => toggleSection(section.key)}
                className="mt-3 w-full py-2 rounded-xl text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                {L('Жасыру', 'Свернуть')} ▲
              </button>
            )}
          </section>
        )
      })}
    </div>
  )
}
