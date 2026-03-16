'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/layout/BackButton'
import { ResultCard } from '@/components/shared/ResultCard'
import { ResultRow } from '@/components/shared/ResultRow'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { InfoChip } from '@/components/shared/InfoChip'
import { MRP, F } from '@/lib/constants'
import { useApp } from '@/components/layout/Providers'

export function MrpCalc() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [mrpCount, setMrpCount] = useState(100)
  const tenge = Math.round(mrpCount * MRP)

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">🔢 {L('МРП ↔ Тенге конвертер', 'Конвертер МРП ↔ Тенге')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>1 МРП = {F(MRP)}₸ (2026)</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{L('МРП-ны тенгеге және тенгені МРП-ға конверттеу. Штрафтар, мемлекеттік баж, пособиелер есебі үшін.', 'Конвертация МРП в тенге и обратно. Для расчёта штрафов, госпошлин, пособий.')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('МРП саны', 'Количество МРП')}</label>
          <Input type="number" value={mrpCount || ''} onChange={e => setMrpCount(parseFloat(e.target.value) || 0)} inputMode="numeric" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Тенге сомасы', 'Сумма в тенге')}</label>
          <Input type="text" value={`${F(tenge)} ₸`} readOnly className="bg-muted" />
        </div>
      </div>

      {mrpCount > 0 && (
        <ResultCard>
          <ResultRow label={`${mrpCount} МРП`} value={`${F(tenge)} ₸`} color="green" />
          <ResultRow label={L('Штраф 5 МРП', 'Штраф 5 МРП')} value={`${F(5 * MRP)} ₸`} />
          <ResultRow label="Вычет 30 МРП" value={`${F(30 * MRP)} ₸`} />
          <ResultRow label={L('НДС порогы 10 000 МРП', 'Порог НДС 10 000 МРП')} value={`${F(10000 * MRP)} ₸`} />
          <ResultRow label={L('Прогрессивті ИПН 8 500 МРП', 'Прогрессивный ИПН 8 500 МРП')} value={`${F(8500 * MRP)} ₸`} />
        </ResultCard>
      )}

      <TipBox>
        {L(
          'МРП 2026 жылы 4 325₸ (2025 жылы 3 932₸ болған, +10%). Барлық штрафтар, мемлекеттік бажылар, вычеттер осы көрсеткіш бойынша есептеледі.',
          'МРП в 2026 году — 4 325₸ (в 2025 было 3 932₸, +10%). Все штрафы, госпошлины, вычеты рассчитываются по этому показателю.'
        )}
      </TipBox>

      <ShareBar tool="mrp" text={L('МРП конвертер — Quralhub', 'Конвертер МРП — Quralhub')} />
    </div>
  )
}
