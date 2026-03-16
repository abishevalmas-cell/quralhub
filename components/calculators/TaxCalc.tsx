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
import { calcTax } from '@/lib/calculations/tax'
import { F } from '@/lib/constants'
import { useApp } from '@/components/layout/Providers'

export function TaxCalc() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [income, setIncome] = useState(5000000)
  const [mode, setMode] = useState<'simp' | 'self'>('simp')

  const result = income > 0 ? calcTax(income, mode) : null

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">📊 {L('ЖК салық калькуляторы', 'Калькулятор налогов ИП')} — 2026</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>Упрощёнка = 4%</InfoChip>
        <InfoChip>{L('Патент жойылды', 'Патент отменён')}</InfoChip>
        <InfoChip>{L('НДС порогы', 'Порог НДС')} = 43.25М₸</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{L('Жеке кәсіпкер салығын жаңа кодекс бойынша есептеңіз', 'Рассчитайте налоги ИП по новому кодексу')}</p>

      <div className="mb-3">
        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Режим', 'Режим')}</label>
        <select
          className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
          value={mode}
          onChange={e => setMode(e.target.value as 'simp' | 'self')}
        >
          <option value="simp">Упрощёнка (ИПН 4%)</option>
          <option value="self">{L('Самозанятый (ИПН 0%)', 'Самозанятый (ИПН 0%)')}</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Жарты жылдық табыс (₸)', 'Доход за полугодие (₸)')}</label>
        <Input
          type="text"
          inputMode="numeric"
          value={income || ''}
          onChange={e => setIncome(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
          className="text-base"
        />
      </div>

      {result && mode === 'simp' && (
        <ResultCard>
          <ResultRow label={L('Табыс (6 ай)', 'Доход (6 мес)')} value={`${F(result.income)} ₸`} />
          <ResultRow label="ИПН (4%)" value={`−${F(result.ipn)} ₸`} color="red" />
          <ResultRow label={L('ОПВ (айлық)', 'ОПВ (ежемес.)')} value={`${F(result.opvMonthly)} ₸`} />
          <ResultRow label={L('СО (айлық)', 'СО (ежемес.)')} value={`${F(result.soMonthly)} ₸`} />
          <ResultRow label={L('ВОСМС (айлық)', 'ВОСМС (ежемес.)')} value={`${F(result.vosmMonthly)} ₸`} />
          <ResultTotal label={L('Жалпы 6 айға', 'Итого за 6 мес')} value={`${F(result.total6Months)} ₸`} />
        </ResultCard>
      )}

      {result && mode === 'self' && (
        <ResultCard>
          <ResultRow label={L('Табыс', 'Доход')} value={`${F(result.income)} ₸`} />
          <ResultRow label="ИПН" value="0 ₸" color="green" />
          <ResultRow label={L('Табыс шегі (340 МРП)', 'Лимит дохода (340 МРП)')} value={`${F(result.incomeLimit!)} ₸`} />
          <ResultRow label={L('ОПВ (айлық)', 'ОПВ (ежемес.)')} value={`${F(result.opvMonthly)} ₸`} />
          <ResultRow label={L('СО (айлық)', 'СО (ежемес.)')} value={`${F(result.soMonthly)} ₸`} />
          <ResultRow label={L('ВОСМС (айлық)', 'ВОСМС (ежемес.)')} value={`${F(result.vosmMonthly)} ₸`} />
          <ResultTotal label={L('Айлық төлем', 'Ежемесячный платёж')} value={`${F(result.monthlyPayment!)} ₸`} />
        </ResultCard>
      )}

      <TipBox>
        {L(
          '2026 жылдан бастап розничный салық жойылды. Упрощёнка ЖК 4% ИПН + соц.платежтер төлейді.',
          'С 2026 года розничный налог отменён. ИП на упрощёнке платят 4% ИПН + соц.платежи.'
        )}
      </TipBox>

      <ShareBar tool="tax" text={L('ЖК салық калькуляторы — Quralhub', 'Калькулятор налогов ИП — Quralhub')} />
    </div>
  )
}
