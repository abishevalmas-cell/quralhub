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
import { calcVacation } from '@/lib/calculations/vacation'
import { F } from '@/lib/constants'
import { useApp } from '@/components/layout/Providers'

export function VacationCalc() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [salary, setSalary] = useState(350000)
  const [days, setDays] = useState(24)
  const [workedMonths, setWorkedMonths] = useState(12)

  const result = salary > 0 && days > 0 ? calcVacation(salary, days, workedMonths) : null

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">🏖️ {L('Демалыс ақы калькуляторы', 'Калькулятор отпускных')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>ЕК 91-{L('бап', 'ст.')}</InfoChip>
        <InfoChip>24 {L('күн (мін.)', 'дня (мин.)')}</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{L('Жыл сайынғы ақылы демалыс ақысын есептеңіз', 'Рассчитайте сумму ежегодных оплачиваемых отпускных')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Орташа айлық жалақы (₸)', 'Средняя зарплата (₸)')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={salary || ''}
            onChange={e => setSalary(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Демалыс күндері', 'Дни отпуска')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={days || ''}
            onChange={e => setDays(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Жұмыс айлар', 'Отработано мес.')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={workedMonths || ''}
            onChange={e => setWorkedMonths(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
      </div>

      {result && (
        <ResultCard>
          <ResultRow label={L('Орташа күнделікті', 'Среднедневной')} value={`${F(result.avgDaily)} ₸`} />
          <ResultRow label={L('Демалыс күндері', 'Дни отпуска')} value={`${result.days} ${L('күн', 'дней')}`} />
          <ResultRow label={L('Жалпы сома (gross)', 'Общая сумма (gross)')} value={`${F(result.vacPay)} ₸`} />
          <ResultRow label="ОПВ (10%)" value={`−${F(result.opv)} ₸`} color="red" />
          <ResultRow label="ИПН (10%)" value={`−${F(result.ipn)} ₸`} color="red" />
          <ResultRow label="ВОСМС (2%)" value={`−${F(result.vosms)} ₸`} color="red" />
          <ResultTotal label={L('Қолға алатын сома', 'Сумма на руки')} value={`${F(result.net)} ₸`} />
        </ResultCard>
      )}

      <TipBox>
        {L(
          'ЕК 91-бап бойынша жыл сайынғы демалыс ең кемі 24 күнтізбелік күн. Демалыс ақы орташа жалақыдан есептеледі.',
          'По ст. 91 ТК ежегодный отпуск — минимум 24 календарных дня. Отпускные рассчитываются из средней зарплаты.'
        )}
      </TipBox>

      <ShareBar tool="vacation" text={L('Демалыс ақы калькуляторы — Quralhub', 'Калькулятор отпускных — Quralhub')} />
    </div>
  )
}
