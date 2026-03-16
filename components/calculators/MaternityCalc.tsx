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
import { calcMaternity } from '@/lib/calculations/maternity'
import { F } from '@/lib/constants'
import { useApp } from '@/components/layout/Providers'

export function MaternityCalc() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [salary, setSalary] = useState(350000)
  const [birthDays, setBirthDays] = useState(126)
  const [workedMonths, setWorkedMonths] = useState(12)

  const result = salary > 0 ? calcMaternity(salary, birthDays, workedMonths) : null

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">👶 {L('Декрет ақы калькуляторы', 'Калькулятор декретных')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>126 {L('күн (босану)', 'дней (роды)')}</InfoChip>
        <InfoChip>{L('Бала 1 жасқа дейін', 'Ребёнок до 1 года')}</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{L('Жүктілік, босану және бала күтімі жәрдемақысын есептеңіз', 'Рассчитайте пособие по беременности, родам и уходу за ребёнком')}</p>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Жалақы (₸)', 'Зарплата (₸)')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={salary || ''}
            onChange={e => setSalary(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Босану түрі', 'Тип родов')}</label>
          <select
            className="w-full px-3 py-3 bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
            value={birthDays}
            onChange={e => setBirthDays(parseInt(e.target.value))}
          >
            <option value={126}>{L('Қалыпты (126 күн)', 'Обычные (126 дней)')}</option>
            <option value={140}>{L('Асқынған (140 күн)', 'Осложнённые (140 дней)')}</option>
            <option value={170}>{L('Егіздер (170 күн)', 'Близнецы (170 дней)')}</option>
          </select>
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
        <>
          <ResultCard>
            <p className="text-xs text-muted-foreground mb-1.5 font-semibold">{L('Босану демалысы', 'Отпуск по родам')}</p>
            <ResultRow label={L('Орташа күнделікті', 'Среднедневной')} value={`${F(result.avgDaily)} ₸`} />
            <ResultRow label={L('Босану күндері', 'Дни родов')} value={`${result.birthDays} ${L('күн', 'дней')}`} />
            <ResultRow label={L('Жалпы сома', 'Общая сумма')} value={`${F(result.birthPay)} ₸`} />
            <ResultRow label={L('СО ұсталым (10%)', 'Удержание СО (10%)')} value={`−${F(result.socTax)} ₸`} color="red" />
            <ResultTotal label={L('Қолға алатын сома', 'Сумма на руки')} value={`${F(result.netBirthPay)} ₸`} />
          </ResultCard>

          <ResultCard>
            <p className="text-xs text-muted-foreground mb-1.5 font-semibold">{L('Бала күтімі жәрдемақысы (1 жасқа дейін)', 'Пособие по уходу за ребёнком (до 1 года)')}</p>
            <ResultRow label={L('Айлық жәрдемақы (40%)', 'Ежемесячное пособие (40%)')} value={`${F(result.childCareMonthly)} ₸`} />
            <ResultTotal label={L('12 айға жалпы', 'Итого за 12 мес')} value={`${F(result.childCareTotal)} ₸`} />
          </ResultCard>

          <ResultCard>
            <p className="text-xs text-muted-foreground mb-1.5 font-semibold">{L('Туу бойынша біржолғы жәрдемақы', 'Единовременное пособие при рождении')}</p>
            <ResultTotal label="63 МРП" value={`${F(result.birthGrant)} ₸`} />
          </ResultCard>
        </>
      )}

      <TipBox>
        {L(
          'Босану демалысы: қалыпты — 126 күн, асқынған — 140 күн, егіздер — 170 күн. Бала күтімі жәрдемақысы жалақының 40%-ы.',
          'Отпуск по родам: обычные — 126 дней, осложнённые — 140 дней, близнецы — 170 дней. Пособие по уходу — 40% от зарплаты.'
        )}
      </TipBox>

      <ShareBar tool="maternity" text={L('Декрет ақы калькуляторы — Quralhub', 'Калькулятор декретных — Quralhub')} />
    </div>
  )
}
