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
import { calcTransport } from '@/lib/calculations/transport'
import { F, MRP } from '@/lib/constants'
import { useApp } from '@/components/layout/Providers'

export function TransportCalc() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [cc, setCc] = useState(2000)
  const [age, setAge] = useState(0)

  const result = cc > 0 ? calcTransport(cc, age) : null

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">🚗 {L('Транспорт салығы', 'Транспортный налог')} — 2026</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>МРП = {F(MRP)}₸</InfoChip>
        <InfoChip>10-20 {L('жыл', 'лет')} = ×0.7</InfoChip>
        <InfoChip>20+ {L('жыл', 'лет')} = ×0.5</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{L('Жеңіл авто көлікке жылдық салық есебі', 'Расчёт годового налога на легковой автомобиль')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Двигатель көлемі (см³)', 'Объём двигателя (см³)')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={cc || ''}
            onChange={e => setCc(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Автокөлік жасы', 'Возраст авто')}</label>
          <select
            className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
            value={age}
            onChange={e => setAge(Number(e.target.value))}
          >
            <option value={0}>0-10 {L('жыл', 'лет')} (×1.0)</option>
            <option value={10}>10-20 {L('жыл', 'лет')} (×0.7)</option>
            <option value={20}>20+ {L('жыл', 'лет')} (×0.5)</option>
          </select>
        </div>
      </div>

      {result && (
        <ResultCard>
          <ResultRow label={L('Қозғалтқыш көлемі', 'Объём двигателя')} value={`${F(result.cc)} см³`} />
          <ResultRow label={L('Ставка', 'Ставка')} value={`${result.rateMRP} МРП (${F(result.rateAmount)} ₸)`} />
          <ResultRow label={L('Коэффициент', 'Коэффициент')} value={`×${result.coefficient}`} color="blue" />
          <ResultTotal label={L('Жылдық салық', 'Годовой налог')} value={`${F(result.tax)} ₸`} />
        </ResultCard>
      )}

      <TipBox>
        {L(
          '2026 жылдан бастап 10-20 жыл аралығындағы авто коэффициенті ×0.7, 20 жылдан жоғары — ×0.5. Ескі автоға салық азайды!',
          'С 2026 года коэффициент для авто 10-20 лет — ×0.7, старше 20 лет — ×0.5. Налог на старые авто снижен!'
        )}
      </TipBox>

      <ShareBar tool="transport" text={L('Транспорт салығы калькуляторы — Quralhub', 'Калькулятор транспортного налога — Quralhub')} />
    </div>
  )
}
