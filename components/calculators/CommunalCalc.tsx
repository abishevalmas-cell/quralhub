'use client'
import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/layout/BackButton'
import { ResultCard } from '@/components/shared/ResultCard'
import { ResultRow } from '@/components/shared/ResultRow'
import { ResultTotal } from '@/components/shared/ResultTotal'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { InfoChip } from '@/components/shared/InfoChip'
import { calcCommunal, calcAllCities, CM_TARIFFS, type UtilityKey } from '@/lib/calculations/communal'
import { F } from '@/lib/constants'
import { useApp } from '@/components/layout/Providers'

const cities = Object.keys(CM_TARIFFS)

const UTILITY_LABELS_KZ: Record<UtilityKey, string> = {
  electricity: 'Электр',
  coldWater: 'Суық су',
  hotWater: 'Ыстық су',
  gas: 'Газ',
  heating: 'Жылыту',
}
const UTILITY_LABELS_RU: Record<UtilityKey, string> = {
  electricity: 'Электр.',
  coldWater: 'Хол. вода',
  hotWater: 'Гор. вода',
  gas: 'Газ',
  heating: 'Отопление',
}

const UTILITY_COLORS: Record<UtilityKey, string> = {
  electricity: '#facc15',
  coldWater: '#38bdf8',
  hotWater: '#f97316',
  gas: '#818cf8',
  heating: '#f43f5e',
}

function barColor(ratio: number): string {
  // 0 = cheapest (green), 1 = most expensive (red)
  if (ratio < 0.33) return '#22c55e'
  if (ratio < 0.66) return '#eab308'
  return '#ef4444'
}

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

  // Comparison dashboard data
  const comparison = useMemo(() => calcAllCities(), [])
  const maxTotal = useMemo(() => Math.max(...comparison.map(c => c.total)), [comparison])
  const minTotal = useMemo(() => Math.min(...comparison.map(c => c.total)), [comparison])

  // Tariff breakdown for selected city
  const breakdown = useMemo(() => {
    const parts: { key: UtilityKey; value: number; label: string }[] = [
      { key: 'electricity', value: result.electricity, label: L('Электр', 'Электр.') },
      { key: 'coldWater', value: result.coldWater, label: L('Суық су', 'Хол. вода') },
      { key: 'hotWater', value: result.hotWater, label: L('Ыстық су', 'Гор. вода') },
      ...(gasAvailable ? [{ key: 'gas' as UtilityKey, value: result.gas, label: L('Газ', 'Газ') }] : []),
      { key: 'heating', value: result.heating, label: L('Жылыту', 'Отопление') },
    ]
    const total = parts.reduce((s, p) => s + p.value, 0) || 1
    return parts.map(p => ({ ...p, pct: Math.round((p.value / total) * 100) }))
  }, [result, gasAvailable, lang])

  const utilLabel = (key: UtilityKey) => lang === 'ru' ? UTILITY_LABELS_RU[key] : UTILITY_LABELS_KZ[key]

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">
        {L('Коммуналдық есеп', 'Расчёт коммунальных')} — 2026
      </h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>20 {L('қала', 'городов')}</InfoChip>
        <InfoChip>2026 {L('тарифтер', 'тарифы')}</InfoChip>
        <InfoChip>{L('Салыстыру', 'Сравнение')}</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        {L(
          'Қалаңыздың тарифтері бойынша коммуналдық төлемдерді есептеңіз. Төменде 20 қаланың салыстыру кестесі.',
          'Рассчитайте коммунальные платежи по тарифам вашего города. Ниже — сравнительная таблица 20 городов.'
        )}
      </p>

      {/* City selector */}
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

      {/* Consumption inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">{L('Электр (кВт*сағ)', 'Электр. (кВт*ч)')}</label>
          <Input type="text" inputMode="numeric" value={el || ''} onChange={e => setEl(parseInt(e.target.value.replace(/\s/g, '')) || 0)} className="text-sm !py-2" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">{L('Суық су (м3)', 'Хол. вода (м3)')}</label>
          <Input type="text" inputMode="numeric" value={cw || ''} onChange={e => setCw(parseInt(e.target.value.replace(/\s/g, '')) || 0)} className="text-sm !py-2" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">{L('Ыстық су (м3)', 'Гор. вода (м3)')}</label>
          <Input type="text" inputMode="numeric" value={hw || ''} onChange={e => setHw(parseInt(e.target.value.replace(/\s/g, '')) || 0)} className="text-sm !py-2" />
        </div>
        {gasAvailable && (
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">{L('Газ (м3)', 'Газ (м3)')}</label>
            <Input type="text" inputMode="numeric" value={gas || ''} onChange={e => setGas(parseInt(e.target.value.replace(/\s/g, '')) || 0)} className="text-sm !py-2" />
          </div>
        )}
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">{L('Жылыту (м2)', 'Отопление (м2)')}</label>
          <Input type="text" inputMode="numeric" value={heat || ''} onChange={e => setHeat(parseInt(e.target.value.replace(/\s/g, '')) || 0)} className="text-sm !py-2" />
        </div>
      </div>

      {/* Results */}
      <ResultCard>
        <ResultRow label={L('Электр энергиясы', 'Электричество')} value={`${F(result.electricity)} ₸`} />
        <ResultRow label={L('Суық су', 'Холодная вода')} value={`${F(result.coldWater)} ₸`} />
        <ResultRow label={L('Ыстық су', 'Горячая вода')} value={`${F(result.hotWater)} ₸`} />
        {gasAvailable && <ResultRow label={L('Газ', 'Газ')} value={`${F(result.gas)} ₸`} />}
        <ResultRow label={L('Жылыту', 'Отопление')} value={`${F(result.heating)} ₸`} />
        <ResultTotal label={L('Жалпы', 'Итого')} value={`${F(result.total)} ₸`} />
      </ResultCard>

      {/* Tariff breakdown donut-like visual */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <h3 className="text-sm font-bold mb-3">
          {L('Төлем құрылымы', 'Структура платежа')} — {city}
        </h3>
        <div className="flex items-center gap-3 mb-3">
          {/* Stacked horizontal bar as donut substitute */}
          <div className="flex-1 h-7 rounded-full overflow-hidden flex">
            {breakdown.map(b => (
              <div
                key={b.key}
                className="h-full transition-all duration-300"
                style={{
                  width: `${b.pct}%`,
                  backgroundColor: UTILITY_COLORS[b.key],
                  minWidth: b.pct > 0 ? '4px' : '0',
                }}
              />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
          {breakdown.map(b => (
            <div key={b.key} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: UTILITY_COLORS[b.key] }}
              />
              <span className="text-muted-foreground">{b.label}</span>
              <span className="font-semibold ml-auto">{b.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <TipBox>
        {L('Деректер көзі:', 'Источник данных:')} {result.source}
      </TipBox>

      {/* ====== COMPARISON DASHBOARD ====== */}
      <div className="mt-8 mb-4">
        <h3 className="text-lg font-extrabold tracking-tight mb-1">
          {L('Қалалар бойынша салыстыру', 'Сравнение по городам')}
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          {L(
            'Стандартты тұтыну: 200 кВт*сағ, 5 м3 суық, 3 м3 ыстық, 30 м3 газ, 60 м2 жылыту',
            'Стандартное потребление: 200 кВт*ч, 5 м3 хол., 3 м3 гор., 30 м3 газ, 60 м2 отопление'
          )}
        </p>

        <div className="space-y-1.5">
          {comparison.map((c, i) => {
            const range = maxTotal - minTotal || 1
            const ratio = (c.total - minTotal) / range
            const widthPct = Math.max(((c.total / maxTotal) * 100), 18)
            const isSelected = c.city === city

            return (
              <button
                key={c.city}
                onClick={() => setCity(c.city)}
                className={`w-full text-left transition-all rounded-lg p-2 ${
                  isSelected
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-card border border-border hover:border-primary/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground w-5 text-right">{i + 1}</span>
                    <span className={`text-xs font-semibold ${isSelected ? 'text-primary' : ''}`}>{c.city}</span>
                  </div>
                  <span className="text-xs font-bold tabular-nums">{F(c.total)} ₸</span>
                </div>
                {/* Bar */}
                <div className="ml-7 h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: barColor(ratio),
                    }}
                  />
                </div>
                {/* Most expensive utility note */}
                <div className="ml-7 mt-1 text-[10px] text-muted-foreground">
                  {L('Ең қымбат:', 'Дороже всего:')} {utilLabel(c.mostExpensive)}
                  {' — '}{F(c[c.mostExpensive])} ₸
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend for comparison */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground mb-6">
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ backgroundColor: '#22c55e' }} />
          {L('Арзан', 'Дёшево')}
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ backgroundColor: '#eab308' }} />
          {L('Орташа', 'Средне')}
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
          {L('Қымбат', 'Дорого')}
        </div>
      </div>

      <ShareBar tool="communal" text={L('Коммуналдық есеп — Quralhub', 'Расчёт коммунальных — Quralhub')} />
    </div>
  )
}
