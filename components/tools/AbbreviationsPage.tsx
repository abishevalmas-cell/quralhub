'use client'
import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/layout/BackButton'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { InfoChip } from '@/components/shared/InfoChip'
import { useApp } from '@/components/layout/Providers'
import { ABBREVIATIONS } from '@/lib/data/abbreviations'

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export function AbbreviationsPage() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query) return ABBREVIATIONS
    const q = query.toLowerCase()
    return ABBREVIATIONS.filter(
      a => a[0].toLowerCase().includes(q) || a[1].toLowerCase().includes(q) || a[2].toLowerCase().includes(q)
    )
  }, [query])

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">{L('📋 Қысқартулар анықтамасы', '📋 Справочник сокращений')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>{ABBREVIATIONS.length} {L('қысқарту', 'сокращений')}</InfoChip>
        <InfoChip>{L('ҚАЗ + РУС', 'КАЗ + РУС')}</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        {L('Қазақстандық ресми қысқартулар мен аббревиатуралар анықтамасы', 'Справочник официальных казахстанских сокращений и аббревиатур')}
      </p>

      <div className="mb-4">
        <Input
          type="text"
          placeholder={L('Іздеу... (мыс. ОПВ, ЖК, НДС)', 'Поиск... (напр. ОПВ, ЖК, НДС)')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="text-base"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-card">
                <th className="text-left p-3 border border-border font-semibold text-muted-foreground whitespace-nowrap">{L('Қысқарту', 'Сокращение')}</th>
                <th className="text-left p-3 border border-border font-semibold text-muted-foreground">{L('Қазақша', 'На казахском')}</th>
                <th className="text-left p-3 border border-border font-semibold text-muted-foreground">{L('Орысша', 'На русском')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((abbr, i) => (
                <tr key={i} className="hover:bg-accent/30 transition-colors">
                  <td className="p-3 border border-border font-bold text-[15px] whitespace-nowrap">
                    {highlightMatch(abbr[0], query)}
                  </td>
                  <td className="p-3 border border-border">
                    {highlightMatch(abbr[1], query)}
                  </td>
                  <td className="p-3 border border-border text-muted-foreground">
                    {highlightMatch(abbr[2], query)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {L('Табылмады', 'Не найдено')}
        </div>
      )}

      <TipBox>
        {L('Қысқартуларды іздеу: қазақша, орысша немесе қысқартудың өзі бойынша іздей аласыз.', 'Поиск сокращений: можно искать по казахскому, русскому названию или самому сокращению.')}
      </TipBox>

      <ShareBar tool="abbrev" text={L('Қысқартулар анықтамасы — Quralhub', 'Справочник сокращений — Quralhub')} />
    </div>
  )
}
