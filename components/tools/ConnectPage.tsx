'use client'

import { useState, useMemo } from 'react'
import { BackButton } from '@/components/layout/BackButton'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { useApp } from '@/components/layout/Providers'
import { TELECOM_DATA, OP_COLORS } from '@/lib/data/telecom'
import { ISP_DATA } from '@/lib/data/isp'
import { F } from '@/lib/constants'

type MobileFilter = 'all' | 'budget' | 'mid' | 'prem'
type IspFilter = 'all' | 'budget' | 'mid' | 'premium'
type Tab = 'mobile' | 'home'

export function ConnectPage() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [tab, setTab] = useState<Tab>('mobile')
  const [mobileFilter, setMobileFilter] = useState<MobileFilter>('all')
  const [ispFilter, setIspFilter] = useState<IspFilter>('all')

  const MOBILE_FILTERS: { key: MobileFilter; label: string }[] = [
    { key: 'all', label: L('Барлығы', 'Все') },
    { key: 'budget', label: L('5K₸ дейін', '5K₸ до') },
    { key: 'mid', label: '5-8K₸' },
    { key: 'prem', label: '8K+₸' },
  ]

  const ISP_FILTERS: { key: IspFilter; label: string }[] = [
    { key: 'all', label: L('Барлығы', 'Все') },
    { key: 'budget', label: L('Бюджет', 'Бюджет') },
    { key: 'mid', label: L('Орташа', 'Средний') },
    { key: 'premium', label: L('Премиум', 'Премиум') },
  ]

  const filteredMobile = useMemo(() => {
    const sorted = [...TELECOM_DATA].sort((a, b) => a.price - b.price)
    if (mobileFilter === 'all') return sorted
    return sorted.filter(p => p.tier === mobileFilter)
  }, [mobileFilter])

  const cheapestPrice = filteredMobile.length > 0 ? filteredMobile[0].price : null

  const filteredIsp = useMemo(() => {
    const all = ISP_DATA.flatMap(provider =>
      provider.plans.map(plan => ({ ...plan, provider: provider.name, color: provider.color, textColor: provider.textColor }))
    ).sort((a, b) => a.price - b.price)
    if (ispFilter === 'all') return all
    return all.filter(p => p.tier === ispFilter)
  }, [ispFilter])

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-4">{L('Байланыс тарифтерін салыстыру', 'Сравнение тарифов связи')}</h2>

      {/* Context block */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border/50 mb-5 text-sm leading-relaxed text-muted-foreground">
        <p>{L('2026 жылы НДС 16%-ға өскендіктен барлық тарифтер 15-20% қымбаттады. Ең арзан безлімит — Altel Арнау (8 690₸). Ең арзан интернет пакет — IZI Ultra (2 690₸/30ГБ). Нөмірді сақтап оператор ауыстыру (MNP) — барлық операторларда жұмыс істейді.', 'В 2026 году из-за повышения НДС до 16% все тарифы подорожали на 15-20%. Самый дешёвый безлимит — Altel Арнау (8 690₸). Самый дешёвый пакет — IZI Ultra (2 690₸/30ГБ). Перенос номера (MNP) работает у всех операторов.')}</p>
      </div>

      {/* Main tabs — full width, large, centered */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          onClick={() => setTab('mobile')}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            tab === 'mobile'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-card border border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          📱 {L('Ұялы байланыс', 'Мобильная связь')}
        </button>
        <button
          onClick={() => setTab('home')}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            tab === 'home'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-card border border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          🌐 {L('Үй интернет', 'Дом. интернет')}
        </button>
      </div>

      {/* Mobile tab */}
      {tab === 'mobile' && (
        <>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {MOBILE_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setMobileFilter(f.key)}
                className={`text-xs px-3.5 py-2 min-h-[36px] rounded-full border font-semibold transition-colors ${
                  mobileFilter === f.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Visual comparison */}
          <div className="mb-4 p-4 bg-card border border-border rounded-xl">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              {L('Баға/интернет салыстыру', 'Сравнение цена/интернет')}
            </h3>
            <div className="space-y-2">
              {filteredMobile.map((plan, i) => {
                const maxPrice = Math.max(...filteredMobile.map(p => p.price))
                const pricePct = Math.round(plan.price / maxPrice * 100)
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-[50px] truncate font-semibold">{plan.operator}</span>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full flex items-center px-2 text-white text-[10px] font-bold"
                        style={{
                          width: `${pricePct}%`,
                          backgroundColor: OP_COLORS[plan.operator] || '#888',
                          minWidth: '40px'
                        }}
                      >
                        {F(plan.price)}₸
                      </div>
                    </div>
                    <span className="w-[45px] text-right font-medium text-blue-600">
                      {plan.gb === -1 ? '∞ ГБ' : `${plan.gb} ГБ`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            {filteredMobile.map((plan, i) => {
              const isCheapest = plan.price === cheapestPrice
              return (
                <div key={i} className={`bg-card border rounded-xl p-3.5 shadow-sm ${isCheapest ? 'border-green-500 ring-1 ring-green-500/30' : 'border-border'}`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] px-2 py-1 rounded-full font-bold"
                        style={{ backgroundColor: OP_COLORS[plan.operator] || '#888', color: plan.operator === 'Beeline' ? '#000' : '#fff' }}
                      >
                        {plan.operator}
                      </span>
                      <span className="text-sm font-semibold">{plan.plan}</span>
                    </div>
                    {isCheapest && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold">
                        {L('Ең тиімді', 'Лучшая цена')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        📶 {plan.gb === -1 ? L('Шексіз', 'Безлимит') : `${plan.gb} ГБ`}
                      </span>
                      {plan.min > 0 && (
                        <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                          📞 {plan.min} {L('мин', 'мин')}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-primary">{F(plan.price)} ₸</span>
                      <span className="text-[10px] text-muted-foreground ml-0.5">/{L('ай', 'мес')}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Home Internet tab */}
      {tab === 'home' && (
        <>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {ISP_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setIspFilter(f.key)}
                className={`text-xs px-3.5 py-2 min-h-[36px] rounded-full border font-semibold transition-colors ${
                  ispFilter === f.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Visual comparison */}
          <div className="mb-4 p-4 bg-card border border-border rounded-xl">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              {L('Жылдамдық/баға салыстыру', 'Сравнение скорость/цена')}
            </h3>
            <div className="space-y-2">
              {filteredIsp.map((plan, i) => {
                const maxSpeed = Math.max(...filteredIsp.map(p => p.speed))
                const speedPct = Math.round(plan.speed / maxSpeed * 100)
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold">{plan.provider} {plan.name}</span>
                      <span className="font-bold text-primary">{F(plan.price)}₸</span>
                    </div>
                    <div className="flex gap-1 h-4">
                      <div className="flex-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${speedPct}%` }} />
                      </div>
                      <span className="text-[10px] w-[60px] text-right">{plan.speed} Мбит/с</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-500 rounded-full inline-block"></span> {L('Жылдамдық', 'Скорость')}</span>
            </div>
          </div>

          <div className="space-y-2">
            {filteredIsp.map((plan, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-3.5 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] px-2 py-1 rounded-full font-bold"
                      style={{ backgroundColor: plan.color, color: plan.textColor }}
                    >
                      {plan.provider}
                    </span>
                    <span className="text-sm font-semibold">{plan.name}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">⚡ {plan.speed} {L('Мбит/с', 'Мбит/с')}</span>
                    {plan.tv > 0 && <span className="text-xs font-medium text-purple-600 dark:text-purple-400">📺 {plan.tv} {L('арна', 'каналов')}</span>}
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-primary">{F(plan.price)} ₸</span>
                    <span className="text-[10px] text-muted-foreground ml-0.5">/{L('ай', 'мес')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <TipBox>{L('Бағалар ресми сайттардан алынған, нақты бағаны оператордан тексеріңіз.', 'Цены взяты с официальных сайтов, уточняйте у оператора.')}</TipBox>
      <ShareBar tool={L('Байланыс тарифтері', 'Тарифы связи')} />
    </div>
  )
}
