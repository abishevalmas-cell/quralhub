'use client'

import { useState, useMemo } from 'react'
import { BackButton } from '@/components/layout/BackButton'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { useApp } from '@/components/layout/Providers'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TELECOM_DATA, OP_COLORS } from '@/lib/data/telecom'
import { ISP_DATA } from '@/lib/data/isp'
import { F } from '@/lib/constants'

type MobileFilter = 'all' | 'budget' | 'mid' | 'prem'
type IspFilter = 'all' | 'budget' | 'mid' | 'premium'

export function ConnectPage() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const MOBILE_FILTERS: { key: MobileFilter; label: string }[] = [
    { key: 'all', label: L('Барлығы', 'Все') },
    { key: 'budget', label: '5K₸ ' + L('дейін', 'до') },
    { key: 'mid', label: '5-8K₸' },
    { key: 'prem', label: '8K+₸' },
  ]

  const ISP_FILTERS: { key: IspFilter; label: string }[] = [
    { key: 'all', label: L('Барлығы', 'Все') },
    { key: 'budget', label: L('Бюджет', 'Бюджет') },
    { key: 'mid', label: L('Орташа', 'Средний') },
    { key: 'premium', label: L('Премиум', 'Премиум') },
  ]

  const [mobileFilter, setMobileFilter] = useState<MobileFilter>('all')
  const [ispFilter, setIspFilter] = useState<IspFilter>('all')

  const filteredMobile = useMemo(() => {
    const sorted = [...TELECOM_DATA].sort((a, b) => a.price - b.price)
    if (mobileFilter === 'all') return sorted
    return sorted.filter(p => p.tier === mobileFilter)
  }, [mobileFilter])

  const cheapestPrice = useMemo(() => {
    if (filteredMobile.length === 0) return null
    return filteredMobile[0].price
  }, [filteredMobile])

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

      <Tabs defaultValue="mobile">
        <TabsList className="mb-4">
          <TabsTrigger value="mobile">{L('📱 Ұялы байланыс', '📱 Мобильная связь')}</TabsTrigger>
          <TabsTrigger value="home">{L('🌐 Үй интернет', '🌐 Домашний интернет')}</TabsTrigger>
        </TabsList>

        {/* Mobile tab */}
        <TabsContent value="mobile">
          <div className="flex flex-wrap gap-1.5 mb-4">
            {MOBILE_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setMobileFilter(f.key)}
                className={`text-xs px-3 py-2 min-h-[36px] rounded-full border font-semibold transition-colors ${
                  mobileFilter === f.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredMobile.map((plan, i) => {
              const isCheapest = plan.price === cheapestPrice
              return (
                <div key={i} className={`bg-card border rounded-xl p-4 shadow-sm flex items-center gap-3 ${isCheapest ? 'border-green-500 ring-1 ring-green-500/30' : 'border-border'}`}>
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className="text-[10px] px-2 py-1 rounded-full font-bold"
                      style={{
                        backgroundColor: OP_COLORS[plan.operator] || '#888',
                        color: plan.operator === 'Beeline' ? '#000' : '#fff',
                      }}
                    >
                      {plan.operator}
                    </span>
                    {isCheapest && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold whitespace-nowrap">
                        {L('Ең тиімді', 'Лучшая цена')}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{plan.plan}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                        📶 {plan.gb === -1 ? L('Шексіз', 'Безлимит') : `${plan.gb} ${L('ГБ', 'ГБ')}`}
                      </span>
                      {plan.min > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400">
                          📞 {plan.min} {L('мин', 'мин')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-primary">{F(plan.price)} ₸</div>
                    <div className="text-[10px] text-muted-foreground">/ {L('ай', 'мес.')}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* Home Internet tab */}
        <TabsContent value="home">
          <div className="flex flex-wrap gap-1.5 mb-4">
            {ISP_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setIspFilter(f.key)}
                className={`text-xs px-3 py-2 min-h-[36px] rounded-full border font-semibold transition-colors ${
                  ispFilter === f.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredIsp.map((plan, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
                <span
                  className="text-[10px] px-2 py-1 rounded-full font-bold"
                  style={{ backgroundColor: plan.color, color: plan.textColor }}
                >
                  {plan.provider}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{plan.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {plan.speed} {L('Мбит/с', 'Мбит/с')}
                    {plan.tv > 0 && ` / ${plan.tv} ${L('ТВ', 'ТВ')}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-primary">{F(plan.price)} ₸</div>
                  <div className="text-[10px] text-muted-foreground">/ {L('ай', 'мес.')}</div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <TipBox>{L('Бағалар ресми сайттардан алынған, нақты бағаны оператордан тексеріңіз.', 'Цены взяты с официальных сайтов, уточняйте у оператора.')}</TipBox>
      <ShareBar tool={L('Байланыс тарифтері', 'Тарифы связи')} />
    </div>
  )
}
