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
import { calcCustoms, type Currency, type CarType } from '@/lib/calculations/customs'
import { F } from '@/lib/constants'
import { useApp } from '@/components/layout/Providers'

export function CustomsCalc() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [price, setPrice] = useState(15000)
  const [cc, setCc] = useState(2000)
  const [age, setAge] = useState<'new' | 'mid' | 'old'>('new')
  const [currency, setCurrency] = useState<Currency>('usd')
  const [carType, setCarType] = useState<CarType>('ice')

  const result = price > 0 && (carType === 'ev' || cc > 0) ? calcCustoms(price, cc, age, currency, carType) : null

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">🚢 {L('Авто растаможка', 'Растаможка авто')} — ЕАЭС</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>1 USD ≈ 510₸</InfoChip>
        <InfoChip>1 EUR ≈ 560₸</InfoChip>
        <InfoChip>ЕАЭС 2026</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{L('ЕАЭС кеден бажы, кәдеге жарату алымы, тіркеу есебі', 'Таможенная пошлина ЕАЭС, утилизационный сбор, регистрация')}</p>

      {/* Car type toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setCarType('ice')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            carType === 'ice'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-card border border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          ⛽ {L('ДВС / Гибрид', 'ДВС / Гибрид')}
        </button>
        <button
          onClick={() => setCarType('ev')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            carType === 'ev'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-card border border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          ⚡ {L('Электрокар', 'Электромобиль')}
        </button>
      </div>

      {carType === 'ev' && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30 mb-4 text-sm">
          <p className="font-semibold text-emerald-700 dark:text-emerald-300">🎉 {L('Электрокарға жеңілдіктер:', 'Льготы для электромобилей:')}</p>
          <ul className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 space-y-0.5">
            <li>• {L('Кеден бажы — 0% (2026 жыл соңына дейін)', 'Таможенная пошлина — 0% (до конца 2026)')}</li>
            <li>• {L('Утильсбор — сниженный', 'Утильсбор — сниженный')}</li>
            <li>• {L('Транспорт салығы — босатылған', 'Транспортный налог — освобождение')}</li>
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Валюта', 'Валюта')}</label>
          <select
            className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
            value={currency}
            onChange={e => setCurrency(e.target.value as Currency)}
          >
            <option value="usd">USD ($)</option>
            <option value="eur">EUR (€)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Бағасы', 'Цена')} ({currency === 'usd' ? '$' : '€'})</label>
          <Input
            type="text"
            inputMode="numeric"
            value={price || ''}
            onChange={e => setPrice(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
      </div>

      {carType === 'ice' && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Двигатель (см³)', 'Двигатель (см³)')}</label>
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
              onChange={e => setAge(e.target.value as 'new' | 'mid' | 'old')}
            >
              <option value="new">{L('0-3 жыл (жаңа)', '0-3 года (новый)')}</option>
              <option value="mid">{L('3-5 жыл', '3-5 лет')}</option>
              <option value="old">{L('5+ жыл (ескі)', '5+ лет (старый)')}</option>
            </select>
          </div>
        </div>
      )}

      {result && (
        <ResultCard>
          <ResultRow label={L('Бағасы теңгемен', 'Цена в тенге')} value={`${F(result.priceKzt)} ₸`} />
          <ResultRow
            label={L('Кедендік баж', 'Таможенная пошлина')}
            value={result.evDiscount ? `${F(result.duty)} ₸ ✅` : `${F(result.duty)} ₸`}
            color={result.evDiscount ? 'green' : undefined}
          />
          <ResultRow label={L('Кәдеге жарату алымы', 'Утилизационный сбор')} value={`${F(result.utilization)} ₸`} />
          <ResultRow label={L('Тіркеу', 'Регистрация')} value={`${F(result.registration)} ₸`} />
          <ResultTotal label={L('Барлық шығын', 'Общие расходы')} value={`${F(result.total)} ₸`} />
        </ResultCard>
      )}

      <div className="p-4 rounded-xl bg-muted/50 border border-border/50 mb-4 text-sm leading-relaxed text-muted-foreground">
        <p>{L('Кеден бажы ЕАЭС ережелері бойынша есептеледі. Электрокарлар 2026 жыл соңына дейін кеден бажынан босатылған (ҚР Үкіметінің қаулысы). Утильсбор: ДВС ≤3000 см³ — 413 000₸, >3000 см³ — 620 000₸, электрокарлар — 216 250₸.', 'Пошлина рассчитывается по правилам ЕАЭС. Электромобили освобождены от таможенной пошлины до конца 2026 года (Постановление Правительства РК). Утильсбор: ДВС ≤3000 см³ — 413 000₸, >3000 см³ — 620 000₸, электромобили — 216 250₸.')}</p>
      </div>

      <TipBox>
        {L(
          'Есеп шамамен берілген. Нақты сома кедендік құнға, валюта курсына және қосымша алымдарға байланысты. Электрокарлар — 2026 жылы ең тиімді таңдау!',
          'Расчёт приблизительный. Точная сумма зависит от таможенной стоимости, курса валют и доп. сборов. Электромобили — самый выгодный выбор в 2026!'
        )}
      </TipBox>

      <ShareBar tool="customs" text={L('Авто растаможка калькуляторы — Quralhub', 'Калькулятор растаможки авто — Quralhub')} />
    </div>
  )
}
