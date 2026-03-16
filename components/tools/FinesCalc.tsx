'use client'
import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/layout/BackButton'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { InfoChip } from '@/components/shared/InfoChip'
import { useApp } from '@/components/layout/Providers'
import { FINES, FINE_CATEGORIES } from '@/lib/data/fines'
import { F, MRP } from '@/lib/constants'
import { Search, AlertTriangle } from 'lucide-react'

export function FinesCalc() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz
  const isRu = lang === 'ru'

  const [category, setCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [mrpInput, setMrpInput] = useState<number>(0)

  const filtered = useMemo(() => {
    let list = FINES
    if (category !== 'all') {
      list = list.filter(f => f.category === category)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(f =>
        f.description.toLowerCase().includes(q) ||
        f.descriptionRu.toLowerCase().includes(q) ||
        f.article.toLowerCase().includes(q)
      )
    }
    return list
  }, [category, search])

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">{L('🚔 ПДД Штрафтар — 2026', '🚔 Штрафы ПДД — 2026')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>{L('МРП', 'МРП')} = {F(MRP)}₸</InfoChip>
        <InfoChip>{L('7 күнде -50%', '7 дней -50%')}</InfoChip>
        <InfoChip>{FINES.length} {L('штраф', 'штрафов')}</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        {L('Қазақстан жол қозғалысы ережелерін бұзғаны үшін штрафтар анықтамалығы', 'Справочник штрафов за нарушение ПДД Казахстана')}
      </p>

      {/* Quick MRP converter */}
      <div className="p-4 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/60 shadow-sm mb-4">
        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
          {L('Сіздің штрафыңыз неше МРП?', 'Сколько МРП ваш штраф?')}
        </label>
        <div className="flex gap-3 items-center">
          <Input
            type="text"
            inputMode="numeric"
            placeholder={L('МРП саны', 'Кол-во МРП')}
            value={mrpInput || ''}
            onChange={e => setMrpInput(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
            className="text-base flex-1"
          />
          <div className="text-lg font-bold text-primary whitespace-nowrap">
            = {F(mrpInput * MRP)}₸
          </div>
        </div>
        {mrpInput > 0 && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium">
            {L('7 күн ішінде төлесеңіз', 'При оплате в течение 7 дней')}: {F(mrpInput * MRP * 0.5)}₸ ({L('50% жеңілдік', 'скидка 50%')})
          </p>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={L('Штрафты іздеу...', 'Поиск штрафа...')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => setCategory('all')}
          className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all ${
            category === 'all'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-accent text-accent-foreground border-border hover:border-primary/40'
          }`}
        >
          {L('Барлығы', 'Все')}
        </button>
        {FINE_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all ${
              category === cat.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-accent text-accent-foreground border-border hover:border-primary/40'
            }`}
          >
            {cat.icon} {isRu ? (cat.nameRu || cat.name) : cat.name}
          </button>
        ))}
      </div>

      {/* Fines list */}
      <div className="space-y-2.5">
        {filtered.map(fine => (
          <div
            key={fine.id}
            className="p-4 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/60 shadow-sm hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-snug">{isRu ? fine.descriptionRu : fine.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{isRu ? fine.description : fine.descriptionRu}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  📖 {fine.article}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-primary">{fine.mrp} {L('МРП', 'МРП')}</p>
                <p className="text-xs text-muted-foreground">{F(fine.amount)}₸</p>
              </div>
            </div>

            {fine.repeat && (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                🔄 {L('Қайталағанда', 'При повторном')}: {fine.repeat} {L('МРП', 'МРП')} ({F(fine.repeat * MRP)}₸)
              </p>
            )}

            {fine.note && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-2.5 py-1.5 border border-amber-200/30 dark:border-amber-800/30">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {fine.note}
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {L('Штраф табылмады. Іздеуді өзгертіп көріңіз.', 'Штраф не найден. Попробуйте изменить поиск.')}
        </div>
      )}

      {/* Context block */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border/50 mb-4 text-sm leading-relaxed text-muted-foreground">
        <p>{L('Штрафты 7 күнтізбелік күн ішінде төлесеңіз — 50% жеңілдік (ӘҚБтК 810-бап). Kaspi қосымшасы немесе eGov.kz арқылы төлеуге болады. Камерадан келген штрафты 10 жұмыс күні ішінде сотқа даулауға болады.', 'При оплате штрафа в течение 7 календарных дней — скидка 50% (ст. 810 КоАП). Оплатить можно через Kaspi или eGov.kz. Штраф с камеры можно обжаловать в суде в течение 10 рабочих дней.')}</p>
      </div>

      <TipBox>
        {L('Штрафты 7 күн ішінде төлесеңіз — 50% жеңілдік (ӘҚБтК 810-бап). Kaspi, Egov.kz немесе банк арқылы төлеуге болады.', 'При оплате штрафа в течение 7 дней — скидка 50% (ст. 810 КоАП). Оплатить можно через Kaspi, Egov.kz или банк.')}
      </TipBox>

      <ShareBar tool="fines" text={L('ПДД Штрафтар калькуляторы — Quralhub', 'Калькулятор штрафов ПДД — Quralhub')} />
    </div>
  )
}
