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
import { calcVat } from '@/lib/calculations/vat'
import { F } from '@/lib/constants'
import { useApp } from '@/components/layout/Providers'

export function VatCalc() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [amount, setAmount] = useState(1000000)
  const [rate, setRate] = useState(16)
  const [method, setMethod] = useState<'add' | 'extract'>('add')

  const result = amount > 0 ? calcVat(amount, rate, method) : null

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">🧾 {L('НДС 16% калькулятор', 'Калькулятор НДС 16%')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>НДС = 16%</InfoChip>
        <InfoChip>{L('Медицина', 'Медицина')} = 5%</InfoChip>
        <InfoChip>{L('Баспа', 'Печать')} = 10%</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{L('Жаңа Салық кодексі 2026: НДС 12% → 16%. Пониженные: медицина 5%, баспа 10%', 'Новый Налоговый кодекс 2026: НДС 12% → 16%. Пониженные: медицина 5%, печать 10%')}</p>

      <div className="mb-3">
        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Сома (₸)', 'Сумма (₸)')}</label>
        <Input
          type="text"
          inputMode="numeric"
          value={amount || ''}
          onChange={e => setAmount(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
          className="text-base"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('НДС ставкасы', 'Ставка НДС')}</label>
          <select className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary" value={rate} onChange={e => setRate(parseInt(e.target.value))}>
            <option value={16}>{L('16% (негізгі)', '16% (основная)')}</option>
            <option value={5}>{L('5% (медицина 2026)', '5% (медицина 2026)')}</option>
            <option value={10}>{L('10% (баспа)', '10% (печать)')}</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Есеп тәсілі', 'Метод расчёта')}</label>
          <select className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary" value={method} onChange={e => setMethod(e.target.value as 'add' | 'extract')}>
            <option value="add">{L('НДС қосу', 'Начислить НДС')}</option>
            <option value="extract">{L('НДС бөліп алу', 'Выделить НДС')}</option>
          </select>
        </div>
      </div>

      {result && (
        <ResultCard>
          <ResultRow label={L('Сома НДС-сіз', 'Сумма без НДС')} value={`${F(result.withoutVat)} ₸`} />
          <ResultRow label={`НДС (${rate}%)`} value={`${F(result.vat)} ₸`} color="red" />
          <ResultTotal label={L('Сома НДС-пен', 'Сумма с НДС')} value={`${F(result.withVat)} ₸`} />
        </ResultCard>
      )}

      {/* Context block */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border/50 mb-4 text-sm leading-relaxed text-muted-foreground">
        <p>{L('2026 жылдан бастап ҚҚС ставкасы 12%-дан 16%-ға дейін өсті. Медицина — 5%, баспа — 10%. Упрощёнка бойынша ЖК/ТОО жылдық табысы 43.25 млн ₸-ге дейін ҚҚС-тен босатылған.', 'С 2026 года ставка НДС выросла с 12% до 16%. Медицина — 5%, пресса — 10%. ИП/ТОО на упрощёнке освобождены от НДС при годовом доходе до 43.25 млн ₸.')}</p>
      </div>

      <TipBox>
        {L(
          'Упрощёнка (4%) бойынша жұмыс істейтін ЖК/ТОО НДС-тен босатылған. Бірақ жылдық табыс 43 250 000₸-ден асса — НДС төлеуші болу міндетті.',
          'ИП/ТОО на упрощёнке (4%) освобождены от НДС. Но если годовой доход превышает 43 250 000₸ — регистрация по НДС обязательна.'
        )}
      </TipBox>

      <ShareBar tool="vat" text={L('НДС 16% калькулятор — Quralhub', 'Калькулятор НДС 16% — Quralhub')} />
    </div>
  )
}
