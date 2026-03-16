'use client'
import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/layout/BackButton'
import { ResultCard } from '@/components/shared/ResultCard'
import { ResultRow } from '@/components/shared/ResultRow'
import { ResultTotal } from '@/components/shared/ResultTotal'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { calcMortgage } from '@/lib/calculations/mortgage'
import { MORTGAGE_PROGRAMS, MORTGAGE_NEWS, type MortgageProgram } from '@/lib/data/mortgage'
import { F } from '@/lib/constants'
import { useApp } from '@/components/layout/Providers'

const TAG_STYLES = {
  new: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  info: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  warn: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
}
const TAG_LABELS = { new: 'ЖАҢА', info: 'ИНФО', warn: '⚠️' }

export function MortgageCalc() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz
  const isRu = lang === 'ru'

  const [selectedId, setSelectedId] = useState('otbasy-5')
  const [price, setPrice] = useState(30000000)
  const [down, setDown] = useState(20)
  const [years, setYears] = useState(20)
  const [rate, setRate] = useState(5)
  const [showNews, setShowNews] = useState(false)

  const program = MORTGAGE_PROGRAMS.find(p => p.id === selectedId)!

  const handleProgramChange = (id: string) => {
    const p = MORTGAGE_PROGRAMS.find(pr => pr.id === id)!
    setSelectedId(id)
    setRate(p.rate)
    setDown(p.minDown)
    setYears(p.maxYears)
  }

  const statePrograms = MORTGAGE_PROGRAMS.filter(p => p.type === 'state')
  const commercialPrograms = MORTGAGE_PROGRAMS.filter(p => p.type === 'commercial')

  const result = price > 0 && years > 0 && down < 100 ? calcMortgage(price, down, years, rate) : null

  // Compare: show all programs for same price
  const comparison = useMemo(() => {
    return MORTGAGE_PROGRAMS.map(p => {
      const d = Math.max(p.minDown, down)
      const y = Math.min(p.maxYears, years)
      const r = calcMortgage(price, d, y, p.rate)
      return { ...p, monthly: r.monthly, overpay: r.overpay, loan: r.loan, downPct: d, calcYears: y }
    }).sort((a, b) => a.monthly - b.monthly)
  }, [price, down, years])

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">🏠 {L('Ипотека калькуляторы', 'Ипотечный калькулятор')} — 2026</h2>
      <p className="text-sm text-muted-foreground mb-4">{L('Бағдарламаны таңдаңыз — шарттар автоматты толтырылады', 'Выберите программу — условия заполнятся автоматически')}</p>

      {/* News toggle */}
      <button
        onClick={() => setShowNews(!showNews)}
        className="w-full mb-4 py-2.5 rounded-xl text-xs font-bold transition-all bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 flex items-center justify-center gap-1.5"
      >
        📰 {L('Ипотека жаңалықтары', 'Новости ипотеки')} {showNews ? '▲' : '▼'}
      </button>

      {showNews && (
        <div className="space-y-2 mb-5 animate-in fade-in slide-in-from-top-2 duration-300">
          {MORTGAGE_NEWS.map((news, i) => (
            <div key={i} className="p-3 rounded-xl bg-card border border-border/60">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${TAG_STYLES[news.tag]}`}>{TAG_LABELS[news.tag]}</span>
                <span className="text-[10px] text-muted-foreground">{news.date}</span>
              </div>
              <p className="text-sm font-semibold mb-0.5">{isRu ? news.titleRu : news.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{isRu ? news.textRu : news.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Program selection */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-muted-foreground mb-2 block">{L('🏛️ Мемлекеттік бағдарламалар', '🏛️ Государственные программы')}</label>
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {statePrograms.map(p => (
            <button
              key={p.id}
              onClick={() => handleProgramChange(p.id)}
              className={`p-2.5 rounded-xl text-left transition-all border ${
                selectedId === p.id
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border/60 bg-card hover:border-primary/40'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-xs font-bold truncate">{isRu ? p.nameRu : p.name}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-extrabold text-primary">{p.rate}%</span>
                <span className="text-[10px] text-muted-foreground">{L('жарна', 'взнос')} {p.minDown}%+</span>
              </div>
            </button>
          ))}
        </div>

        <label className="text-xs font-semibold text-muted-foreground mb-2 block">{L('🏦 Коммерциялық банктер', '🏦 Коммерческие банки')}</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {commercialPrograms.map(p => (
            <button
              key={p.id}
              onClick={() => handleProgramChange(p.id)}
              className={`p-2.5 rounded-xl text-left transition-all border ${
                selectedId === p.id
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border/60 bg-card hover:border-primary/40'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-[11px] font-bold truncate">{p.bank}</span>
              </div>
              <span className="text-sm font-extrabold text-primary">{p.rate}%</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected program conditions */}
      <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 mb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: program.color }} />
          <span className="text-sm font-bold">{program.bank} — {isRu ? program.nameRu : program.name}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{isRu ? program.conditionsRu : program.conditions}</p>
        {program.note && (
          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1.5">
            ⚠️ {isRu ? program.noteRu : program.note}
          </p>
        )}
        <div className="flex gap-3 mt-2 text-[11px] text-muted-foreground">
          <span>{L('Макс.', 'Макс.')} {F(program.maxAmount)}₸</span>
          <span>{L('Мерзім', 'Срок')} {program.maxYears} {L('жыл', 'лет')}</span>
        </div>
      </div>

      {/* Inputs */}
      <div className="mb-3">
        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Тұрғын үй бағасы (₸)', 'Стоимость жилья (₸)')}</label>
        <Input className="text-base" type="text" inputMode="numeric" value={price || ''} onChange={e => setPrice(parseInt(e.target.value.replace(/\s/g, '')) || 0)} />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">{L('Жарна (%)', 'Взнос (%)')}</label>
          <Input className="text-sm" type="number" value={down} onChange={e => setDown(parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">{L('Мерзім (жыл)', 'Срок (лет)')}</label>
          <Input className="text-sm" type="number" value={years} onChange={e => setYears(parseInt(e.target.value) || 0)} />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">{L('Ставка (%)', 'Ставка (%)')}</label>
          <Input className="text-sm" type="number" step="0.5" value={rate} onChange={e => setRate(parseFloat(e.target.value) || 0)} />
        </div>
      </div>

      {/* Result */}
      {result && (
        <ResultCard>
          <ResultRow label={L('Тұрғын үй бағасы', 'Стоимость жилья')} value={`${F(result.price)} ₸`} />
          <ResultRow label={`${L('Жарна', 'Взнос')} (${down}%)`} value={`${F(result.downPayment)} ₸`} />
          <ResultRow label={L('Несие', 'Кредит')} value={`${F(result.loan)} ₸`} />
          <ResultRow label={L('Мөлшерлеме', 'Ставка')} value={`${rate}%`} />
          <ResultTotal label={L('Ай сайын', 'Ежемесячно')} value={`${F(result.monthly)} ₸`} />
          <div className="mt-3 pt-2 border-t border-border/50">
            <ResultRow label={L('Жалпы төлем', 'Общая выплата')} value={`${F(result.total)} ₸`} />
            <ResultRow label={L('Артық төлем', 'Переплата')} value={`${F(result.overpay)} ₸`} color="red" />
          </div>
        </ResultCard>
      )}

      {/* Comparison chart */}
      <div className="mt-4 mb-4 p-4 bg-card border border-border rounded-xl">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          {L('Барлық бағдарламаларды салыстыру', 'Сравнение всех программ')}
        </h3>
        <div className="space-y-2">
          {comparison.map((p) => {
            const maxMonthly = Math.max(...comparison.map(c => c.monthly))
            const pct = Math.round(p.monthly / maxMonthly * 100)
            const isSelected = p.id === selectedId
            return (
              <button
                key={p.id}
                onClick={() => handleProgramChange(p.id)}
                className={`w-full text-left transition-all rounded-lg p-1.5 ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
              >
                <div className="flex items-center justify-between text-[11px] mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className={`font-semibold truncate ${isSelected ? 'text-primary' : ''}`}>{p.bank}</span>
                    <span className="text-muted-foreground">{p.rate}%</span>
                  </div>
                  <span className="font-bold text-primary">{F(p.monthly)}₸/{L('ай', 'мес')}</span>
                </div>
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: p.color, opacity: isSelected ? 1 : 0.6 }}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Context block */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border/50 mb-4 text-sm leading-relaxed text-muted-foreground">
        <p>{L('Қазақстанда 2026 жылы ипотека нарығы: мемлекеттік бағдарламалар (2-7%) және коммерциялық банктер (17-19%). Отбасы банк — ең тиімді таңдау, бірақ кезекте тұру қажет. 7-20-25 — тек жаңа құрылыс. Коммерциялық банктер — жылдам мақұлдау, бірақ ставка жоғары.', 'Рынок ипотеки Казахстана в 2026 году: гос. программы (2-7%) и коммерческие банки (17-19%). Отбасы банк — самый выгодный, но нужна очередь. 7-20-25 — только новостройки. Коммерческие банки — быстрое одобрение, но ставка выше.')}</p>
      </div>

      <TipBox>
        {L(
          'Кеңес: Отбасы банкке алдын ала өтінім беріңіз — кезек 6-18 ай. Сол уақытта жарнаға ақша жинаңыз. 7-20-25 бағдарламасы 2027 жылға дейін жұмыс істейді.',
          'Совет: Подайте заявку в Отбасы банк заранее — очередь 6-18 мес. За это время копите на взнос. Программа 7-20-25 действует до 2027 года.'
        )}
      </TipBox>

      <ShareBar tool="mortgage" text={L('Ипотека калькуляторы — Quralhub', 'Ипотечный калькулятор — Quralhub')} />
    </div>
  )
}
