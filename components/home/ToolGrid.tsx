'use client'
import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ToolCard } from './ToolCard'
import { TOOLS, SECTIONS, type Tool } from '@/lib/tools'
import { useApp } from '@/components/layout/Providers'
import { Search } from 'lucide-react'

type Layout = 'A' | 'B'

// Popular tools for Layout B (top-8 hero cards)
const POPULAR_IDS = ['salary', 'vat', 'mortgage', 'currency', 'connect', 'marketplace', 'transport', 'fines']

// Compact mini-card for Layout B
function MiniCard({ tool }: { tool: Tool }) {
  const { lang } = useApp()
  return (
    <Link
      href={tool.href}
      className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/40 bg-card/80 hover:border-primary/40 hover:shadow-sm transition-all active:scale-[0.97]"
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative')}>
        <div className={cn('absolute inset-0 rounded-xl opacity-20 bg-gradient-to-br', tool.glowClass)} />
        <span className="relative text-lg">{tool.icon}</span>
      </div>
      <div className="min-w-0">
        <span className="text-xs font-bold text-foreground block truncate">{lang === 'ru' ? tool.nameRu : tool.name}</span>
        <span className="text-[10px] text-muted-foreground block truncate">{lang === 'ru' ? tool.descriptionRu : tool.description}</span>
      </div>
    </Link>
  )
}

export function ToolGrid() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [layout, setLayout] = useState<Layout>('A')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')

  const toggleSection = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Search filter
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

  // Layout B data
  const popularTools = POPULAR_IDS.map(id => TOOLS.find(t => t.id === id)!).filter(Boolean)
  const otherTools = TOOLS.filter(t => !POPULAR_IDS.includes(t.id))

  return (
    <div className="relative space-y-5">
      {/* Ambient shapes — desktop only */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 hidden md:block" aria-hidden="true">
        <div className="absolute w-32 h-32 top-[5%] left-[8%] bg-emerald-400 rounded-full opacity-[0.08] dark:opacity-[0.04] blur-3xl" style={{ animation: 'floatBlob 12s ease-in-out infinite' }} />
        <div className="absolute w-40 h-40 top-[25%] right-[5%] bg-blue-400 rounded-full opacity-[0.08] dark:opacity-[0.04] blur-3xl" style={{ animation: 'floatBlob 10s ease-in-out infinite 2s' }} />
        <div className="absolute w-28 h-28 top-[50%] left-[15%] bg-purple-400 rounded-full opacity-[0.08] dark:opacity-[0.04] blur-3xl" style={{ animation: 'floatBlob 14s ease-in-out infinite 4s' }} />
      </div>

      {/* Search bar + Layout toggle */}
      <div className="relative z-10 px-5 max-w-[960px] mx-auto">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={L('Құрал іздеу...', 'Поиск инструмента...')}
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-card border border-border text-sm outline-none focus:border-primary transition-colors"
            />
          </div>
          {/* Layout toggle — temporary, for comparison */}
          <div className="flex items-center bg-card border border-border rounded-xl overflow-hidden h-10">
            <button
              onClick={() => setLayout('A')}
              className={`px-3 h-full text-xs font-bold transition-colors ${layout === 'A' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              A
            </button>
            <button
              onClick={() => setLayout('B')}
              className={`px-3 h-full text-xs font-bold transition-colors ${layout === 'B' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              B
            </button>
          </div>
        </div>
        {search && (
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {TOOLS.filter(matchesTool).length} {L('құрал табылды', 'инструментов найдено')}
          </p>
        )}
      </div>

      {/* Search results mode */}
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

      {/* ===== LAYOUT A: Collapsible sections ===== */}
      {!searchLower && layout === 'A' && (
        <>
          {SECTIONS.map(section => {
            const sectionTools = section.tools.map(id => TOOLS.find(t => t.id === id)!).filter(Boolean)
            const VISIBLE_COUNT = 6
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
        </>
      )}

      {/* ===== LAYOUT B: Popular + compact grid ===== */}
      {!searchLower && layout === 'B' && (
        <>
          {/* Popular tools — big cards */}
          <section className="relative z-10 px-5 max-w-[960px] mx-auto">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary tracking-widest uppercase bg-primary/10 backdrop-blur-sm border border-primary/10 px-3 py-1 rounded-full mb-1.5">
              {L('ТАНЫМАЛ', 'ПОПУЛЯРНЫЕ')}
            </div>
            <h2 className="text-xl font-extrabold text-foreground tracking-tight mb-4">{L('Ең көп қолданылатын', 'Самые популярные')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {popularTools.map(tool => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>

          {/* All other tools — compact mini-cards */}
          <section className="relative z-10 px-5 max-w-[960px] mx-auto">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground tracking-widest uppercase bg-muted/50 border border-border/40 px-3 py-1 rounded-full mb-1.5">
              {L('БАРЛЫҚ ҚҰРАЛДАР', 'ВСЕ ИНСТРУМЕНТЫ')}
            </div>
            <h2 className="text-lg font-extrabold text-foreground tracking-tight mb-3">{L('Толық тізім', 'Полный список')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {otherTools.map(tool => (
                <MiniCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
