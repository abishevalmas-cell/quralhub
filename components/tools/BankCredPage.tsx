'use client'
import { useState, useMemo, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/layout/BackButton'
import { ResultCard } from '@/components/shared/ResultCard'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { InfoChip } from '@/components/shared/InfoChip'
import { useApp } from '@/components/layout/Providers'
import { F } from '@/lib/constants'
import { BANKS, type CreditType } from '@/lib/data/banks'

/* ── Annuity calculator ── */
function calcPMT(principal: number, annualRate: number, months: number): number {
  const r = annualRate / 100 / 12
  if (r === 0) return principal / months
  return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

/* ── Result item type ── */
interface CreditResult {
  bankName: string
  shortName: string
  color: string
  logo: string
  product: string
  type: CreditType
  rate: number
  monthly: number
  total: number
  overpay: number
  maxAmount: number
  maxTerm: number
  features: string[]
}

/* ── Quick presets ── */
const PRESETS = [
  { amount: 1_000_000, term: 12, label: '1 млн / 12 ай' },
  { amount: 3_000_000, term: 24, label: '3 млн / 24 ай' },
  { amount: 5_000_000, term: 36, label: '5 млн / 36 ай' },
  { amount: 10_000_000, term: 60, label: '10 млн / 60 ай' },
] as const

/* ── Feature chip colors ── */
function featureColor(feature: string): string {
  if (feature.includes('0%')) return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
  if (feature.includes('Онлайн')) return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
  if (feature.includes('Жарна')) return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
  if (feature.includes('Кепілсіз')) return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
  return 'bg-accent/50 text-muted-foreground'
}

export function BankCredPage() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const TYPE_LABELS: Record<CreditType, string> = {
    consumer: L('Тұтыну', 'Потреб.'),
    mortgage: L('Ипотека', 'Ипотека'),
    auto: L('Авто', 'Авто'),
    business: L('Бизнес', 'Бизнес'),
    installment: L('Бөліп төлеу', 'Рассрочка'),
  }

  const TYPE_ICONS: Record<CreditType, string> = {
    consumer: '\uD83D\uDCB3',
    mortgage: '\uD83C\uDFE0',
    auto: '\uD83D\uDE97',
    business: '\uD83C\uDFE2',
    installment: '\uD83D\uDED2',
  }

  const [amount, setAmount] = useState(3_000_000)
  const [term, setTerm] = useState(24)
  const [filter, setFilter] = useState<CreditType>('consumer')
  const [showCompare, setShowCompare] = useState(false)

  const applyPreset = useCallback((a: number, t: number) => {
    setAmount(a)
    setTerm(t)
  }, [])

  /* ── Build sorted results ── */
  const results = useMemo(() => {
    const items: CreditResult[] = []

    BANKS.forEach(bank => {
      bank.credits.forEach(cred => {
        if (cred.type !== filter) return
        if (amount > cred.maxAmount || term > cred.maxTerm) return
        const monthly = calcPMT(amount, cred.rate, term)
        const total = monthly * term
        const overpay = total - amount
        items.push({
          bankName: bank.name,
          shortName: bank.shortName,
          color: bank.color,
          logo: bank.logo,
          product: cred.product,
          type: cred.type,
          rate: cred.rate,
          monthly,
          total,
          overpay,
          maxAmount: cred.maxAmount,
          maxTerm: cred.maxTerm,
          features: cred.features ?? [],
        })
      })
    })

    return items.sort((a, b) => a.monthly - b.monthly)
  }, [amount, term, filter])

  /* ── Count by type ── */
  const typeCounts = useMemo(() => {
    const counts: Partial<Record<CreditType, number>> = {}
    BANKS.forEach(bank => {
      bank.credits.forEach(cred => {
        counts[cred.type] = (counts[cred.type] ?? 0) + 1
      })
    })
    return counts
  }, [])

  const top3 = results.slice(0, 3)

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />

      {/* ── Header ── */}
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">
        {L('Банк кредиттері', 'Банковские кредиты')}
      </h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>{L('14 банк', '14 банков')}</InfoChip>
        <InfoChip>{L('5 кредит түрі', '5 типов кредитов')}</InfoChip>
        <InfoChip>{L('Аннуитет формуласы', 'Аннуитетная формула')}</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        {L(
          'Барлық банктердің кредит шарттарын салыстырыңыз. Сомасы мен мерзімін енгізіп, ең тиімді ұсынысты табыңыз.',
          'Сравните условия кредитов всех банков. Введите сумму и срок, чтобы найти лучшее предложение.'
        )}
      </p>

      {/* ── Quick presets ── */}
      <div className="mb-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
          {L('Жылдам таңдау', 'Быстрый выбор')}
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.amount, p.term)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                amount === p.amount && term === p.term
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-muted-foreground hover:border-primary hover:text-primary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input controls ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            {L('Сома (₸)', 'Сумма (₸)')}
          </label>
          <Input
            type="text"
            inputMode="numeric"
            value={amount ? F(amount) : ''}
            onChange={e => setAmount(parseInt(e.target.value.replace(/\s/g, '').replace(/,/g, '')) || 0)}
            className="text-base"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            {L('Мерзімі (ай)', 'Срок (мес.)')}
          </label>
          <select
            className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
            value={term}
            onChange={e => setTerm(Number(e.target.value))}
          >
            <option value={6}>6 {L('ай', 'мес.')}</option>
            <option value={12}>12 {L('ай', 'мес.')} (1 {L('жыл', 'год')})</option>
            <option value={24}>24 {L('ай', 'мес.')} (2 {L('жыл', 'года')})</option>
            <option value={36}>36 {L('ай', 'мес.')} (3 {L('жыл', 'года')})</option>
            <option value={48}>48 {L('ай', 'мес.')} (4 {L('жыл', 'года')})</option>
            <option value={60}>60 {L('ай', 'мес.')} (5 {L('жыл', 'лет')})</option>
            <option value={84}>84 {L('ай', 'мес.')} (7 {L('жыл', 'лет')})</option>
            <option value={120}>120 {L('ай', 'мес.')} (10 {L('жыл', 'лет')})</option>
            <option value={240}>240 {L('ай', 'мес.')} (20 {L('жыл', 'лет')})</option>
          </select>
        </div>
      </div>

      {/* ── Credit type filter ── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(Object.keys(TYPE_LABELS) as CreditType[]).map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${
              filter === t
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary'
            }`}
          >
            <span>{TYPE_ICONS[t]}</span>
            {TYPE_LABELS[t]}
            <span className="text-[10px] opacity-70">({typeCounts[t] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* ── Results ── */}
      {amount > 0 && results.length > 0 && (
        <>
          {/* Compare toggle */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground">
              {L(`${results.length} ұсыныс табылды`, `Найдено ${results.length} предложений`)}
            </p>
            {results.length >= 2 && (
              <button
                onClick={() => setShowCompare(!showCompare)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  showCompare
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-muted-foreground hover:border-primary'
                }`}
              >
                {showCompare
                  ? L('Тізімге оралу', 'Вернуться к списку')
                  : L('ТОП-3 салыстыру', 'Сравнить ТОП-3')
                }
              </button>
            )}
          </div>

          {/* ── Comparison mode ── */}
          {showCompare && top3.length >= 2 && (
            <div className="mb-5 p-4 bg-card border border-border rounded-xl">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                {L('ТОП-3 салыстыру', 'Сравнение ТОП-3')}
              </h3>
              <div className={`grid gap-3 ${top3.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {top3.map((item, idx) => (
                  <div key={`${item.bankName}-${item.product}-cmp`} className={`rounded-xl border p-3 text-center ${idx === 0 ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    {idx === 0 && (
                      <div className="text-[10px] font-bold text-green-600 dark:text-green-400 mb-1">
                        {L('Ең тиімді', 'Лучшее')}
                      </div>
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.logo}
                      width={28}
                      height={28}
                      alt={item.bankName}
                      className="rounded-lg mx-auto mb-1.5"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <p className="text-xs font-bold truncate">{item.shortName}</p>
                    <p className="text-[10px] text-muted-foreground truncate mb-2">{item.product}</p>

                    <div className="text-lg font-extrabold text-primary mb-0.5">{item.rate}%</div>
                    <p className="text-[10px] text-muted-foreground mb-3">{L('жылдық', 'годовых')}</p>

                    <div className="space-y-2">
                      <div className="bg-accent/30 rounded-lg p-2">
                        <p className="text-[9px] text-muted-foreground">{L('Ай сайын', 'Ежемесячно')}</p>
                        <p className="text-xs font-extrabold text-primary">{F(item.monthly)} ₸</p>
                      </div>
                      <div className="bg-accent/30 rounded-lg p-2">
                        <p className="text-[9px] text-muted-foreground">{L('Жалпы', 'Итого')}</p>
                        <p className="text-xs font-bold">{F(item.total)} ₸</p>
                      </div>
                      <div className="bg-accent/30 rounded-lg p-2">
                        <p className="text-[9px] text-muted-foreground">{L('Артық төлем', 'Переплата')}</p>
                        <p className="text-xs font-bold text-red-500">{F(item.overpay)} ₸</p>
                      </div>
                    </div>

                    {idx > 0 && (
                      <div className="mt-2 text-[10px] text-red-400">
                        +{F(item.overpay - top3[0].overpay)} ₸ {L('артық', 'больше')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 text-center">
                {L(
                  `Сома: ${F(amount)} ₸ | Мерзім: ${term} ай | ${TYPE_LABELS[filter]}`,
                  `Сумма: ${F(amount)} ₸ | Срок: ${term} мес. | ${TYPE_LABELS[filter]}`
                )}
              </p>
            </div>
          )}

          {/* Rate comparison chart */}
          {!showCompare && (
            <div className="mb-5 p-4 bg-card border border-border rounded-xl">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                {L('Ставка салыстыру', 'Сравнение ставок')}
              </h3>
              <div className="space-y-2">
                {results.slice(0, 8).map((bank, i) => {
                  const maxRate = Math.max(...results.map(b => b.rate))
                  const pct = maxRate > 0 ? Math.round(bank.rate / maxRate * 100) : 100
                  const isBest = i === 0
                  return (
                    <div key={`bar-${i}`} className="flex items-center gap-2 text-xs">
                      <span className="w-[70px] truncate font-semibold">{bank.shortName}</span>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full flex items-center justify-end px-2 text-white text-[10px] font-bold ${isBest ? 'bg-green-500' : 'bg-primary/70'}`}
                          style={{ width: `${Math.max(pct, 15)}%`, minWidth: '50px' }}
                        >
                          {bank.rate}%
                        </div>
                      </div>
                      <span className="w-[65px] text-right font-bold text-primary text-[11px]">
                        {F(bank.monthly)}₸
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {L('Жасыл = ең тиімді ставка', 'Зелёный = лучшая ставка')} | {L('Оңда = ай сайынғы төлем', 'Справа = ежемесячный платёж')}
              </p>
            </div>
          )}

          {/* ── Bank cards list ── */}
          {!showCompare && (
            <div className="space-y-3">
              {results.map((item, idx) => (
                <ResultCard key={`${item.bankName}-${item.product}`}>
                  <div className={`rounded-xl transition-all ${idx === 0 ? 'ring-2 ring-primary' : ''}`}>
                    {/* Header row */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.logo}
                          width={36}
                          height={36}
                          alt={item.bankName}
                          className="rounded-[10px] flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                        {idx < 3 && (
                          <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">{item.bankName}</div>
                        <div className="text-xs text-muted-foreground">{item.product}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{item.rate}%</div>
                        <div className="text-[10px] text-muted-foreground">{L('жылдық', 'годовых')}</div>
                      </div>
                    </div>

                    {/* Feature chips */}
                    {item.features.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {item.features.map(feat => (
                          <span
                            key={feat}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${featureColor(feat)}`}
                          >
                            {feat}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Meta chips */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/50 text-muted-foreground">
                        {L('Макс', 'Макс')}: {F(item.maxAmount)}₸
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/50 text-muted-foreground">
                        {L('Макс мерзім', 'Макс срок')}: {item.maxTerm} {L('ай', 'мес.')}
                      </span>
                      {idx === 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold">
                          {L('Ең тиімді!', 'Лучшее предложение!')}
                        </span>
                      )}
                    </div>

                    {/* Payment stats */}
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      <div className="bg-accent/30 rounded-xl p-2 sm:p-3 text-center">
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">{L('Ай сайын', 'Ежемесячно')}</p>
                        <p className="font-extrabold text-primary text-xs sm:text-sm">{F(item.monthly)} ₸</p>
                      </div>
                      <div className="bg-accent/30 rounded-xl p-2 sm:p-3 text-center">
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">{L('Жалпы', 'Итого')}</p>
                        <p className="font-bold text-xs sm:text-sm">{F(item.total)} ₸</p>
                      </div>
                      <div className="bg-accent/30 rounded-xl p-2 sm:p-3 text-center">
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">{L('Артық төлем', 'Переплата')}</p>
                        <p className="font-bold text-red-500 text-xs sm:text-sm">{F(item.overpay)} ₸</p>
                      </div>
                    </div>
                  </div>
                </ResultCard>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── No results ── */}
      {results.length === 0 && amount > 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm mb-2">
            {L('Бұл санаттағы банктер табылмады', 'Банки в этой категории не найдены')}
          </p>
          <p className="text-xs text-muted-foreground">
            {L('Сома немесе мерзімін өзгертіп көріңіз', 'Попробуйте изменить сумму или срок')}
          </p>
        </div>
      )}

      <TipBox>
        {L(
          'Нақты ставка сіздің кредит тарихыңыз бен табысыңызға байланысты. Банк менеджерімен кеңесіңіз.',
          'Реальная ставка зависит от вашей кредитной истории и дохода. Проконсультируйтесь с менеджером банка.'
        )}
      </TipBox>

      {/* ── Credit info section ── */}
      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-bold">
          {L('Кредит туралы пайдалы ақпарат', 'Полезная информация о кредитах')}
        </h3>

        {/* ГЭСВ */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-extrabold">%</span>
            {L('ГЭСВ дегеніміз не?', 'Что такое ГЭСВ?')}
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {L(
              'ГЭСВ (Жылдық тиімді сыйақы ставкасы) — кредиттің нақты құнын көрсететін көрсеткіш. Ол сыйақы ставкасын, комиссияларды және басқа да шығындарды қамтиды. ГЭСВ номиналды ставкадан әрқашан жоғары болады. Банктерді салыстырған кезде ГЭСВ-ке назар аударыңыз.',
              'ГЭСВ (Годовая эффективная ставка вознаграждения) — показатель реальной стоимости кредита. Он включает процентную ставку, комиссии и другие расходы. ГЭСВ всегда выше номинальной ставки. При сравнении банков обращайте внимание на ГЭСВ.'
            )}
          </p>
        </div>

        {/* Approval factors */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center text-xs">&#x2713;</span>
            {L('Кредит мақұлдауға не әсер етеді?', 'Что влияет на одобрение кредита?')}
          </h4>
          <ul className="text-xs text-muted-foreground leading-relaxed space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 text-[10px]">&#x25CF;</span>
              {L(
                'Кредит тарихы — бұрынғы кредиттер мен төлемдер тарихы',
                'Кредитная история — история прошлых кредитов и платежей'
              )}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 text-[10px]">&#x25CF;</span>
              {L(
                'Ресми табыс — жалақы анықтамасы немесе салық декларациясы',
                'Официальный доход — справка о зарплате или налоговая декларация'
              )}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 text-[10px]">&#x25CF;</span>
              {L(
                'Қазіргі борыштық жүктеме — басқа кредиттер бар-жоғы',
                'Текущая долговая нагрузка — наличие других кредитов'
              )}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 text-[10px]">&#x25CF;</span>
              {L(
                'Жас пен жұмыс стажы — кемінде 21 жас, 6 ай жұмыс стажы',
                'Возраст и стаж работы — минимум 21 год, 6 месяцев стажа'
              )}
            </li>
          </ul>
        </div>

        {/* Documents needed */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs">&#x1F4CB;</span>
            {L('Қажетті құжаттар', 'Необходимые документы')}
          </h4>
          <ul className="text-xs text-muted-foreground leading-relaxed space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 text-[10px]">&#x25CF;</span>
              {L('Жеке куәлік (ЖСН)', 'Удостоверение личности (ИИН)')}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 text-[10px]">&#x25CF;</span>
              {L(
                'Табыс анықтамасы (жалақы — 2ТЖ немесе банк үзінді-көшірмесі)',
                'Справка о доходах (зарплата — 2ТЖ или выписка из банка)'
              )}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 text-[10px]">&#x25CF;</span>
              {L(
                'Жұмыс орнынан анықтама (жұмыс стажы мен лауазымы)',
                'Справка с места работы (стаж и должность)'
              )}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 text-[10px]">&#x25CF;</span>
              {L(
                'Ипотека үшін: мүлік құжаттары, бағалау актісі',
                'Для ипотеки: документы на имущество, акт оценки'
              )}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 text-[10px]">&#x25CF;</span>
              {L(
                'Авто кредит үшін: көлік сату-сатып алу шарты',
                'Для автокредита: договор купли-продажи авто'
              )}
            </li>
          </ul>
        </div>

        {/* Tips */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs">&#x1F4A1;</span>
            {L('Кеңестер', 'Советы')}
          </h4>
          <ul className="text-xs text-muted-foreground leading-relaxed space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 text-[10px]">&#x25CF;</span>
              {L(
                'Бірнеше банкке бір уақытта өтініш беріңіз — бұл кредит тарихына әсер етпейді',
                'Подайте заявку в несколько банков одновременно — это не влияет на кредитную историю'
              )}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 text-[10px]">&#x25CF;</span>
              {L(
                'Ай сайынғы төлем табысыңыздың 50%-ынан аспауы керек',
                'Ежемесячный платёж не должен превышать 50% дохода'
              )}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 text-[10px]">&#x25CF;</span>
              {L(
                'Мерзімінен бұрын өтеуге құқығыңыз бар — бұл артық төлемді азайтады',
                'Вы имеете право на досрочное погашение — это снижает переплату'
              )}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 text-[10px]">&#x25CF;</span>
              {L(
                'Сақтандыру міндетті емес — бас тартуға болады (ставка өзгеруі мүмкін)',
                'Страховка не обязательна — можно отказаться (ставка может измениться)'
              )}
            </li>
          </ul>
        </div>
      </div>

      <ShareBar tool="bankcred" text={L('Банк кредиттері — Quralhub', 'Банковские кредиты — Quralhub')} />
    </div>
  )
}
