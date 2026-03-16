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
import { calcSelfEmployed } from '@/lib/calculations/selfemployed'
import { F } from '@/lib/constants'
import { useApp } from '@/components/layout/Providers'

export function SelfemployedCalc() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [income, setIncome] = useState(500000)

  const result = income > 0 ? calcSelfEmployed(income) : null

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">👤 {L('Самозанятый калькулятор', 'Калькулятор самозанятого')} — 2026</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>ИПН = 0%</InfoChip>
        <InfoChip>{L('Тек соц.платежтер', 'Только соц.платежи')}</InfoChip>
        <InfoChip>{L('Шек', 'Лимит')} = 340 МРП/{L('ай', 'мес')}</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{L('Самозанятый табысыңыздан соц.платежтерді есептеңіз', 'Рассчитайте соц.платежи с дохода самозанятого')}</p>

      <div className="mb-3">
        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Ай сайынғы табыс (₸)', 'Ежемесячный доход (₸)')}</label>
        <Input
          type="text"
          inputMode="numeric"
          value={income || ''}
          onChange={e => setIncome(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
          className="text-base"
        />
      </div>

      {result && (
        <ResultCard>
          <ResultRow label={L('Табыс', 'Доход')} value={`${F(result.income)} ₸`} />
          <ResultRow label="ИПН" value="0 ₸" color="green" />
          <ResultRow label="ОПВ (10%)" value={`−${F(result.opv)} ₸`} color="red" />
          <ResultRow label="СО (5%)" value={`−${F(result.so)} ₸`} color="red" />
          <ResultRow label="ВОСМС" value={`−${F(result.vosm)} ₸`} color="red" />
          <ResultTotal label={L('Қолда қалады', 'Остаётся на руках')} value={`${F(result.netIncome)} ₸`} />

          {result.overLimit && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
              {L(
                `Табыс шегінен (${F(result.limit)} ₸) асып кетті! Самозанятый режимі қолданылмайды.`,
                `Превышен лимит дохода (${F(result.limit)} ₸)! Режим самозанятого не применяется.`
              )}
            </div>
          )}
        </ResultCard>
      )}

      <TipBox>
        {L(
          'Самозанятый ИПН 0% төлейді, бірақ ОПВ, СО, ВОСМС міндетті. Айлық табыс 340 МРП-дан аспауы керек.',
          'Самозанятый платит ИПН 0%, но ОПВ, СО, ВОСМС обязательны. Ежемесячный доход не должен превышать 340 МРП.'
        )}
      </TipBox>

      <ShareBar tool="selfemployed" text={L('Самозанятый калькулятор — Quralhub', 'Калькулятор самозанятого — Quralhub')} />
    </div>
  )
}
