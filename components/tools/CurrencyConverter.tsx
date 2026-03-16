'use client'
import { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/layout/BackButton'
import { ResultCard } from '@/components/shared/ResultCard'
import { ResultRow } from '@/components/shared/ResultRow'
import { ResultTotal } from '@/components/shared/ResultTotal'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { InfoChip } from '@/components/shared/InfoChip'
import { useApp } from '@/components/layout/Providers'
import { F } from '@/lib/constants'
import {
  NB_RATES,
  ALL_CITIES,
  CURRENCY_LABELS,
  ALL_CURRENCIES,
  type CurrencyKey,
  type ExchangeOffice,
} from '@/lib/data/exchangeOffices'

type ConvertCurrency = CurrencyKey | 'kzt'

export function CurrencyConverter() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [amount, setAmount] = useState(100)
  const [fromCur, setFromCur] = useState<ConvertCurrency>('usd')
  const [toCur, setToCur] = useState<ConvertCurrency>('kzt')
  const [city, setCity] = useState<string>('Алматы')
  const [showAllCities, setShowAllCities] = useState(false)
  const [rates, setRates] = useState<Record<string, number>>({ ...NB_RATES })
  const [offices, setOffices] = useState<Record<string, ExchangeOffice[]>>({})
  const [loading, setLoading] = useState(true)
  const [updated, setUpdated] = useState('')

  // Load data.json
  useEffect(() => {
    fetch('/data.json')
      .then(r => r.json())
      .then(data => {
        if (data.rates) {
          setRates({
            usd: data.rates.usd ?? NB_RATES.usd,
            eur: data.rates.eur ?? NB_RATES.eur,
            rub: data.rates.rub ?? NB_RATES.rub,
            cny: data.rates.cny ?? NB_RATES.cny,
          })
        }
        if (data.exchangeOffices) {
          setOffices(data.exchangeOffices)
        }
        if (data.updatedAt) {
          const d = new Date(data.updatedAt)
          setUpdated(d.toLocaleDateString('ru-RU'))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Convert
  const convert = (amt: number, from: ConvertCurrency, to: ConvertCurrency): number => {
    if (from === to) return amt
    // Convert to KZT first
    const inKzt = from === 'kzt' ? amt : amt * (rates[from] || 1)
    // Then from KZT to target
    return to === 'kzt' ? inKzt : inKzt / (rates[to] || 1)
  }

  const result = amount > 0 ? convert(amount, fromCur, toCur) : 0
  const rateDisplay = fromCur === 'kzt'
    ? toCur === 'kzt' ? 1 : 1 / (rates[toCur] || 1)
    : toCur === 'kzt'
      ? rates[fromCur] || 1
      : (rates[fromCur] || 1) / (rates[toCur] || 1)

  // Swap
  const swap = () => {
    setFromCur(toCur)
    setToCur(fromCur)
  }

  // City offices from live data
  const cityOffices = useMemo(() => {
    const live = offices[city] || []
    return live.sort((a: ExchangeOffice, b: ExchangeOffice) => {
      const cur = fromCur === 'kzt' ? (toCur as CurrencyKey) : (fromCur as CurrencyKey)
      if (!cur || cur === 'kzt' as string) return 0
      const aRate = a[cur]?.buy || 0
      const bRate = b[cur]?.buy || 0
      return bRate - aRate
    })
  }, [city, offices, fromCur, toCur])

  const activeCur: CurrencyKey | null = fromCur !== 'kzt' ? fromCur as CurrencyKey : toCur !== 'kzt' ? toCur as CurrencyKey : null

  // Visible cities
  const TOP_CITIES = ['Алматы', 'Астана', 'Шымкент']
  const visibleCities = showAllCities ? ALL_CITIES : TOP_CITIES

  const curLabel = (c: string) => {
    const info = CURRENCY_LABELS[c]
    return info ? `${info.flag} ${c.toUpperCase()}` : c.toUpperCase()
  }

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">{L('💱 Валюта конвертер', '💱 Конвертер валют')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>{L('НБ РК курсы', 'Курс НБ РК')}</InfoChip>
        <InfoChip>{ALL_CITIES.length} {L('қала', 'городов')}</InfoChip>
        {updated && <InfoChip>{updated}</InfoChip>}
      </div>

      {/* From / Swap / To */}
      <div className="flex items-end gap-2 mb-3">
        <div className="flex-1">
          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">{L('Неден', 'Из')}</label>
          <select
            className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
            value={fromCur}
            onChange={e => setFromCur(e.target.value as ConvertCurrency)}
          >
            {ALL_CURRENCIES.map(c => (
              <option key={c} value={c}>{curLabel(c)}</option>
            ))}
          </select>
        </div>
        <button
          onClick={swap}
          className="h-[44px] w-[44px] rounded-xl border border-border bg-card flex items-center justify-center text-lg text-muted-foreground hover:text-primary hover:border-primary transition-colors flex-shrink-0"
        >
          ⇄
        </button>
        <div className="flex-1">
          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">{L('Неге', 'В')}</label>
          <select
            className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
            value={toCur}
            onChange={e => setToCur(e.target.value as ConvertCurrency)}
          >
            {ALL_CURRENCIES.map(c => (
              <option key={c} value={c}>{curLabel(c)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Amount */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Сома', 'Сумма')}</label>
        <Input
          type="text"
          inputMode="numeric"
          value={amount || ''}
          onChange={e => setAmount(parseFloat(e.target.value.replace(/\s/g, '')) || 0)}
          className="text-base"
        />
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground animate-pulse mb-4">{L('Курстар жүктелуде...', 'Загрузка курсов...')}</p>
      )}

      {/* Result */}
      {amount > 0 && (
        <ResultCard>
          <ResultRow
            label={`1 ${fromCur.toUpperCase()} = `}
            value={`${rateDisplay.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${toCur.toUpperCase()}`}
            color="blue"
          />
          <ResultTotal
            label={`${F(amount)} ${fromCur.toUpperCase()} =`}
            value={`${result.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${toCur.toUpperCase()}`}
          />
        </ResultCard>
      )}

      {/* City selector */}
      {activeCur && (
        <div className="mt-4 mb-3">
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">{L('Қала — обменниктер', 'Город — обменники')}</label>
          <div className="flex gap-1.5 flex-wrap">
            {visibleCities.map(c => (
              <button
                key={c}
                onClick={() => setCity(c)}
                className={`text-[11px] px-3 py-1.5 rounded-full font-semibold transition-all ${
                  city === c
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border text-muted-foreground hover:border-primary hover:text-primary'
                }`}
              >
                {c}
              </button>
            ))}
            {!showAllCities && (
              <button
                onClick={() => setShowAllCities(true)}
                className="text-[11px] px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-primary transition-colors"
              >
                {L(`+${ALL_CITIES.length - 3} қала`, `+${ALL_CITIES.length - 3} городов`)} ▼
              </button>
            )}
            {showAllCities && (
              <button
                onClick={() => setShowAllCities(false)}
                className="text-[11px] px-3 py-1.5 rounded-full text-muted-foreground hover:text-primary transition-colors"
              >
                {L('Жасыру', 'Свернуть')} ▲
              </button>
            )}
          </div>
        </div>
      )}

      {/* Exchange offices */}
      {activeCur && cityOffices.length > 0 && (
        <div className="mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-card">
                  <th className="text-left p-2.5 border border-border font-semibold text-muted-foreground">{L('Обменник', 'Обменник')}</th>
                  <th className="text-right p-2.5 border border-border font-semibold text-muted-foreground">{L('Сатып алады', 'Покупка')}</th>
                  <th className="text-right p-2.5 border border-border font-semibold text-muted-foreground">{L('Сатады', 'Продажа')}</th>
                </tr>
              </thead>
              <tbody>
                {cityOffices.slice(0, 6).map((o: ExchangeOffice, i: number) => {
                  const r = o[activeCur]
                  if (!r) return null
                  return (
                    <tr key={i} className="hover:bg-accent/30 transition-colors">
                      <td className="p-2.5 border border-border font-semibold">{o.name}</td>
                      <td className={`p-2.5 border border-border text-right font-bold ${i === 0 ? 'text-green-600 dark:text-green-400' : ''}`}>
                        {r.buy}
                      </td>
                      <td className="p-2.5 border border-border text-right font-bold">
                        {r.sell}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground">
            <span className="text-green-600 dark:text-green-400">{L('● Ең жоғары сатып алу', '● Лучшая покупка')}</span>
          </div>
        </div>
      )}

      {activeCur && cityOffices.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground mb-4">{L('Бұл қалада обменник деректері жоқ', 'Нет данных обменников для этого города')}</p>
      )}

      {/* All rates summary */}
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-card">
              <th className="text-left p-2.5 border border-border font-semibold text-muted-foreground">{L('Валюта', 'Валюта')}</th>
              <th className="text-right p-2.5 border border-border font-semibold text-muted-foreground">= ₸</th>
              <th className="text-right p-2.5 border border-border font-semibold text-muted-foreground">1000₸ =</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(rates).map(([c, r]) => (
              <tr key={c} className="hover:bg-accent/30 transition-colors">
                <td className="p-2.5 border border-border font-semibold">
                  {CURRENCY_LABELS[c]?.flag} {c.toUpperCase()}
                </td>
                <td className="p-2.5 border border-border text-right font-bold">
                  {r < 10 ? r.toFixed(2) : F(Math.round(r))} ₸
                </td>
                <td className="p-2.5 border border-border text-right">
                  {(1000 / r).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {c.toUpperCase()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TipBox>
        {L('Курстар НБ РК деректері негізінде автоматты жаңартылады. Обменниктердегі курс 2-5₸ айырмашылық болуы мүмкін.', 'Курсы обновляются автоматически по данным НБ РК. Разница в обменниках может составлять 2-5₸.')}
      </TipBox>

      <ShareBar tool="currency" text={L('Валюта конвертер — Quralhub', 'Конвертер валют — Quralhub')} />
    </div>
  )
}
