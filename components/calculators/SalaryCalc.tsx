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
import { calcSalary } from '@/lib/calculations/salary'
import { F } from '@/lib/constants'
import { useApp } from '@/components/layout/Providers'

export function SalaryCalc() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [amount, setAmount] = useState(350000)
  const [method, setMethod] = useState<'direct' | 'reverse'>('direct')
  const [regime, setRegime] = useState<'emp' | 'emp-simp'>('emp')
  const [deduction, setDeduction] = useState(true)
  const [pension, setPension] = useState(false)
  const [disabled, setDisabled] = useState(false)

  const result = amount > 0 ? calcSalary(amount, method, { pension, disabled, deduction }) : null

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">💰 {L('Жалақы калькуляторы', 'Калькулятор зарплаты')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>МРП = 4 325₸</InfoChip>
        <InfoChip>МЗП = 85 000₸</InfoChip>
        <InfoChip>Вычет = 30 МРП</InfoChip>
        <InfoChip>ОПВР = 3.5%</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{L('Жаңа Салық кодексі 2026 (Заң №214-VIII) бойынша есеп', 'Расчёт по новому Налоговому кодексу 2026')}</p>

      {/* Context block */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border/50 mb-5 text-sm leading-relaxed text-muted-foreground">
        <p>{L('2026 жылдан бастап жаңа Салық кодексі күшіне енді. Ең маңызды өзгерістер: ИПН вычеті 14 МРП-дан 30 МРП-ға дейін өсті (129 750₸), ОПВР 1.5%-дан 3.5%-ға дейін артты, ИПН прогрессивті шкалаға көшті (10%/15%). Бұл калькулятор барлық жаңа ставкаларды есепке алады.', 'С 2026 года вступил в силу новый Налоговый кодекс. Главные изменения: вычет ИПН вырос с 14 МРП до 30 МРП (129 750₸), ОПВР увеличился с 1.5% до 3.5%, ИПН перешёл на прогрессивную шкалу (10%/15%). Этот калькулятор учитывает все новые ставки.')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Режим', 'Режим')}</label>
          <select
            className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
            value={regime}
            onChange={e => setRegime(e.target.value as 'emp' | 'emp-simp')}
          >
            <option value="emp">{L('Қызметкер (ТОО/ЖК ОУР)', 'Работник (ТОО/ИП ОУР)')}</option>
            <option value="emp-simp">{L('Қызметкер (ЖК упрощёнка)', 'Работник (ИП упрощёнка)')}</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Тәсіл', 'Метод')}</label>
          <select
            className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
            value={method}
            onChange={e => setMethod(e.target.value as 'direct' | 'reverse')}
          >
            <option value="direct">{L('Окладтан → қолға', 'Из оклада → на руки')}</option>
            <option value="reverse">{L('Қолға → окладты', 'На руки → оклад')}</option>
          </select>
        </div>
      </div>

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

      <div className="flex flex-wrap gap-3 mb-2">
        <label className="flex items-center gap-2.5 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          <input type="checkbox" checked={deduction} onChange={e => setDeduction(e.target.checked)} className="w-5 h-5 accent-primary" />
          {L('Вычет 30 МРП', 'Вычет 30 МРП')}
        </label>
        <label className="flex items-center gap-2.5 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          <input type="checkbox" checked={pension} onChange={e => setPension(e.target.checked)} className="w-5 h-5 accent-primary" />
          {L('Зейнеткер', 'Пенсионер')}
        </label>
        <label className="flex items-center gap-2.5 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          <input type="checkbox" checked={disabled} onChange={e => setDisabled(e.target.checked)} className="w-5 h-5 accent-primary" />
          {L('Мүгедек', 'Инвалид')}
        </label>
      </div>

      {result && (
        <ResultCard>
          <ResultRow label={L('Оклад', 'Оклад')} value={`${F(result.oklad)} ₸`} />
          <ResultRow label={L('ОПВ (10%)', 'ОПВ (10%)')} value={`−${F(result.opv)} ₸`} color="red" />
          <ResultRow label="ВОСМС (2%)" value={`−${F(result.vosms)} ₸`} color="red" />
          <ResultRow label="ИПН (10-15%)" value={`−${F(result.ipn)} ₸`} color="red" />
          <ResultTotal label={L('Қолға алатын сома', 'Сумма на руки')} value={`${F(result.net)} ₸`} />

          <div className="mt-4 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-1.5">{L('Жұмыс берушінің шығыны:', 'Расходы работодателя:')}</p>
            <ResultRow label="СО (5%)" value={`${F(result.so)} ₸`} />
            <ResultRow label="СН (6%−СО)" value={`${F(result.sn)} ₸`} />
            <ResultRow label="ООСМС (3%)" value={`${F(result.oosms)} ₸`} />
            <ResultRow label="ОПВР (3.5%)" value={`${F(result.opvr)} ₸`} />
            <ResultTotal label={L('Жалпы шығын', 'Общие расходы')} value={`${F(result.totalCost)} ₸`} />
          </div>
        </ResultCard>
      )}

      <TipBox>
        {L(
          '2026 жылдан бастап вычет 14 МРП-дан 30 МРП-ға (129 750₸) дейін өсті. Сіздің жалақыңыз артты!',
          'С 2026 года вычет увеличен с 14 МРП до 30 МРП (129 750₸). Ваша зарплата выросла!'
        )}
      </TipBox>

      <ShareBar tool="salary" text={L('Жалақы калькуляторы — Quralhub', 'Калькулятор зарплаты — Quralhub')} />
    </div>
  )
}
