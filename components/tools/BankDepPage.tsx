'use client'
import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/layout/BackButton'
import { ResultCard } from '@/components/shared/ResultCard'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { InfoChip } from '@/components/shared/InfoChip'
import { useApp } from '@/components/layout/Providers'
import { F } from '@/lib/constants'
import { BANKS, type DepositType } from '@/lib/data/banks'

type FilterType = 'all' | DepositType

export function BankDepPage() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const FILTER_LABELS: Record<FilterType, string> = {
    all: L('Барлығы', 'Все'),
    save: L('Сберегательный', 'Сберегательный'),
    flex: L('Гибкий', 'Гибкий'),
  }

  const CAP_LABELS: Record<string, string> = {
    'ежедневная': L('Күн сайын', 'Ежедневно'),
    'ежемесячная': L('Ай сайын', 'Ежемесячно'),
  }

  const [amount, setAmount] = useState(1000000)
  const [term, setTerm] = useState(6)
  const [filter, setFilter] = useState<FilterType>('all')

  const results = useMemo(() => {
    const items: Array<{
      bankName: string
      shortName: string
      color: string
      logo: string
      product: string
      rate: number
      gaer: number
      type: DepositType
      min: number
      capitalization: string
      topUp: boolean
      profit: number
      matchedTerm: number
    }> = []

    BANKS.forEach(bank => {
      bank.deposits.forEach(dep => {
        if (filter !== 'all' && dep.type !== filter) return
        // Find matching term: exact match or nearest available term >= selected
        if (!dep.terms.includes(term) && !dep.terms.some(x => x >= term)) return
        const matchedTerm = dep.terms.includes(term)
          ? term
          : dep.terms.find(x => x >= term) || dep.terms[dep.terms.length - 1]
        const profit = Math.round(amount * dep.gaer / 100 / 12 * matchedTerm)
        items.push({
          bankName: bank.name,
          shortName: bank.shortName,
          color: bank.color,
          logo: bank.logo,
          product: dep.product,
          rate: dep.rate,
          gaer: dep.gaer,
          type: dep.type,
          min: dep.min,
          capitalization: dep.capitalization,
          topUp: dep.topUp,
          profit,
          matchedTerm,
        })
      })
    })

    // Sort by GAER descending (best deposit first)
    return items.sort((a, b) => b.gaer - a.gaer)
  }, [amount, term, filter])

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">{L('🏦 Банк депозиттері', '🏦 Банковские депозиты')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>{L('14 банк', '14 банков')}</InfoChip>
        <InfoChip>{L('ГЭСВ бойынша сұрыпталған', 'Отсортировано по ГЭСВ')}</InfoChip>
        <InfoChip>{L('ҚТҚО кепілдігі 20 млн ₸', 'Гарантия КФГД 20 млн ₸')}</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        {L('Депозит ставкаларын салыстырып, ең тиімді банкты таңдаңыз', 'Сравните ставки депозитов и выберите лучший банк')}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Сома (₸)', 'Сумма (₸)')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={amount || ''}
            onChange={e => setAmount(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Мерзімі', 'Срок')}</label>
          <select
            className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
            value={term}
            onChange={e => setTerm(Number(e.target.value))}
          >
            <option value={3}>3 {L('ай', 'мес.')}</option>
            <option value={6}>6 {L('ай', 'мес.')}</option>
            <option value={12}>12 {L('ай', 'мес.')} (1 {L('жыл', 'год')})</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(Object.keys(FILTER_LABELS) as FilterType[]).map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              filter === t
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary'
            }`}
          >
            {FILTER_LABELS[t]}
          </button>
        ))}
      </div>

      {amount > 0 && results.length > 0 && (
        <div className="space-y-3">
          {results.map((item, idx) => (
            <ResultCard key={`${item.bankName}-${item.product}`}>
              <div className={`rounded-xl transition-all ${idx === 0 ? 'ring-2 ring-primary' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.logo}
                    width={36}
                    height={36}
                    alt={item.bankName}
                    className="rounded-[10px] flex-shrink-0"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement
                      img.style.display = 'none'
                      const fallback = img.nextElementSibling as HTMLElement
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                  <div
                    className="w-9 h-9 rounded-[10px] text-white hidden items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{ background: item.color }}
                  >
                    {item.shortName}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{item.bankName}</div>
                    <div className="text-xs text-muted-foreground">{item.product}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">{item.gaer}%</div>
                    <div className="text-[10px] text-muted-foreground">{L('ГЭСВ', 'ГЭСВ')}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/50 text-muted-foreground">
                    {L('Номинал', 'Номинал')}: {item.rate}%
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/50 text-muted-foreground">
                    {CAP_LABELS[item.capitalization] || item.capitalization}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/50 text-muted-foreground">
                    {item.topUp ? L('Толтыру +', 'Пополнение +') : L('Толтыру -', 'Пополнение -')}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/50 text-muted-foreground">
                    {L('Мин', 'Мин')}: {F(item.min)}₸
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/50 text-muted-foreground">
                    {item.type === 'save' ? L('Сберегательный', 'Сберегательный') : L('Гибкий', 'Гибкий')}
                  </span>
                  {idx === 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold">
                      {L('Ең тиімді!', 'Лучшее предложение!')}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between py-2 border-t border-border/50">
                  <span className="text-sm text-muted-foreground">{F(amount)}₸ x {item.matchedTerm} {L('ай', 'мес.')}</span>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">+{F(item.profit)} ₸ {L('табыс', 'доход')}</span>
                </div>
              </div>
            </ResultCard>
          ))}
        </div>
      )}

      {results.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {L('Сәйкес депозит табылмады', 'Подходящий депозит не найден')}
        </div>
      )}

      <TipBox>
        {L('ГЭСВ (GAER) — Годовая эффективная ставка вознаграждения. Бұл капитализацияны ескерген нақты ставка. ҚТҚО кепілдігі: сберегательный 20 млн ₸, талап ету 10 млн ₸.', 'ГЭСВ (GAER) — Годовая эффективная ставка вознаграждения. Это реальная ставка с учётом капитализации. Гарантия КФГД: сберегательный 20 млн ₸, до востребования 10 млн ₸.')}
      </TipBox>

      <ShareBar tool="bankdep" text={L('Банк депозиттері — Quralhub', 'Банковские депозиты — Quralhub')} />
    </div>
  )
}
