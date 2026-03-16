'use client'
import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/layout/BackButton'
import { ResultCard } from '@/components/shared/ResultCard'
import { ResultRow } from '@/components/shared/ResultRow'
import { ResultTotal } from '@/components/shared/ResultTotal'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { InfoChip } from '@/components/shared/InfoChip'
import {
  calcMarketplace,
  calcPlatformComparison,
  calcUnitsForTarget,
  calcBreakEvenPrice,
  calcWaterfall,
  CATEGORIES,
  PLATFORMS,
  type CategoryId,
  type FulfillmentType,
  type PlatformId,
} from '@/lib/calculations/marketplace'
import { F } from '@/lib/constants'
import { useApp } from '@/components/layout/Providers'

// ─── Section wrapper ─────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="text-base font-bold mb-3">{title}</h3>
      {children}
    </div>
  )
}

// ─── Visual bar (percentage) ─────────────────────────────────

function Bar({ percent, color }: { percent: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, percent))
  const bg =
    color === 'red' ? 'bg-red-500' :
    color === 'purple' ? 'bg-purple-500' :
    color === 'blue' ? 'bg-blue-500' :
    color === 'green' ? 'bg-green-500' :
    color === 'amber' ? 'bg-amber-500' :
    'bg-primary'
  return (
    <div className="w-full h-2.5 rounded-full bg-muted/60 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${bg}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────

export function MarketplaceCalc() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  // Inputs
  const [sellingPrice, setSellingPrice] = useState(15000)
  const [costPrice, setCostPrice] = useState(5000)
  const [packaging, setPackaging] = useState(200)
  const [quantity, setQuantity] = useState(100)
  const [category, setCategory] = useState<CategoryId>('electronics')
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('fbs')
  const [storageDays, setStorageDays] = useState(7)
  const [targetIncome, setTargetIncome] = useState(500000)
  const [activePlatform, setActivePlatform] = useState<PlatformId>('kaspi')

  // Active tab for sections
  const [tab, setTab] = useState<'comparison' | 'waterfall' | 'target'>('comparison')

  // Derived data
  const comparison = useMemo(
    () => sellingPrice > 0 && costPrice > 0
      ? calcPlatformComparison(sellingPrice, costPrice, packaging, category, fulfillment, storageDays)
      : [],
    [sellingPrice, costPrice, packaging, category, fulfillment, storageDays]
  )

  const activeConfig = PLATFORMS.find(p => p.id === activePlatform)!
  const activeCommission = activeConfig.commissions[category]
  const activeLogistics = activeConfig.logistics[fulfillment] + activeConfig.storageCostPerDay * storageDays

  const result = useMemo(
    () => sellingPrice > 0 && costPrice > 0 && quantity > 0
      ? calcMarketplace(sellingPrice, costPrice, activeCommission, activeLogistics, packaging, quantity)
      : null,
    [sellingPrice, costPrice, quantity, activeCommission, activeLogistics, packaging]
  )

  const waterfall = useMemo(
    () => sellingPrice > 0 && costPrice > 0
      ? calcWaterfall(sellingPrice, costPrice, activeCommission, activeLogistics, packaging)
      : [],
    [sellingPrice, costPrice, activeCommission, activeLogistics, packaging]
  )

  const breakEvenPrice = useMemo(
    () => calcBreakEvenPrice(costPrice, activeCommission, activeLogistics, packaging),
    [costPrice, activeCommission, activeLogistics, packaging]
  )

  const activeRow = comparison.find(r => r.platformId === activePlatform)

  const unitsNeeded = useMemo(
    () => activeRow && targetIncome > 0
      ? calcUnitsForTarget(targetIncome, activeRow.profitPerUnit)
      : -1,
    [activeRow, targetIncome]
  )

  // Max profit for comparison bar scaling
  const maxProfit = useMemo(() => {
    if (comparison.length === 0) return 1
    const max = Math.max(...comparison.map(r => Math.abs(r.profitPerUnit)))
    return max > 0 ? max : 1
  }, [comparison])

  // Parse input helper
  const parseNum = (v: string) => parseInt(v.replace(/\s/g, '')) || 0

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />

      {/* Header */}
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">
        {L('Маркетплейс калькулятор PRO', 'Калькулятор маркетплейса PRO')}
      </h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>Kaspi / WB / Ozon</InfoChip>
        <InfoChip>{L('Салыстыру', 'Сравнение')}</InfoChip>
        <InfoChip>Unit-economics</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        {L(
          'Kaspi, Wildberries, Ozon платформаларын салыстырыңыз. Таза пайда, маржа, қанша сату керек — бәрі бір жерде.',
          'Сравните Kaspi, Wildberries, Ozon. Чистая прибыль, маржа, сколько продать — всё в одном месте.'
        )}
      </p>

      {/* ═══ Category selector ═══ */}
      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
        {L('Категория', 'Категория')}
      </label>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              category === c.id
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-accent text-accent-foreground border border-primary/10 hover:border-primary/30'
            }`}
          >
            {lang === 'ru' ? c.labelRu : c.labelKz}
          </button>
        ))}
      </div>

      {/* ═══ Main inputs ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            {L('Сату бағасы (₸)', 'Цена продажи (₸)')}
          </label>
          <Input
            type="text"
            inputMode="numeric"
            value={sellingPrice || ''}
            onChange={e => setSellingPrice(parseNum(e.target.value))}
            className="text-base"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            {L('Өзіндік құны (₸)', 'Себестоимость (₸)')}
          </label>
          <Input
            type="text"
            inputMode="numeric"
            value={costPrice || ''}
            onChange={e => setCostPrice(parseNum(e.target.value))}
            className="text-base"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            {L('Қаптама / дана (₸)', 'Упаковка / шт (₸)')}
          </label>
          <Input
            type="text"
            inputMode="numeric"
            value={packaging || ''}
            onChange={e => setPackaging(parseNum(e.target.value))}
            className="text-base"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            {L('Саны (дана)', 'Количество (шт)')}
          </label>
          <Input
            type="text"
            inputMode="numeric"
            value={quantity || ''}
            onChange={e => setQuantity(parseNum(e.target.value))}
            className="text-base"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            {L('Сақтау (күн)', 'Хранение (дней)')}
          </label>
          <Input
            type="text"
            inputMode="numeric"
            value={storageDays || ''}
            onChange={e => setStorageDays(parseNum(e.target.value))}
            className="text-base"
          />
        </div>
      </div>

      {/* Fulfillment toggle */}
      <div className="flex gap-2 mb-4">
        {(['fbs', 'fbo'] as FulfillmentType[]).map(f => (
          <button
            key={f}
            onClick={() => setFulfillment(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              fulfillment === f
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-accent text-accent-foreground border border-primary/10 hover:border-primary/30'
            }`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ═══ Section tabs ═══ */}
      <div className="flex gap-1.5 border-b border-border/50 mb-1 overflow-x-auto pb-0">
        {[
          { id: 'comparison' as const, kz: 'Салыстыру', ru: 'Сравнение' },
          { id: 'waterfall' as const, kz: 'Unit-economics', ru: 'Unit-economics' },
          { id: 'target' as const, kz: 'Мақсат / Өзін-өзі ақтау', ru: 'Цель / Безубыточность' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {L(t.kz, t.ru)}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          TAB 1: Platform Comparison
         ════════════════════════════════════════════════════════ */}
      {tab === 'comparison' && comparison.length > 0 && (
        <Section title={L('Платформа салыстыру', 'Сравнение платформ')}>
          <div className="space-y-3">
            {comparison.map(row => {
              const barPercent = maxProfit > 0 ? (Math.max(0, row.profitPerUnit) / maxProfit) * 100 : 0
              const isNeg = row.profitPerUnit < 0
              return (
                <button
                  key={row.platformId}
                  onClick={() => setActivePlatform(row.platformId)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    activePlatform === row.platformId
                      ? 'bg-card border-primary/40 shadow-sm'
                      : 'bg-card/50 border-border/50 hover:border-border'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        row.color === 'red' ? 'bg-red-500' :
                        row.color === 'purple' ? 'bg-purple-500' :
                        'bg-blue-500'
                      }`} />
                      <span className="text-sm font-bold">{row.label}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {L('Комиссия', 'Комиссия')} {row.commissionPercent}%
                      </span>
                    </div>
                    <span className={`text-sm font-extrabold ${isNeg ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                      {isNeg ? '' : '+'}{F(row.profitPerUnit)} ₸
                    </span>
                  </div>
                  <Bar percent={barPercent} color={isNeg ? 'amber' : row.color} />
                  <div className="flex justify-between mt-1.5 text-[11px] text-muted-foreground">
                    <span>{L('Маржа', 'Маржа')}: {row.margin}%</span>
                    <span>ROI: {row.roi}%</span>
                    <span>{L('Логистика', 'Логистика')}: {F(row.logisticsCost)} ₸</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Detailed result for selected platform */}
          {result && (
            <ResultCard>
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                {activeConfig.label} — {quantity} {L('дана', 'шт')}
              </div>
              <ResultRow label={L('Жалпы түсім', 'Общая выручка')} value={`${F(result.revenue)} ₸`} />
              <ResultRow label={`${L('Комиссия', 'Комиссия')} (${activeCommission}%)`} value={`-${F(result.commission)} ₸`} color="red" />
              <ResultRow label={L('Логистика', 'Логистика')} value={`-${F(result.logistics)} ₸`} color="red" />
              <ResultRow label={L('Қаптама', 'Упаковка')} value={`-${F(result.packaging)} ₸`} color="red" />
              <ResultRow label={L('Өзіндік құн', 'Себестоимость')} value={`-${F(result.costPrice)} ₸`} color="red" />
              <ResultTotal
                label={L('ПАЙДА', 'ПРИБЫЛЬ')}
                value={`${result.profit >= 0 ? '+' : ''}${F(result.profit)} ₸`}
              />
              <ResultRow
                label={L('Маржа', 'Маржа')}
                value={`${result.margin}%`}
                color={result.margin >= 20 ? 'green' : result.margin >= 0 ? 'blue' : 'red'}
              />
              <ResultRow
                label="ROI"
                value={`${result.roi}%`}
                color={result.roi >= 30 ? 'green' : result.roi >= 0 ? 'blue' : 'red'}
              />
            </ResultCard>
          )}
        </Section>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB 2: Unit Economics Waterfall
         ════════════════════════════════════════════════════════ */}
      {tab === 'waterfall' && waterfall.length > 0 && (
        <Section title={L('Unit-economics (1 дана)', 'Unit-economics (1 шт)')}>
          <div className="p-4 rounded-xl bg-card border border-border/50 space-y-3">
            {/* Platform selector inline */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setActivePlatform(p.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    activePlatform === p.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-accent text-accent-foreground border border-primary/10 hover:border-primary/30'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Waterfall bars */}
            {waterfall.map((step, i) => {
              const maxVal = sellingPrice > 0 ? sellingPrice : 1
              const percent = Math.abs(step.value) / maxVal * 100
              const barColor =
                step.type === 'income' ? 'bg-green-500' :
                step.type === 'expense' ? 'bg-red-500/80' :
                step.value >= 0 ? 'bg-emerald-500' : 'bg-red-600'
              const textColor =
                step.type === 'income' ? 'text-green-600 dark:text-green-400' :
                step.type === 'expense' ? 'text-red-500 dark:text-red-400' :
                step.value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'

              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground font-medium">
                      {lang === 'ru' ? step.labelRu : step.labelKz}
                    </span>
                    <span className={`font-bold ${textColor}`}>
                      {step.type === 'expense' ? '-' : ''}{F(Math.abs(step.value))} ₸
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>
                </div>
              )
            })}

            {/* Summary line */}
            {activeRow && (
              <div className="pt-3 mt-2 border-t border-border/50 flex justify-between text-xs">
                <span className="text-muted-foreground">{L('Маржа', 'Маржа')}: <strong>{activeRow.margin}%</strong></span>
                <span className="text-muted-foreground">ROI: <strong>{activeRow.roi}%</strong></span>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB 3: Target income + Break-even
         ════════════════════════════════════════════════════════ */}
      {tab === 'target' && (
        <Section title={L('Мақсат және өзін-өзі ақтау', 'Цель и безубыточность')}>
          {/* Platform selector */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePlatform(p.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  activePlatform === p.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-accent text-accent-foreground border border-primary/10 hover:border-primary/30'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Break-even */}
          <div className="p-4 rounded-xl bg-card border border-border/50 mb-4">
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              {L('Өзін-өзі ақтау бағасы', 'Цена безубыточности')} ({activeConfig.label})
            </div>
            {breakEvenPrice > 0 ? (
              <div className="text-lg font-extrabold text-primary">
                {F(breakEvenPrice)} ₸
              </div>
            ) : (
              <div className="text-sm text-red-500">
                {L('Есептеу мүмкін емес (комиссия 100%+)', 'Невозможно рассчитать (комиссия 100%+)')}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              {L(
                'Бұл — барлық шығынды жабатын ең төменгі баға. Одан төмен сатсаңыз — залал.',
                'Это минимальная цена, покрывающая все расходы. Ниже неё — убыток.'
              )}
            </p>
            {breakEvenPrice > 0 && sellingPrice > 0 && (
              <div className={`text-xs font-semibold mt-2 ${sellingPrice >= breakEvenPrice ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                {sellingPrice >= breakEvenPrice
                  ? L(`Сіздің бағаңыз ${F(sellingPrice)} ₸ — рентабельді`, `Ваша цена ${F(sellingPrice)} ₸ — рентабельна`)
                  : L(`Сіздің бағаңыз ${F(sellingPrice)} ₸ — залалды! Кемінде ${F(breakEvenPrice)} ₸ қойыңыз`, `Ваша цена ${F(sellingPrice)} ₸ — убыточна! Ставьте минимум ${F(breakEvenPrice)} ₸`)
                }
              </div>
            )}
          </div>

          {/* Target income */}
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              {L('Айлық мақсат', 'Месячная цель')} ({activeConfig.label})
            </div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              {L('Қалаған айлық табыс (₸)', 'Желаемый месячный доход (₸)')}
            </label>
            <Input
              type="text"
              inputMode="numeric"
              value={targetIncome || ''}
              onChange={e => setTargetIncome(parseNum(e.target.value))}
              className="text-base mb-3"
            />

            {activeRow && (
              <>
                <div className="text-[11px] text-muted-foreground mb-2">
                  {L('1 данадан пайда', '1 шт прибыль')}: <strong className={activeRow.profitPerUnit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{F(activeRow.profitPerUnit)} ₸</strong>
                </div>

                {unitsNeeded > 0 ? (
                  <div className="space-y-2">
                    <div className="text-lg font-extrabold text-primary">
                      {F(unitsNeeded)} {L('дана / ай', 'шт / мес')}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      ~{F(Math.ceil(unitsNeeded / 30))} {L('дана / күн', 'шт / день')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {L('Жалпы айналым', 'Общий оборот')}: <strong>{F(unitsNeeded * sellingPrice)} ₸ / {L('ай', 'мес')}</strong>
                    </div>
                    {/* Visual indicator */}
                    <div className="mt-2">
                      <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                        <span>0</span>
                        <span>{F(targetIncome)} ₸</span>
                      </div>
                      <Bar percent={100} color="green" />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-red-500 font-semibold">
                    {L(
                      'Бұл бағамен мақсатқа жету мүмкін емес — пайда теріс. Бағаны көтеріңіз немесе шығынды азайтыңыз.',
                      'Невозможно достичь цели при текущей цене — прибыль отрицательная. Повысьте цену или снизьте расходы.'
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </Section>
      )}

      {/* ═══ Context block ═══ */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border/50 mt-6 mb-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          {L(
            'Kaspi Магазин — ҚР ең ірі маркетплейс (комиссия категорияға байланысты 5-12%). Wildberries — логистика + сақтау ақылы, маржа жоғары болуы тиіс. Ozon — баланстты комиссия, FBS/FBO моделі бар. Категория мен фулфилмент түрін таңдап, нақты шығынды көріңіз.',
            'Kaspi Магазин — крупнейший маркетплейс КЗ (комиссия 5-12% в зависимости от категории). Wildberries — платная логистика + хранение, нужна высокая маржа. Ozon — сбалансированная комиссия, модели FBS/FBO. Выберите категорию и тип фулфилмента для точного расчёта.'
          )}
        </p>
      </div>

      <TipBox>
        {L(
          'Маржа 30%-дан жоғары болса ғана маркетплейсте сату тиімді. WB мен Ozon-да логистика шығынын ескеріңіз — FBO қымбатырақ, бірақ жеткізу тезірек.',
          'Продавать на маркетплейсе выгодно при марже от 30%. На WB и Ozon учитывайте логистику — FBO дороже, но доставка быстрее.'
        )}
      </TipBox>

      <ShareBar tool="marketplace" text={L('Маркетплейс калькулятор PRO — Quralhub', 'Калькулятор маркетплейса PRO — Quralhub')} />
    </div>
  )
}
