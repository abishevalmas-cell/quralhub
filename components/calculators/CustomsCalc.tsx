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
import { calcCustoms } from '@/lib/calculations/customs'
import { F } from '@/lib/constants'
import { useApp } from '@/components/layout/Providers'

export function CustomsCalc() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [price, setPrice] = useState(10000)
  const [cc, setCc] = useState(2000)
  const [age, setAge] = useState<'new' | 'mid' | 'old'>('new')

  const result = price > 0 && cc > 0 ? calcCustoms(price, cc, age) : null

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">🚢 {L('Авто растаможка', 'Растаможка авто')} — ЕАЭС</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>1 EUR = 560₸</InfoChip>
        <InfoChip>ЕАЭС 2026</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{L('ЕАЭС кеден бажы, кәдеге жарату алымы, тіркеу есебі', 'Таможенная пошлина ЕАЭС, утилизационный сбор, регистрация')}</p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Бағасы (€)', 'Цена (€)')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={price || ''}
            onChange={e => setPrice(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
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
      </div>

      <div className="mb-3">
        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Автокөлік жасы', 'Возраст авто')}</label>
        <select
          className="w-full px-3 py-3 bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
          value={age}
          onChange={e => setAge(e.target.value as 'new' | 'mid' | 'old')}
        >
          <option value="new">{L('0-3 жыл (жаңа)', '0-3 года (новый)')}</option>
          <option value="mid">{L('3-5 жыл', '3-5 лет')}</option>
          <option value="old">{L('5+ жыл (ескі)', '5+ лет (старый)')}</option>
        </select>
      </div>

      {result && (
        <ResultCard>
          <ResultRow label={L('Кедендік баж', 'Таможенная пошлина')} value={`${F(result.duty)} ₸`} />
          <ResultRow label={L('Кәдеге жарату алымы', 'Утилизационный сбор')} value={`${F(result.utilization)} ₸`} />
          <ResultRow label={L('Тіркеу', 'Регистрация')} value={`${F(result.registration)} ₸`} />
          <ResultTotal label={L('Барлық шығын', 'Общие расходы')} value={`${F(result.total)} ₸`} />
        </ResultCard>
      )}

      <TipBox>
        {L(
          'Есеп шамамен берілген. Нақты сома кедендік құнға, EUR курсына және қосымша алымдарға байланысты өзгеруі мүмкін.',
          'Расчёт приблизительный. Точная сумма зависит от таможенной стоимости, курса EUR и дополнительных сборов.'
        )}
      </TipBox>

      <ShareBar tool="customs" text={L('Авто растаможка калькуляторы — Quralhub', 'Калькулятор растаможки авто — Quralhub')} />
    </div>
  )
}
