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
  CITY_LIST,
  getOfficesForCity,
  type CurrencyKey,
  CURRENCY_KEYS,
} from '@/lib/data/exchangeOffices'

const DEFAULT_RATES: Record<string, number> = {
  usd: NB_RATES.usd,
  eur: NB_RATES.eur,
  rub: NB_RATES.rub,
  cny: NB_RATES.cny,
}

const CURRENCY_LABELS: Record<string, string> = {
  usd: 'USD — АҚШ доллары',
  eur: 'EUR — Еуро',
  rub: 'RUB — Ресей рублі',
  cny: 'CNY — Қытай юані',
}

const CURRENCY_FLAGS: Record<string, string> = {
  usd: '\u{1F1FA}\u{1F1F8}',
  eur: '\u{1F1EA}\u{1F1FA}',
  rub: '\u{1F1F7}\u{1F1FA}',
  cny: '\u{1F1E8}\u{1F1F3}',
}

export function CurrencyConverter() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [amount, setAmount] = useState(100)
  const [currency, setCurrency] = useState<CurrencyKey>('usd')
  const [city, setCity] = useState<string>('Алматы')
  const [rates, setRates] = useState<Record<string, number>>(DEFAULT_RATES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/data.json')
      .then(r => r.json())
      .then(data => {
        if (data.rates) {
          setRates({
            usd: data.rates.usd ?? DEFAULT_RATES.usd,
            eur: data.rates.eur ?? DEFAULT_RATES.eur,
            rub: data.rates.rub ?? DEFAULT_RATES.rub,
            cny: data.rates.cny ?? DEFAULT_RATES.cny,
          })
        }
      })
      .catch(() => {
        // use defaults
      })
      .finally(() => setLoading(false))
  }, [])

  const rate = rates[currency] || 1
  const kztResult = amount * rate
  const otherCurrencies = Object.keys(rates).filter(c => c !== currency)

  // Exchange offices for selected city
  const offices = useMemo(() => {
    const cityOffices = getOfficesForCity(city)
    const cur = currency as CurrencyKey
    const sorted = [...cityOffices]
      .filter(o => o[cur])
      .sort((a, b) => b[cur].buy - a[cur].buy)
    return sorted
  }, [city, currency])

  const bestBuy = offices.length ? offices[0][currency as CurrencyKey].buy : 0
  const bestSell = offices.length
    ? Math.min(...offices.map(o => o[currency as CurrencyKey].sell))
    : 0

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">{L('💱 Валюта конвертер', '💱 Конвертер валют')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>{L('НБ РК курсы', 'Курс НБ РК')}</InfoChip>
        <InfoChip>{L('Обменник салыстыру', 'Сравнение обменников')}</InfoChip>
        <InfoChip>{L('3 қала', '3 города')}</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        {L('Ұлттық Банк курсы бойынша валюта айырбастау + обменниктер салыстыруы', 'Конвертация валют по курсу Нацбанка + сравнение обменников')}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Сома', 'Сумма')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={amount || ''}
            onChange={e => setAmount(parseFloat(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Валюта', 'Валюта')}</label>
          <select
            className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
            value={currency}
            onChange={e => setCurrency(e.target.value as CurrencyKey)}
          >
            {CURRENCY_KEYS.map(c => (
              <option key={c} value={c}>
                {CURRENCY_FLAGS[c]} {c.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* City selector */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Қала', 'Город')}</label>
        <div className="flex gap-2 flex-wrap">
          {CITY_LIST.map(c => (
            <button
              key={c}
              onClick={() => setCity(c)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                city === c
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground animate-pulse mb-4">{L('Курстар жүктелуде...', 'Загрузка курсов...')}</p>
      )}

      {amount > 0 && (
        <ResultCard>
          <ResultRow
            label={`${L('НБ РК курсы', 'Курс НБ РК')} (1 ${currency.toUpperCase()})`}
            value={`${F(rate)} ₸`}
            color="blue"
          />
          <ResultTotal
            label={`${F(amount)} ${currency.toUpperCase()} =`}
            value={`${F(kztResult)} ₸`}
          />

          <div className="mt-4 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2 font-semibold">{L('Кросс-конверсия', 'Кросс-конверсия')}:</p>
            {otherCurrencies.map(c => {
              const crossRate = rates[c]
              const crossValue = kztResult / crossRate
              return (
                <ResultRow
                  key={c}
                  label={`${CURRENCY_FLAGS[c]} ${c.toUpperCase()}`}
                  value={`${crossValue.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
              )
            })}
          </div>
        </ResultCard>
      )}

      {/* Exchange offices comparison */}
      {amount > 0 && offices.length > 0 && (
        <div className="mt-4">
          <div className="text-sm text-muted-foreground mb-2">
            {L('НБ РК курсы', 'Курс НБ РК')}: <span className="font-bold text-foreground">{NB_RATES[currency]} ₸/{currency.toUpperCase()}</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-[13px] text-amber-800 dark:text-amber-200 leading-relaxed border border-amber-200/30 dark:border-amber-800/30 mb-3">
            <span className="font-semibold">{L('Ескерту', 'Примечание')}:</span> {L('Курстар шамамен көрсетілген. Нақты курс обменниктерден өзгеше болуы мүмкін.', 'Курсы приблизительные. Реальный курс может отличаться.')}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-card">
                  <th className="text-left p-3 border border-border font-semibold text-muted-foreground">{L('Обменник', 'Обменник')}</th>
                  <th className="text-right p-3 border border-border font-semibold text-muted-foreground">{L('Сатып алады', 'Покупка')}</th>
                  <th className="text-right p-3 border border-border font-semibold text-muted-foreground">{L('Сатады', 'Продажа')}</th>
                  <th className="text-right p-3 border border-border font-semibold text-muted-foreground">{L('Сомаңыз', 'Ваша сумма')}</th>
                </tr>
              </thead>
              <tbody>
                {offices.map(o => {
                  const r = o[currency as CurrencyKey]
                  const isBestBuy = r.buy === bestBuy
                  const isBestSell = r.sell === bestSell
                  return (
                    <tr key={o.name} className="hover:bg-accent/30 transition-colors">
                      <td className="p-3 border border-border font-semibold">{o.name}</td>
                      <td className={`p-3 border border-border text-right font-bold ${isBestBuy ? 'text-green-600 dark:text-green-400' : ''}`}>
                        {r.buy}
                      </td>
                      <td className={`p-3 border border-border text-right font-bold ${isBestSell ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                        {r.sell}
                      </td>
                      <td className="p-3 border border-border text-right">
                        {F(Math.round(amount * r.buy))} ₸
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 mt-2 text-[11px] text-muted-foreground">
            <span className="text-green-600 dark:text-green-400">{L('● Ең жоғары сатып алу', '● Лучшая покупка')}</span>
            <span className="text-blue-600 dark:text-blue-400">{L('● Ең арзан сату', '● Лучшая продажа')}</span>
          </div>
        </div>
      )}

      {/* All rates table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-card">
              <th className="text-left p-3 border border-border rounded-tl-xl font-semibold text-muted-foreground">{L('Валюта', 'Валюта')}</th>
              <th className="text-right p-3 border border-border font-semibold text-muted-foreground">1 {L('бірлік', 'ед.')} = ₸</th>
              <th className="text-right p-3 border border-border rounded-tr-xl font-semibold text-muted-foreground">1000 ₸ =</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(rates).map(([c, r]) => (
              <tr key={c} className="hover:bg-accent/30 transition-colors">
                <td className="p-3 border border-border font-semibold">
                  {CURRENCY_FLAGS[c]} {c.toUpperCase()}
                </td>
                <td className="p-3 border border-border text-right font-bold">
                  {F(r)} ₸
                </td>
                <td className="p-3 border border-border text-right">
                  {(1000 / r).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {c.toUpperCase()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TipBox>
        {L('Курстар НБ РК деректері негізінде көрсетілген. Обменниктердегі курс айырмашылығы 2-5 теңгеге дейін болуы мүмкін.', 'Курсы показаны на основе данных НБ РК. Разница курсов в обменниках может составлять 2-5 тенге.')}
      </TipBox>

      <ShareBar tool="currency" text={L('Валюта конвертер — Quralhub', 'Конвертер валют — Quralhub')} />
    </div>
  )
}
