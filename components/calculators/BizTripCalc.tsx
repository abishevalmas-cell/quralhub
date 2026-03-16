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
import { calcBizTrip } from '@/lib/calculations/biztrip'
import { F, MRP } from '@/lib/constants'
import { useApp } from '@/components/layout/Providers'

export function BizTripCalc() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [days, setDays] = useState(5)
  const [type, setType] = useState<'domestic' | 'abroad'>('domestic')
  const [customDaily, setCustomDaily] = useState(0)
  const [accommodation, setAccommodation] = useState(0)
  const [travel, setTravel] = useState(0)

  const normDaily = type === 'domestic' ? 6 * MRP : 8 * MRP
  const result = days > 0 ? calcBizTrip(days, type, customDaily || normDaily, accommodation, travel) : null

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">✈️ {L('Іссапар калькуляторы', 'Калькулятор командировочных')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>{L('КЗ ішінде', 'Внутри КЗ')} = 6 {L('МРП', 'МРП')}</InfoChip>
        <InfoChip>{L('Шетелде', 'За рубеж')} = 8 {L('МРП', 'МРП')}</InfoChip>
        <InfoChip>1 {L('МРП', 'МРП')} = {F(MRP)}₸</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        {L('Іссапар шығындарын жаңа Салық кодексі 2026 бойынша есептеңіз', 'Рассчитайте командировочные расходы по новому НК 2026')}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Бағыт', 'Направление')}</label>
          <select
            className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
            value={type}
            onChange={e => setType(e.target.value as 'domestic' | 'abroad')}
          >
            <option value="domestic">{L('КЗ ішінде', 'Внутри Казахстана')}</option>
            <option value="abroad">{L('Шетелге', 'За рубеж')}</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Күн саны', 'Количество дней')}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={days || ''}
            onChange={e => setDays(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
          {L('Тәуліктік (₸/күн)', 'Суточные (₸/день)')}
          <span className="text-[10px] text-primary ml-1.5">{L('норма', 'норма')}: {F(normDaily)}₸</span>
        </label>
        <Input
          type="text"
          inputMode="numeric"
          placeholder={F(normDaily)}
          value={customDaily || ''}
          onChange={e => setCustomDaily(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
          className="text-base"
        />
        {customDaily > normDaily && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
            {L(`Норманы ${F(customDaily - normDaily)}₸-ге асып тұр → ИПН 10% ұсталады`, `Превышение нормы на ${F(customDaily - normDaily)}₸ → удержание ИПН 10%`)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Тұру (жалпы ₸)', 'Проживание (всего ₸)')}</label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={accommodation || ''}
            onChange={e => setAccommodation(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Жол жүру (₸)', 'Проезд (₸)')}</label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={travel || ''}
            onChange={e => setTravel(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base"
          />
        </div>
      </div>

      {result && (
        <ResultCard>
          <ResultRow label={`${L('Тәуліктік', 'Суточные')} (${days} ${L('күн', 'дн.')} × ${F(result.dailyRate)}₸)`} value={`${F(result.dailyTotal)} ₸`} />
          {result.accommodation > 0 && <ResultRow label={L('Тұру', 'Проживание')} value={`${F(result.accommodation)} ₸`} />}
          {result.travel > 0 && <ResultRow label={L('Жол жүру', 'Проезд')} value={`${F(result.travel)} ₸`} />}
          <ResultTotal label={L('Жалпы сома', 'Общая сумма')} value={`${F(result.total)} ₸`} />

          {result.taxable > 0 && (
            <div className="mt-3 pt-2 border-t border-border/50">
              <ResultRow label={L('Салықтан босатылған', 'Не облагается ИПН')} value={`${F(result.taxFree)} ₸`} color="green" />
              <ResultRow label={L('Норманы асу', 'Превышение нормы')} value={`${F(result.taxable)} ₸`} color="red" />
              <ResultRow label="ИПН (10%)" value={`−${F(result.ipn)} ₸`} color="red" />
              <ResultTotal label={L('Қолға', 'На руки')} value={`${F(result.netTotal)} ₸`} />
            </div>
          )}
        </ResultCard>
      )}

      <div className="p-4 rounded-xl bg-muted/50 border border-border/50 mb-4 text-sm leading-relaxed text-muted-foreground">
        <p>{L('Іссапар тәуліктіктер ЕК 127-бабына сәйкес ИПН-мен салықталмайды (КЗ ішінде 6 МРП, шетелге 8 МРП). Егер жұмыс беруші жоғары тәуліктік төлесе — айырмашылық ИПН 10%-бен салықталады. Тұру мен жол жүру — құжаттық растау бойынша.', 'Суточные не облагаются ИПН по ст. 127 ТК (внутри КЗ — 6 МРП, за рубеж — 8 МРП). Если работодатель выплачивает больше нормы — разница облагается ИПН 10%. Проживание и проезд — по документальному подтверждению.')}</p>
      </div>

      <TipBox>
        {L(
          'Іссапар бұйрығы міндетті. Бухгалтерияға: авиабилет, қонақүй чегі, жол жүру билеті — барлығын сақтаңыз.',
          'Приказ о командировке обязателен. Для бухгалтерии: авиабилет, чек отеля, проездные — сохраняйте всё.'
        )}
      </TipBox>

      <ShareBar tool="biztrip" text={L('Іссапар калькуляторы — Quralhub', 'Калькулятор командировочных — Quralhub')} />
    </div>
  )
}
