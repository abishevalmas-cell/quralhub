'use client'

import { useState, useMemo } from 'react'
import { BackButton } from '@/components/layout/BackButton'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { InfoChip } from '@/components/shared/InfoChip'
import { useApp } from '@/components/layout/Providers'
import { TELECOM_DATA, CONVERGENT_DATA, OP_COLORS, OP_TEXT_LIGHT } from '@/lib/data/telecom'
import { ISP_DATA } from '@/lib/data/isp'
import { F } from '@/lib/constants'

type MobileFilter = 'all' | 'budget' | 'mid' | 'prem'
type IspFilter = 'all' | 'budget' | 'mid' | 'premium'
type MobileSort = 'price' | 'value'
type Tab = 'mobile' | 'home' | 'convergent'

export function ConnectPage() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [tab, setTab] = useState<Tab>('mobile')
  const [mobileFilter, setMobileFilter] = useState<MobileFilter>('all')
  const [mobileSort, setMobileSort] = useState<MobileSort>('price')
  const [ispFilter, setIspFilter] = useState<IspFilter>('all')

  const TABS: { key: Tab; icon: string; label: string }[] = [
    { key: 'mobile', icon: '\u{1F4F1}', label: L('\u04B0\u044F\u043B\u044B \u0431\u0430\u0439\u043B\u0430\u043D\u044B\u0441', '\u041C\u043E\u0431\u0438\u043B\u044C\u043D\u0430\u044F \u0441\u0432\u044F\u0437\u044C') },
    { key: 'home', icon: '\u{1F310}', label: L('\u04AE\u0439 \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442', '\u0414\u043E\u043C. \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442') },
    { key: 'convergent', icon: '\u{1F4E6}', label: L('\u041A\u043E\u043D\u0432\u0435\u0440\u0433\u0435\u043D\u0442 \u043F\u0430\u043A\u0435\u0442\u0442\u0435\u0440', '\u041A\u043E\u043D\u0432\u0435\u0440\u0433\u0435\u043D\u0442 \u043F\u0430\u043A\u0435\u0442\u044B') },
  ]

  const MOBILE_FILTERS: { key: MobileFilter; label: string }[] = [
    { key: 'all', label: L('\u0411\u0430\u0440\u043B\u044B\u0493\u044B', '\u0412\u0441\u0435') },
    { key: 'budget', label: L('5K\u20B8 \u0434\u0435\u0439\u0456\u043D', '5K\u20B8 \u0434\u043E') },
    { key: 'mid', label: '5\u20138K\u20B8' },
    { key: 'prem', label: '8K+\u20B8' },
  ]

  const ISP_FILTERS: { key: IspFilter; label: string }[] = [
    { key: 'all', label: L('\u0411\u0430\u0440\u043B\u044B\u0493\u044B', '\u0412\u0441\u0435') },
    { key: 'budget', label: L('\u0411\u044E\u0434\u0436\u0435\u0442', '\u0411\u044E\u0434\u0436\u0435\u0442') },
    { key: 'mid', label: L('\u041E\u0440\u0442\u0430\u0448\u0430', '\u0421\u0440\u0435\u0434\u043D\u0438\u0439') },
    { key: 'premium', label: L('\u041F\u0440\u0435\u043C\u0438\u0443\u043C', '\u041F\u0440\u0435\u043C\u0438\u0443\u043C') },
  ]

  /* ── Value-per-GB calculation ── */
  const valuePerGb = (price: number, gb: number) => {
    if (gb <= 0) return 0 // unlimited = best value
    return Math.round(price / gb)
  }

  /* ── Mobile filtering + sorting ── */
  const filteredMobile = useMemo(() => {
    let list = [...TELECOM_DATA]
    if (mobileFilter !== 'all') list = list.filter(p => p.tier === mobileFilter)
    if (mobileSort === 'value') {
      list.sort((a, b) => {
        const va = valuePerGb(a.price, a.gb)
        const vb = valuePerGb(b.price, b.gb)
        // unlimited (0) is best, so sort to top
        if (va === 0 && vb === 0) return a.price - b.price
        if (va === 0) return -1
        if (vb === 0) return 1
        return va - vb
      })
    } else {
      list.sort((a, b) => a.price - b.price)
    }
    return list
  }, [mobileFilter, mobileSort])

  const cheapestMobile = filteredMobile.length > 0 ? filteredMobile[0].price : null
  const bestValueMobile = useMemo(() => {
    const withData = filteredMobile.filter(p => p.gb > 0)
    if (withData.length === 0) return null
    return withData.reduce((best, p) => {
      const bv = valuePerGb(best.price, best.gb)
      const pv = valuePerGb(p.price, p.gb)
      return pv < bv ? p : best
    })
  }, [filteredMobile])

  /* ── ISP filtering ── */
  const filteredIsp = useMemo(() => {
    const all = ISP_DATA.flatMap(provider =>
      provider.plans.map(plan => ({ ...plan, provider: provider.name, color: provider.color, textColor: provider.textColor }))
    ).sort((a, b) => a.price - b.price)
    if (ispFilter === 'all') return all
    return all.filter(p => p.tier === ispFilter)
  }, [ispFilter])

  /* ── Convergent sorted by price ── */
  const sortedConvergent = useMemo(() => [...CONVERGENT_DATA].sort((a, b) => a.price - b.price), [])

  /* ── Helpers ── */
  const opBadge = (operator: string) => (
    <span
      className="text-[10px] px-2 py-1 rounded-full font-bold inline-block"
      style={{ backgroundColor: OP_COLORS[operator] || '#888', color: OP_TEXT_LIGHT[operator] ? '#000' : '#fff' }}
    >
      {operator}
    </span>
  )

  const renderGb = (gb: number) => gb === -1 ? L('\u0428\u0435\u043A\u0441\u0456\u0437', '\u0411\u0435\u0437\u043B\u0438\u043C\u0438\u0442') : `${gb} \u0413\u0411`
  const renderMin = (min: number) => min === -1 ? L('\u0428\u0435\u043A\u0441\u0456\u0437', '\u0411\u0435\u0437\u043B\u0438\u043C\u0438\u0442') : `${min} ${L('\u043C\u0438\u043D', '\u043C\u0438\u043D')}`

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-4">
        {L('\u0411\u0430\u0439\u043B\u0430\u043D\u044B\u0441 \u0442\u0430\u0440\u0438\u0444\u0442\u0435\u0440\u0456\u043D \u0441\u0430\u043B\u044B\u0441\u0442\u044B\u0440\u0443', '\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u0442\u0430\u0440\u0438\u0444\u043E\u0432 \u0441\u0432\u044F\u0437\u0438')}
      </h2>

      {/* ═══ Main Tabs ═══ */}
      <div className="grid grid-cols-3 gap-1.5 mb-5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold transition-all ${
              tab === t.key
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════
          MOBILE TAB
         ═══════════════════════════════════════════ */}
      {tab === 'mobile' && (
        <>
          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
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
            <span className="mx-1 text-border">|</span>
            <button
              onClick={() => setMobileSort(mobileSort === 'price' ? 'value' : 'price')}
              className="text-xs px-3.5 py-2 min-h-[36px] rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary font-semibold transition-colors"
            >
              {mobileSort === 'price'
                ? L('\u0422\u0438\u0456\u043C\u0434\u0456\u043B\u0456\u043A \u0431\u043E\u0439\u044B\u043D\u0448\u0430', '\u041F\u043E \u0432\u044B\u0433\u043E\u0434\u0435')
                : L('\u0411\u0430\u0493\u0430 \u0431\u043E\u0439\u044B\u043D\u0448\u0430', '\u041F\u043E \u0446\u0435\u043D\u0435')
              }
            </button>
          </div>

          {/* Visual comparison bars */}
          <div className="mb-4 p-4 bg-card border border-border rounded-xl">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              {L('\u0411\u0430\u0493\u0430/\u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442 \u0441\u0430\u043B\u044B\u0441\u0442\u044B\u0440\u0443', '\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u0446\u0435\u043D\u0430/\u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442')}
            </h3>
            <div className="space-y-2">
              {filteredMobile.map((plan, i) => {
                const maxPrice = Math.max(...filteredMobile.map(p => p.price))
                const pricePct = Math.round(plan.price / maxPrice * 100)
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-[54px] truncate font-semibold">{plan.operator}</span>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full flex items-center px-2 text-white text-[10px] font-bold"
                        style={{
                          width: `${pricePct}%`,
                          backgroundColor: OP_COLORS[plan.operator] || '#888',
                          color: OP_TEXT_LIGHT[plan.operator] ? '#000' : '#fff',
                          minWidth: '50px',
                        }}
                      >
                        {F(plan.price)}\u20B8
                      </div>
                    </div>
                    <span className="w-[48px] text-right font-medium text-blue-600 dark:text-blue-400">
                      {plan.gb === -1 ? '\u221E \u0413\u0411' : `${plan.gb} \u0413\u0411`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Plan cards */}
          <div className="space-y-2">
            {filteredMobile.map((plan, i) => {
              const isCheapest = plan.price === cheapestMobile
              const isBestValue = bestValueMobile && plan.operator === bestValueMobile.operator && plan.plan === bestValueMobile.plan
              const vpg = valuePerGb(plan.price, plan.gb)
              return (
                <div
                  key={i}
                  className={`bg-card border rounded-xl p-3.5 shadow-sm ${
                    isCheapest ? 'border-green-500 ring-1 ring-green-500/30' :
                    isBestValue ? 'border-blue-500 ring-1 ring-blue-500/30' :
                    'border-border'
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {opBadge(plan.operator)}
                      <span className="text-sm font-semibold">{plan.plan}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isCheapest && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold">
                          {L('\u0415\u04A3 \u0430\u0440\u0437\u0430\u043D', '\u0414\u0435\u0448\u0435\u0432\u043B\u0435')}
                        </span>
                      )}
                      {isBestValue && !isCheapest && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold">
                          {L('\u0415\u04A3 \u0442\u0438\u0456\u043C\u0434\u0456', '\u041B\u0443\u0447\u0448\u0430\u044F \u0446\u0435\u043D\u0430/\u0413\u0411')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {'📶'} {renderGb(plan.gb)}
                      </span>
                      {plan.min !== 0 && (
                        <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                          {'📞'} {renderMin(plan.min)}
                        </span>
                      )}
                      {plan.sms > 0 && (
                        <span className="text-xs font-medium text-teal-600 dark:text-teal-400">
                          \u2709\uFE0F {plan.sms} SMS
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-primary">{F(plan.price)} \u20B8</span>
                      <span className="text-[10px] text-muted-foreground ml-0.5">/{L('\u0430\u0439', '\u043C\u0435\u0441')}</span>
                    </div>
                  </div>

                  {/* Feature chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {plan.social && (
                      <InfoChip>{L('\u0421\u043E\u0446\u0441\u0435\u0442\u0456 \u0448\u0435\u043A\u0441\u0456\u0437', '\u0421\u043E\u0446\u0441\u0435\u0442\u0438 \u0431\u0435\u0437\u043B\u0438\u043C\u0438\u0442')}</InfoChip>
                    )}
                    {plan.roaming && (
                      <InfoChip>{L('\u0420\u043E\u0443\u043C\u0438\u043D\u0433', '\u0420\u043E\u0443\u043C\u0438\u043D\u0433')}: {plan.roaming}</InfoChip>
                    )}
                    {plan.gb > 0 && (
                      <InfoChip>{`${vpg} ₸/ГБ`}</InfoChip>
                    )}
                    {plan.gb === -1 && (
                      <InfoChip>{L('\u0428\u0435\u043A\u0441\u0456\u0437 \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442', '\u0411\u0435\u0437\u043B\u0438\u043C\u0438\u0442 \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442')}</InfoChip>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════
          HOME INTERNET TAB
         ═══════════════════════════════════════════ */}
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

          {/* Speed comparison bars */}
          <div className="mb-4 p-4 bg-card border border-border rounded-xl">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              {L('\u0416\u044B\u043B\u0434\u0430\u043C\u0434\u044B\u049B/\u0431\u0430\u0493\u0430 \u0441\u0430\u043B\u044B\u0441\u0442\u044B\u0440\u0443', '\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u0441\u043A\u043E\u0440\u043E\u0441\u0442\u044C/\u0446\u0435\u043D\u0430')}
            </h3>
            <div className="space-y-2">
              {filteredIsp.map((plan, i) => {
                const maxSpeed = Math.max(...filteredIsp.map(p => p.speed))
                const speedPct = Math.round(plan.speed / maxSpeed * 100)
                const pricePerMbit = Math.round(plan.price / plan.speed)
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold">{plan.provider} {plan.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{pricePerMbit}\u20B8/\u041C\u0431\u0438\u0442</span>
                        <span className="font-bold text-primary">{F(plan.price)}\u20B8</span>
                      </div>
                    </div>
                    <div className="flex gap-1 h-4">
                      <div className="flex-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${speedPct}%` }} />
                      </div>
                      <span className="text-[10px] w-[68px] text-right">{plan.speed} \u041C\u0431\u0438\u0442/\u0441</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-3 h-2 bg-blue-500 rounded-full inline-block"></span> {L('\u0416\u044B\u043B\u0434\u0430\u043C\u0434\u044B\u049B', '\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C')}
              </span>
            </div>
          </div>

          {/* ISP Plan cards */}
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
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      \u26A1 {plan.speed} {L('\u041C\u0431\u0438\u0442/\u0441', '\u041C\u0431\u0438\u0442/\u0441')}
                    </span>
                    {plan.tv > 0 && (
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                        {'📺'} {plan.tv} {L('\u0430\u0440\u043D\u0430', '\u043A\u0430\u043D\u0430\u043B\u043E\u0432')}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-primary">{F(plan.price)} \u20B8</span>
                    <span className="text-[10px] text-muted-foreground ml-0.5">/{L('\u0430\u0439', '\u043C\u0435\u0441')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════
          CONVERGENT TAB
         ═══════════════════════════════════════════ */}
      {tab === 'convergent' && (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {L(
              '\u041C\u043E\u0431\u0438\u043B\u044C\u0434\u0456 \u0431\u0430\u0439\u043B\u0430\u043D\u044B\u0441 + \u04AE\u0439 \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442 + \u0422\u0412 \u2014 \u0431\u0456\u0440 \u043F\u0430\u043A\u0435\u0442\u0442\u0435 \u0430\u0440\u0437\u0430\u043D\u044B\u0440\u0430\u049B.',
              '\u041C\u043E\u0431\u0438\u043B\u044C\u043D\u0430\u044F \u0441\u0432\u044F\u0437\u044C + \u0414\u043E\u043C\u0430\u0448\u043D\u0438\u0439 \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442 + \u0422\u0412 \u2014 \u0434\u0435\u0448\u0435\u0432\u043B\u0435 \u0432 \u043E\u0434\u043D\u043E\u043C \u043F\u0430\u043A\u0435\u0442\u0435.'
            )}
          </p>

          <div className="space-y-3">
            {sortedConvergent.map((pkg, i) => {
              const isCheapest = i === 0
              return (
                <div
                  key={i}
                  className={`bg-card border rounded-xl p-4 shadow-sm ${
                    isCheapest ? 'border-green-500 ring-1 ring-green-500/30' : 'border-border'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      {opBadge(pkg.operator)}
                      <span className="text-sm font-bold">{pkg.name}</span>
                    </div>
                    {isCheapest && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold">
                        {L('\u0415\u04A3 \u0430\u0440\u0437\u0430\u043D', '\u0414\u0435\u0448\u0435\u0432\u043B\u0435')}
                      </span>
                    )}
                  </div>

                  {/* What's included — icons row */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {/* Mobile */}
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <div className="text-lg mb-0.5">{'📱'}</div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">{L('\u04B0\u044F\u043B\u044B', '\u041C\u043E\u0431\u0438\u043B\u044C\u043D\u044B\u0439')}</div>
                      <div className="text-xs font-semibold mt-0.5">{renderGb(pkg.mobile.gb)}</div>
                      <div className="text-[10px] text-muted-foreground">{renderMin(pkg.mobile.min)}</div>
                    </div>
                    {/* Internet */}
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <div className="text-lg mb-0.5">{'🌐'}</div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">{L('\u0418\u043D\u0442\u0435\u0440\u043D\u0435\u0442', '\u0418\u043D\u0442\u0435\u0440\u043D\u0435\u0442')}</div>
                      <div className="text-xs font-semibold mt-0.5">{pkg.internet.speed} {L('\u041C\u0431\u0438\u0442/\u0441', '\u041C\u0431\u0438\u0442/\u0441')}</div>
                    </div>
                    {/* TV */}
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <div className="text-lg mb-0.5">{'📺'}</div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">{L('\u0422\u0412', '\u0422\u0412')}</div>
                      <div className="text-xs font-semibold mt-0.5">
                        {pkg.tv ? `${pkg.tv.channels} ${L('\u0430\u0440\u043D\u0430', '\u043A\u0430\u043D\u0430\u043B\u043E\u0432')}` : '\u2014'}
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {pkg.features.map((feat, j) => (
                      <InfoChip key={j}>{feat}</InfoChip>
                    ))}
                  </div>

                  {/* Price */}
                  <div className="flex items-center justify-end">
                    <span className="text-lg font-extrabold text-primary">{F(pkg.price)} \u20B8</span>
                    <span className="text-xs text-muted-foreground ml-1">/{L('\u0430\u0439', '\u043C\u0435\u0441')}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ═══ Context block ═══ */}
      <div className="mt-5 p-4 rounded-xl bg-muted/50 border border-border/50 mb-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          {L(
            '2026 \u0436\u044B\u043B\u044B \u041D\u0414\u0421 16%-\u0493\u0430 \u04E9\u0441\u043A\u0435\u043D\u0434\u0456\u043A\u0442\u0435\u043D \u0431\u0430\u0440\u043B\u044B\u049B \u0442\u0430\u0440\u0438\u0444\u0442\u0435\u0440 15-20% \u049B\u044B\u043C\u0431\u0430\u0442\u0442\u0430\u0434\u044B. \u0415\u04A3 \u0430\u0440\u0437\u0430\u043D \u0431\u0435\u0437\u043B\u0456\u043C\u0438\u0442 \u2014 Altel \u0410\u0440\u043D\u0430\u0443 (8 690\u20B8). \u0415\u04A3 \u0430\u0440\u0437\u0430\u043D \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442 \u043F\u0430\u043A\u0435\u0442 \u2014 IZI Ultra (2 690\u20B8/30\u0413\u0411). \u041D\u04E9\u043C\u0456\u0440\u0434\u0456 \u0441\u0430\u049B\u0442\u0430\u043F \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440 \u0430\u0443\u044B\u0441\u0442\u044B\u0440\u0443 (MNP) \u2014 \u0431\u0430\u0440\u043B\u044B\u049B \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u043B\u0430\u0440\u0434\u0430 \u0436\u04B1\u043C\u044B\u0441 \u0456\u0441\u0442\u0435\u0439\u0434\u0456. \u041A\u043E\u043D\u0432\u0435\u0440\u0433\u0435\u043D\u0442 \u043F\u0430\u043A\u0435\u0442\u0442\u0435\u0440 \u2014 \u0431\u04E9\u043B\u0435\u043A \u0430\u043B\u0493\u0430\u043D\u0493\u0430 \u049B\u0430\u0440\u0430\u0493\u0430\u043D\u0434\u0430 20-35% \u04AF\u043D\u0435\u043C\u0434\u0435\u0439\u0434\u0456.',
            '\u0412 2026 \u0433\u043E\u0434\u0443 \u0438\u0437-\u0437\u0430 \u043F\u043E\u0432\u044B\u0448\u0435\u043D\u0438\u044F \u041D\u0414\u0421 \u0434\u043E 16% \u0432\u0441\u0435 \u0442\u0430\u0440\u0438\u0444\u044B \u043F\u043E\u0434\u043E\u0440\u043E\u0436\u0430\u043B\u0438 \u043D\u0430 15-20%. \u0421\u0430\u043C\u044B\u0439 \u0434\u0435\u0448\u0451\u0432\u044B\u0439 \u0431\u0435\u0437\u043B\u0438\u043C\u0438\u0442 \u2014 Altel \u0410\u0440\u043D\u0430\u0443 (8 690\u20B8). \u0421\u0430\u043C\u044B\u0439 \u0434\u0435\u0448\u0451\u0432\u044B\u0439 \u043F\u0430\u043A\u0435\u0442 \u2014 IZI Ultra (2 690\u20B8/30\u0413\u0411). \u041F\u0435\u0440\u0435\u043D\u043E\u0441 \u043D\u043E\u043C\u0435\u0440\u0430 (MNP) \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u0443 \u0432\u0441\u0435\u0445 \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u043E\u0432. \u041A\u043E\u043D\u0432\u0435\u0440\u0433\u0435\u043D\u0442\u043D\u044B\u0435 \u043F\u0430\u043A\u0435\u0442\u044B \u044D\u043A\u043E\u043D\u043E\u043C\u044F\u0442 20-35% \u043F\u043E \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044E \u0441 \u043F\u043E\u043A\u0443\u043F\u043A\u043E\u0439 \u043F\u043E \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u0438.'
          )}
        </p>
      </div>

      <TipBox>
        {L(
          '\u0411\u0430\u0493\u0430\u043B\u0430\u0440 \u0440\u0435\u0441\u043C\u0438 \u0441\u0430\u0439\u0442\u0442\u0430\u0440\u0434\u0430\u043D \u0430\u043B\u044B\u043D\u0493\u0430\u043D, \u043D\u0430\u049B\u0442\u044B \u0431\u0430\u0493\u0430\u043D\u044B \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u0434\u0430\u043D \u0442\u0435\u043A\u0441\u0435\u0440\u0456\u04A3\u0456\u0437.',
          '\u0426\u0435\u043D\u044B \u0432\u0437\u044F\u0442\u044B \u0441 \u043E\u0444\u0438\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0445 \u0441\u0430\u0439\u0442\u043E\u0432, \u0443\u0442\u043E\u0447\u043D\u044F\u0439\u0442\u0435 \u0443 \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u0430.'
        )}
      </TipBox>
      <ShareBar tool={L('\u0411\u0430\u0439\u043B\u0430\u043D\u044B\u0441 \u0442\u0430\u0440\u0438\u0444\u0442\u0435\u0440\u0456', '\u0422\u0430\u0440\u0438\u0444\u044B \u0441\u0432\u044F\u0437\u0438')} />
    </div>
  )
}
