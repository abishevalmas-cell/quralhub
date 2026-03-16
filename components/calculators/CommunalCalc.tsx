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
import { calcCommunal, CM_TARIFFS } from '@/lib/calculations/communal'
import { F } from '@/lib/constants'
import { useApp } from '@/components/layout/Providers'

const cities = Object.keys(CM_TARIFFS)

export function CommunalCalc() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [city, setCity] = useState('Алматы')
  const [el, setEl] = useState(200)
  const [cw, setCw] = useState(5)
  const [hw, setHw] = useState(3)
  const [gas, setGas] = useState(30)
  const [heat, setHeat] = useState(60)

  const tariff = CM_TARIFFS[city]
  const gasAvailable = tariff?.gas !== null
  const result = calcCommunal(city, el, cw, hw, gasAvailable ? gas : 0, heat)

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">💡 {L('Коммуналдық есеп', 'Расчёт коммунальных')} — 2026</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>8 {L('қала', 'городов')}</InfoChip>
        <InfoChip>2026 {L('тарифтер', 'тарифы')}</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{L('Қалаңыздың тарифтері бойынша коммуналдық төлемдерді есептеңіз', 'Рассчитайте коммунальные платежи по тарифам вашего города')}</p>

      <div className="mb-3">
        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Қала', 'Город')}</label>
        <select
          className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
          value={city}
          onChange={e => setCity(e.target.value)}
        >
          {cities.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Электр (кВт·сағ)', 'Электричество (кВт·ч)')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={el || ''}
            onChange={e => setEl(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Суық су (м³)', 'Холодная вода (м³)')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={cw || ''}
            onChange={e => setCw(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Ыстық су (м³)', 'Горячая вода (м³)')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={hw || ''}
            onChange={e => setHw(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
        {gasAvailable && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Газ (м³)', 'Газ (м³)')}</label>
            <Input
              type="text"
              inputMode="numeric"
              value={gas || ''}
              onChange={e => setGas(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
              className="text-base"
            />
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Жылыту (м²)', 'Отопление (м²)')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={heat || ''}
            onChange={e => setHeat(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
      </div>

      <ResultCard>
        <ResultRow label={L('Электр энергиясы', 'Электричество')} value={`${F(result.electricity)} ₸`} />
        <ResultRow label={L('Суық су', 'Холодная вода')} value={`${F(result.coldWater)} ₸`} />
        <ResultRow label={L('Ыстық су', 'Горячая вода')} value={`${F(result.hotWater)} ₸`} />
        {gasAvailable && <ResultRow label={L('Газ', 'Газ')} value={`${F(result.gas)} ₸`} />}
        <ResultRow label={L('Жылыту', 'Отопление')} value={`${F(result.heating)} ₸`} />
        <ResultTotal label={L('Жалпы', 'Итого')} value={`${F(result.total)} ₸`} />
      </ResultCard>

      <TipBox>
        {L('Деректер көзі:', 'Источник данных:')} {result.source}
      </TipBox>

      <ShareBar tool="communal" text={L('Коммуналдық есеп — Quralhub', 'Расчёт коммунальных — Quralhub')} />
    </div>
  )
}
