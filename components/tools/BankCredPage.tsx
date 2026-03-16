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
import { BANKS, type CreditType } from '@/lib/data/banks'

function calcPMT(principal: number, annualRate: number, months: number): number {
  const r = annualRate / 100 / 12
  if (r === 0) return principal / months
  return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

export function BankCredPage() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const TYPE_LABELS: Record<CreditType, string> = {
    consumer: L('Тұтыну', 'Потреб.'),
    mortgage: L('Ипотека', 'Ипотека'),
    auto: L('Авто', 'Авто'),
  }

  const [amount, setAmount] = useState(3000000)
  const [term, setTerm] = useState(24)
  const [filter, setFilter] = useState<CreditType>('consumer')

  const results = useMemo(() => {
    const items: Array<{
      bankName: string
      shortName: string
      color: string
      logo: string
      product: string
      rate: number
      monthly: number
      total: number
      overpay: number
      maxAmount: number
      maxTerm: number
    }> = []

    BANKS.forEach(bank => {
      bank.credits.forEach(cred => {
        if (cred.type !== filter) return
        if (amount > cred.maxAmount || term > cred.maxTerm) return
        const monthly = calcPMT(amount, cred.rate, term)
        const total = monthly * term
        const overpay = total - amount
        items.push({
          bankName: bank.name,
          shortName: bank.shortName,
          color: bank.color,
          logo: bank.logo,
          product: cred.product,
          rate: cred.rate,
          monthly,
          total,
          overpay,
          maxAmount: cred.maxAmount,
          maxTerm: cred.maxTerm,
        })
      })
    })

    return items.sort((a, b) => a.monthly - b.monthly)
  }, [amount, term, filter])

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">{L('💳 Банк кредиттері', '💳 Банковские кредиты')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>{L('14 банк', '14 банков')}</InfoChip>
        <InfoChip>{L('Аннуитет формуласы', 'Аннуитетная формула')}</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        {L('Барлық банктердің кредит шарттарын салыстырыңыз', 'Сравните условия кредитов всех банков')}
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
            <option value={12}>12 {L('ай', 'мес.')} (1 {L('жыл', 'год')})</option>
            <option value={24}>24 {L('ай', 'мес.')} (2 {L('жыл', 'года')})</option>
            <option value={36}>36 {L('ай', 'мес.')} (3 {L('жыл', 'года')})</option>
            <option value={48}>48 {L('ай', 'мес.')} (4 {L('жыл', 'года')})</option>
            <option value={60}>60 {L('ай', 'мес.')} (5 {L('жыл', 'лет')})</option>
            <option value={120}>120 {L('ай', 'мес.')} (10 {L('жыл', 'лет')})</option>
            <option value={240}>240 {L('ай', 'мес.')} (20 {L('жыл', 'лет')})</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(Object.keys(TYPE_LABELS) as CreditType[]).map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              filter === t
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary'
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {amount > 0 && results.length > 0 && (
        <>
        {/* Rate comparison chart */}
        <div className="mb-5 p-4 bg-card border border-border rounded-xl">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
            {L('Ставка салыстыру', 'Сравнение ставок')}
          </h3>
          <div className="space-y-2">
            {results.slice(0, 8).map((bank, i) => {
              const maxRate = Math.max(...results.map(b => b.rate))
              const pct = Math.round(bank.rate / maxRate * 100)
              const isBest = i === 0
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-[70px] truncate font-semibold">{bank.shortName}</span>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full flex items-center justify-end px-2 text-white text-[10px] font-bold ${isBest ? 'bg-green-500' : 'bg-primary/70'}`}
                      style={{ width: `${pct}%`, minWidth: '50px' }}
                    >
                      {bank.rate}%
                    </div>
                  </div>
                  <span className="w-[65px] text-right font-bold text-primary text-[11px]">
                    {F(bank.monthly)}₸
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {L('Жасыл = ең тиімді ставка', 'Зелёный = лучшая ставка')} | {L('Оңда = ай сайынғы төлем', 'Справа = ежемесячный платёж')}
          </p>
        </div>

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
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{item.bankName}</div>
                    <div className="text-xs text-muted-foreground">{item.product}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{item.rate}%</div>
                    <div className="text-[10px] text-muted-foreground">{L('жылдық', 'годовых')}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/50 text-muted-foreground">
                    {L('Макс', 'Макс')}: {F(item.maxAmount)}₸
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/50 text-muted-foreground">
                    {L('Макс мерзім', 'Макс срок')}: {item.maxTerm} {L('ай', 'мес.')}
                  </span>
                  {idx === 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold">
                      {L('Ең тиімді!', 'Лучшее предложение!')}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <div className="bg-accent/30 rounded-xl p-2 sm:p-3 text-center">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">{L('Ай сайын', 'Ежемесячно')}</p>
                    <p className="font-extrabold text-primary text-xs sm:text-sm">{F(item.monthly)} ₸</p>
                  </div>
                  <div className="bg-accent/30 rounded-xl p-2 sm:p-3 text-center">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">{L('Жалпы', 'Итого')}</p>
                    <p className="font-bold text-xs sm:text-sm">{F(item.total)} ₸</p>
                  </div>
                  <div className="bg-accent/30 rounded-xl p-2 sm:p-3 text-center">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">{L('Артық төлем', 'Переплата')}</p>
                    <p className="font-bold text-red-500 text-xs sm:text-sm">{F(item.overpay)} ₸</p>
                  </div>
                </div>
              </div>
            </ResultCard>
          ))}
        </div>
        </>
      )}

      {results.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {L('Бұл санаттағы банктер табылмады', 'Банки в этой категории не найдены')}
        </div>
      )}

      <TipBox>
        {L('Нақты ставка сіздің кредит тарихыңыз бен табысыңызға байланысты. Банк менеджерімен кеңесіңіз.', 'Реальная ставка зависит от вашей кредитной истории и дохода. Проконсультируйтесь с менеджером банка.')}
      </TipBox>

      <ShareBar tool="bankcred" text={L('Банк кредиттері — Quralhub', 'Банковские кредиты — Quralhub')} />
    </div>
  )
}
