'use client'

import { useMemo } from 'react'
import { BackButton } from '@/components/layout/BackButton'
import { InfoChip } from '@/components/shared/InfoChip'
import { ShareBar } from '@/components/shared/ShareBar'
import { useApp } from '@/components/layout/Providers'
import { HOLIDAYS_2026 } from '@/lib/data/holidays'

const MONTHS_KZ = ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан']
const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const DAYS_KZ_SHORT = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс']
const DAYS_RU_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const DAY_NAMES = ['Жексенбі', 'Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма', 'Сенбі']
const DAY_NAMES_RU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

function getMonthDays(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1 // Monday-based
}

function isHoliday(dateStr: string) {
  return HOLIDAYS_2026.some(h => {
    if (h.endDate) {
      return dateStr >= h.date && dateStr <= h.endDate
    }
    return dateStr === h.date
  })
}

function isWeekend(year: number, month: number, day: number) {
  const d = new Date(year, month, day).getDay()
  return d === 0 || d === 6
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function MiniMonth({ year, month, today, isRu }: { year: number; month: number; today: string; isRu: boolean }) {
  const totalDays = getMonthDays(year, month)
  const firstDay = getFirstDayOfWeek(year, month)
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)
  const dayShorts = isRu ? DAYS_RU_SHORT : DAYS_KZ_SHORT

  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
      <h4 className="text-xs font-bold text-center mb-2">{isRu ? MONTHS_RU[month] : MONTHS_KZ[month]}</h4>
      <div className="grid grid-cols-7 gap-px text-[10px] text-center">
        {dayShorts.map(d => (
          <div key={d} className="font-semibold text-muted-foreground py-0.5">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />
          const ds = toDateStr(year, month, day)
          const hol = isHoliday(ds)
          const wknd = isWeekend(year, month, day)
          const isToday = ds === today
          return (
            <div
              key={i}
              className={`py-0.5 rounded text-[10px] ${
                hol ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold' :
                wknd ? 'text-red-500 dark:text-red-400' : ''
              } ${isToday ? 'ring-2 ring-primary font-bold' : ''}`}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function HolidayCalendar() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz
  const isRu = lang === 'ru'

  const today = useMemo(() => {
    const d = new Date()
    return toDateStr(d.getFullYear(), d.getMonth(), d.getDate())
  }, [])

  const nextHoliday = useMemo(() => {
    return HOLIDAYS_2026.find(h => h.date >= today)
  }, [today])

  const daysUntilNext = useMemo(() => {
    if (!nextHoliday) return null
    const t = new Date(today)
    const n = new Date(nextHoliday.date)
    return Math.ceil((n.getTime() - t.getTime()) / (1000 * 60 * 60 * 24))
  }, [today, nextHoliday])

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">{L('Мерекелер 2026', 'Праздники 2026')}</h2>

      {nextHoliday && daysUntilNext !== null && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <InfoChip>
            {daysUntilNext === 0
              ? `${L('Бүгін', 'Сегодня')}: ${isRu ? nextHoliday.nameRu : nextHoliday.name}`
              : `${L('Келесі мереке', 'Следующий праздник')}: ${daysUntilNext} ${L('күн', 'дней')}`}
          </InfoChip>
        </div>
      )}

      {/* Mini calendar grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {Array.from({ length: 12 }, (_, i) => (
          <MiniMonth key={i} year={2026} month={i} today={today} isRu={isRu} />
        ))}
      </div>

      {/* Holiday list */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <h3 className="text-lg font-bold mb-3">{L('Мерекелер тізімі', 'Список праздников')}</h3>
        <div className="space-y-2">
          {HOLIDAYS_2026.map((h, i) => {
            const isPast = h.date < today
            const isNext = nextHoliday?.date === h.date
            const d = new Date(h.date)
            const dayOfWeek = isRu ? DAY_NAMES_RU[d.getDay()] : DAY_NAMES[d.getDay()]
            const dateDisplay = `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`

            return (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                  isNext
                    ? 'border-primary bg-primary/5'
                    : isPast
                    ? 'border-border opacity-50'
                    : 'border-border'
                }`}
              >
                <div className="text-center min-w-[48px]">
                  <div className="text-lg font-extrabold text-primary">{dateDisplay}</div>
                  <div className="text-[10px] text-muted-foreground">{dayOfWeek}</div>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{isRu ? h.nameRu : h.name}</div>
                  <div className="text-xs text-muted-foreground">{isRu ? h.name : h.nameRu}</div>
                  {h.days > 1 && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">{h.days} {L('күн', 'дней')}</div>
                  )}
                </div>
                {isNext && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-primary text-primary-foreground font-semibold">
                    {L('Келесі', 'Следующий')}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <ShareBar tool={L('Мерекелер 2026', 'Праздники 2026')} />
    </div>
  )
}
