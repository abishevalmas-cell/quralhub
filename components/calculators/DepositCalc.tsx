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
import { calcDeposit } from '@/lib/calculations/deposit'
import { F } from '@/lib/constants'
import { useApp } from '@/components/layout/Providers'

export function DepositCalc() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [amount, setAmount] = useState(1000000)
  const [months, setMonths] = useState(12)
  const [rate, setRate] = useState(14)

  const result = amount > 0 && months > 0 && rate > 0 ? calcDeposit(amount, months, rate) : null

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">🏦 {L('Депозит калькуляторы', 'Калькулятор депозита')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>{L('Қарапайым есеп', 'Простой расчёт')}</InfoChip>
        <InfoChip>2026</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{L('Депозиттен түсетін пайданы есептеңіз', 'Рассчитайте доход от депозита')}</p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
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
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Мерзім (ай)', 'Срок (мес)')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={months || ''}
            onChange={e => setMonths(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Ставка (%)', 'Ставка (%)')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={rate || ''}
            onChange={e => setRate(parseFloat(e.target.value) || 0)}
            className="text-base"
          />
        </div>
      </div>

      {result && (
        <ResultCard>
          <ResultRow label={L('Салым сомасы', 'Сумма вклада')} value={`${F(result.amount)} ₸`} />
          <ResultRow label={L('Мерзім', 'Срок')} value={`${result.months} ${L('ай', 'мес')}`} />
          <ResultRow label={L('Ставка', 'Ставка')} value={`${result.rate}%`} />
          <ResultRow label={L('Табыс', 'Доход')} value={`+${F(result.profit)} ₸`} color="green" />
          <ResultTotal label={L('Жалпы сома', 'Общая сумма')} value={`${F(result.total)} ₸`} />
        </ResultCard>
      )}

      <TipBox>
        {L(
          'Бұл қарапайым есеп. Нақты пайда банк шарттарына, капитализацияға және салық ұсталымына байланысты өзгеруі мүмкін.',
          'Это простой расчёт. Фактический доход зависит от условий банка, капитализации и налоговых удержаний.'
        )}
      </TipBox>

      <ShareBar tool="bankdep" text={L('Депозит калькуляторы — Quralhub', 'Калькулятор депозита — Quralhub')} />
    </div>
  )
}
