'use client'
import { useState, useMemo } from 'react'
import { BackButton } from '@/components/layout/BackButton'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { InfoChip } from '@/components/shared/InfoChip'
import { useApp } from '@/components/layout/Providers'
import { HOLIDAYS_2026 } from '@/lib/data/holidays'
import { PROFESSIONAL_DAYS_2026, SCHOOL_CALENDAR, TAX_CALENDAR_2026 } from '@/lib/data/calendars'

const DAY_NAMES = ['Жексенбі', 'Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма', 'Сенбі']
const DAY_NAMES_RU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

function daysUntil(dateStr: string, today: string) {
  const t = new Date(today)
  const n = new Date(dateStr)
  return Math.ceil((n.getTime() - t.getTime()) / (1000 * 60 * 60 * 24))
}

function EventList({
  events,
  today,
  isRu,
}: {
  events: { date: string; name: string; nameRu: string; days?: number }[]
  today: string
  isRu: boolean
}) {
  const nextIdx = events.findIndex(e => e.date >= today)
  const L = (kz: string, ru: string) => isRu ? ru : kz

  return (
    <div className="space-y-2">
      {events.map((e, i) => {
        const isPast = e.date < today
        const isNext = i === nextIdx
        const d = new Date(e.date)
        const dayOfWeek = isRu ? DAY_NAMES_RU[d.getDay()] : DAY_NAMES[d.getDay()]
        const dLeft = daysUntil(e.date, today)

        return (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
              isNext
                ? 'border-green-500 bg-green-500/5 shadow-sm'
                : isPast
                ? 'border-border opacity-40'
                : 'border-border'
            }`}
          >
            <div className="text-center min-w-[48px]">
              <div className="text-lg font-extrabold text-primary">{formatDate(e.date)}</div>
              <div className="text-[10px] text-muted-foreground">{dayOfWeek}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{isRu ? e.nameRu : e.name}</div>
              <div className="text-xs text-muted-foreground">{isRu ? e.name : e.nameRu}</div>
              {e.days && e.days > 1 && (
                <div className="text-[10px] text-muted-foreground mt-0.5">{e.days} {L('күн', 'дней')}</div>
              )}
            </div>
            {isNext && dLeft >= 0 && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-green-600 text-white font-semibold whitespace-nowrap flex-shrink-0">
                {dLeft === 0 ? L('Бүгін!', 'Сегодня!') : `${dLeft} ${L('күнде', 'дней')}`}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function SchoolCalendarTab({ today, isRu }: { today: string; isRu: boolean }) {
  const L = (kz: string, ru: string) => isRu ? ru : kz
  const entries = Object.entries(SCHOOL_CALENDAR) as [
    string,
    { start: string; end: string; label: string; labelRu?: string },
  ][]

  return (
    <div className="space-y-2.5">
      {entries.map(([key, period]) => {
        const isBreak = key.includes('break')
        const isActive = today >= period.start && today <= period.end
        const isPast = today > period.end
        const startD = new Date(period.start)
        const endD = new Date(period.end)
        const totalDays = Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1

        return (
          <div
            key={key}
            className={`p-4 rounded-2xl border transition-colors ${
              isActive
                ? 'border-green-500 bg-green-500/5 shadow-md'
                : isPast
                ? 'border-border opacity-40'
                : 'border-border'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{isBreak ? '🏖️' : '📚'}</span>
                <span className="text-sm font-bold">{isRu ? ((period as any).labelRu || period.label) : period.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{totalDays} {L('күн', 'дней')}</span>
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              {formatDate(period.start)} — {formatDate(period.end)}
            </div>
            {/* Visual bar */}
            <div className="h-3 rounded-full overflow-hidden bg-accent">
              <div
                className={`h-full rounded-full transition-all ${
                  isBreak
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                    : 'bg-gradient-to-r from-blue-400 to-blue-600'
                }`}
                style={{
                  width: isActive
                    ? `${Math.min(100, ((daysUntil(period.start, today) * -1 + 1) / totalDays) * 100)}%`
                    : isPast
                    ? '100%'
                    : '0%',
                }}
              />
            </div>
            {isActive && (
              <p className="text-[11px] text-green-600 dark:text-green-400 font-semibold mt-1.5">
                {L('Қазір осы кезеңде', 'Сейчас этот период')}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TaxCalendarTab({ today, isRu }: { today: string; isRu: boolean }) {
  const L = (kz: string, ru: string) => isRu ? ru : kz
  const sorted = [...TAX_CALENDAR_2026].sort((a, b) => a.date.localeCompare(b.date))
  const nextIdx = sorted.findIndex(e => e.date >= today)
  const nextDeadline = nextIdx >= 0 ? sorted[nextIdx] : null
  const dLeft = nextDeadline ? daysUntil(nextDeadline.date, today) : null

  return (
    <div>
      {nextDeadline && dLeft !== null && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 mb-4">
          <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">
            {L('Келесі мерзім', 'Следующий дедлайн')}:
          </p>
          <p className="text-sm font-bold text-red-800 dark:text-red-200">{isRu ? nextDeadline.nameRu : nextDeadline.name}</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
            {formatDate(nextDeadline.date)} — {dLeft === 0 ? L('Бүгін!', 'Сегодня!') : `${dLeft} ${L('күн қалды', 'дней осталось')}`}
          </p>
        </div>
      )}
      <div className="space-y-2">
        {sorted.map((e, i) => {
          const isPast = e.date < today
          const isNext = i === nextIdx
          const d = new Date(e.date)
          const dayOfWeek = isRu ? DAY_NAMES_RU[d.getDay()] : DAY_NAMES[d.getDay()]

          return (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                isNext
                  ? 'border-red-500 bg-red-500/5 shadow-sm'
                  : isPast
                  ? 'border-border opacity-40'
                  : 'border-border'
              }`}
            >
              <div className="text-center min-w-[48px]">
                <div className="text-lg font-extrabold text-primary">{formatDate(e.date)}</div>
                <div className="text-[10px] text-muted-foreground">{dayOfWeek}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{isRu ? e.nameRu : e.name}</div>
                <div className="text-xs text-muted-foreground">{isRu ? e.name : e.nameRu}</div>
              </div>
              {isNext && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-red-600 text-white font-semibold whitespace-nowrap flex-shrink-0">
                  {dLeft === 0 ? L('Бүгін!', 'Сегодня!') : `${dLeft} ${L('күн', 'дней')}`}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CalendarsPage() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz
  const isRu = lang === 'ru'

  const TABS = [
    { id: 'holidays', label: L('Mерекелер', 'Праздники'), icon: '🎉' },
    { id: 'professional', label: L('Кәсіби күндер', 'Профессиональные дни'), icon: '👔' },
    { id: 'school', label: L('Мектеп', 'Школа'), icon: '🏫' },
    { id: 'tax', label: L('Салық', 'Налоги'), icon: '📊' },
  ]

  const [tab, setTab] = useState('holidays')

  const today = useMemo(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }, [])

  const holidayEvents = useMemo(
    () =>
      HOLIDAYS_2026.map(h => ({
        date: h.date,
        name: h.name,
        nameRu: h.nameRu,
        days: h.days,
      })),
    [],
  )

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">{L('📆 Күнтізбелер — 2026', '📆 Календари — 2026')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-4">
        <InfoChip>{HOLIDAYS_2026.length} {L('мереке', 'праздников')}</InfoChip>
        <InfoChip>{PROFESSIONAL_DAYS_2026.length} {L('кәсіби күн', 'проф. дней')}</InfoChip>
        <InfoChip>{TAX_CALENDAR_2026.length} {L('салық мерзімі', 'налог. сроков')}</InfoChip>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-xs px-3 py-2 rounded-full font-semibold border transition-all ${
              tab === t.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-accent text-accent-foreground border-border hover:border-primary/40'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm mb-5">
        {tab === 'holidays' && (
          <>
            <h3 className="text-lg font-bold mb-3">{L('Мемлекеттік мерекелер', 'Государственные праздники')}</h3>
            <EventList events={holidayEvents} today={today} isRu={isRu} />
          </>
        )}
        {tab === 'professional' && (
          <>
            <h3 className="text-lg font-bold mb-3">{L('Кәсіби мерекелер', 'Профессиональные праздники')}</h3>
            <EventList events={PROFESSIONAL_DAYS_2026} today={today} isRu={isRu} />
          </>
        )}
        {tab === 'school' && (
          <>
            <h3 className="text-lg font-bold mb-3">{L('Мектеп күнтізбесі 2026-2027', 'Школьный календарь 2026-2027')}</h3>
            <SchoolCalendarTab today={today} isRu={isRu} />
          </>
        )}
        {tab === 'tax' && (
          <>
            <h3 className="text-lg font-bold mb-3">{L('Салық күнтізбесі 2026', 'Налоговый календарь 2026')}</h3>
            <TaxCalendarTab today={today} isRu={isRu} />
          </>
        )}
      </div>

      <TipBox>
        {L('Салық декларацияларын Salyk.kz немесе eGov.kz арқылы онлайн тапсыруға болады. Мерзімін өткізбеңіз!', 'Налоговые декларации можно сдать онлайн через Salyk.kz или eGov.kz. Не пропустите сроки!')}
      </TipBox>

      <ShareBar tool="calendars" text={L('Күнтізбелер 2026 — Quralhub', 'Календари 2026 — Quralhub')} />
    </div>
  )
}
