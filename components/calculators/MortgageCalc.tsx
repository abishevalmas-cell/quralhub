'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/layout/BackButton'
import { ResultCard } from '@/components/shared/ResultCard'
import { ResultRow } from '@/components/shared/ResultRow'
import { ResultTotal } from '@/components/shared/ResultTotal'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { calcMortgage } from '@/lib/calculations/mortgage'
import { F } from '@/lib/constants'
import { useApp } from '@/components/layout/Providers'

export function MortgageCalc() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [price, setPrice] = useState(30000000)
  const [down, setDown] = useState(20)
  const [years, setYears] = useState(20)
  const [rate, setRate] = useState(18)

  const result = price > 0 && years > 0 && down < 100 ? calcMortgage(price, down, years, rate) : null

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">🏠 {L('Ипотека калькуляторы', 'Ипотечный калькулятор')}</h2>
      <p className="text-sm text-muted-foreground mb-5">{L('Отбасы банк, 7-20-25, коммерциялық ипотека — ай сайынғы төлемді есептеңіз', 'Отбасы банк, 7-20-25, коммерческая ипотека — рассчитайте ежемесячный платёж')}</p>

      <div className="mb-3">
        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Тұрғын үй бағасы (₸)', 'Стоимость жилья (₸)')}</label>
        <Input className="text-base" type="text" inputMode="numeric" value={price || ''} onChange={e => setPrice(parseInt(e.target.value.replace(/\s/g, '')) || 0)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Алғашқы жарна (%)', 'Первоначальный взнос (%)')}</label>
          <Input className="text-base" type="number" value={down} onChange={e => setDown(parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Мерзімі (жыл)', 'Срок (лет)')}</label>
          <Input className="text-base" type="number" value={years} onChange={e => setYears(parseInt(e.target.value) || 0)} />
        </div>
      </div>
      <div className="mb-3">
        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Сыйақы мөлшерлемесі', 'Процентная ставка')}</label>
        <select className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary" value={rate} onChange={e => setRate(parseFloat(e.target.value))}>
          <option value={5}>Отбасы банк — 5%</option>
          <option value={7}>7-20-25 — 7%</option>
          <option value={16}>Halyk / BCC — 16-18%</option>
          <option value={18}>{L('Коммерциялық', 'Коммерческая')} — 18%</option>
          <option value={21}>{L('Жоғары', 'Высокая')} — 21%</option>
        </select>
      </div>

      {result && (
        <ResultCard>
          <ResultRow label={L('Тұрғын үй бағасы', 'Стоимость жилья')} value={`${F(result.price)} ₸`} />
          <ResultRow label={`${L('Жарна', 'Взнос')} (${down}%)`} value={`${F(result.downPayment)} ₸`} />
          <ResultRow label={L('Несие', 'Кредит')} value={`${F(result.loan)} ₸`} />
          <ResultRow label={L('Мөлшерлеме', 'Ставка')} value={`${rate}%`} />
          <ResultTotal label={L('Ай сайын', 'Ежемесячно')} value={`${F(result.monthly)} ₸`} />
          <div className="mt-3 pt-2 border-t border-border/50">
            <ResultRow label={L('Жалпы төлем', 'Общая выплата')} value={`${F(result.total)} ₸`} />
            <ResultRow label={L('Артық төлем', 'Переплата')} value={`${F(result.overpay)} ₸`} color="red" />
          </div>
        </ResultCard>
      )}

      <ShareBar tool="mortgage" text={L('Ипотека калькуляторы — Quralhub', 'Ипотечный калькулятор — Quralhub')} />

      <TipBox>
        {L(
          'Отбасы банк — мемлекеттік бағдарлама, ең төменгі ставка 5%. 7-20-25 бағдарламасы — 7% ставка, 25% алғашқы жарна, 20 жыл мерзім.',
          'Отбасы банк — гос. программа, минимальная ставка 5%. Программа 7-20-25 — ставка 7%, первоначальный взнос 25%, срок 20 лет.'
        )}
      </TipBox>
    </div>
  )
}
