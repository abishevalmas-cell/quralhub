'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/layout/BackButton'
import { ResultCard } from '@/components/shared/ResultCard'
import { ResultRow } from '@/components/shared/ResultRow'
import { ResultTotal } from '@/components/shared/ResultTotal'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { InfoChip } from '@/components/shared/InfoChip'
import { calcKaspi } from '@/lib/calculations/kaspi'
import { F } from '@/lib/constants'
import { useApp } from '@/components/layout/Providers'

export function KaspiCalc() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [price, setPrice] = useState(200000)
  const [months, setMonths] = useState(6)

  const result = price > 0 ? calcKaspi(price, months) : null

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">💳 {L('Kaspi Red калькулятор', 'Калькулятор Kaspi Red')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>3-12 {L('ай', 'мес')} = 0%</InfoChip>
        <InfoChip>24 {L('ай', 'мес')} = 24%</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{L('Kaspi Red бөліп төлеу сомасын есептеңіз', 'Рассчитайте сумму рассрочки Kaspi Red')}</p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Тауар бағасы (₸)', 'Цена товара (₸)')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={price || ''}
            onChange={e => setPrice(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Бөліп төлеу мерзімі', 'Срок рассрочки')}</label>
          <select
            className="w-full px-3 py-3 bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
            value={months}
            onChange={e => setMonths(parseInt(e.target.value))}
          >
            <option value={3}>{L('3 ай (0%)', '3 мес (0%)')}</option>
            <option value={6}>{L('6 ай (0%)', '6 мес (0%)')}</option>
            <option value={12}>{L('12 ай (0%)', '12 мес (0%)')}</option>
            <option value={24}>{L('24 ай', '24 мес')}</option>
          </select>
        </div>
      </div>

      {result && (
        <ResultCard>
          <ResultRow label={L('Тауар бағасы', 'Цена товара')} value={`${F(result.price)} ₸`} />
          <ResultRow label={L('Мерзімі', 'Срок')} value={`${result.months} ${L('ай', 'мес')}`} />
          <ResultRow label={L('Артық төлем', 'Переплата')} value={`${F(result.overpay)} ₸`} color={result.overpay > 0 ? 'red' : 'green'} />
          <ResultTotal label={L('Айлық төлем', 'Ежемесячный платёж')} value={`${F(result.monthly)} ₸`} />
        </ResultCard>
      )}

      <TipBox>
        {L(
          'Kaspi Red 3-12 ай мерзімге пайызсыз бөліп төлеу. 24 айға сыйақы қосылады.',
          'Kaspi Red — беспроцентная рассрочка на 3-12 месяцев. На 24 месяца начисляется вознаграждение.'
        )}
      </TipBox>

      <ShareBar tool="kaspi" text={L('Kaspi Red калькулятор — Quralhub', 'Калькулятор Kaspi Red — Quralhub')} />
    </div>
  )
}
