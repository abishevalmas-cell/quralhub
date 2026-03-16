'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { BackButton } from '@/components/layout/BackButton'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { useApp } from '@/components/layout/Providers'
import { cyrillicToLatin, latinToCyrillic } from '@/lib/kazakh/c2l'
import { SPELL_RULES } from '@/lib/kazakh/spellRules'
import { getWordOfDay } from '@/lib/data/wordOfDay'
import {
  TR_DICT,
  mergeDictEntries,
  translateOffline,
  isSingleWord,
  loadTrCache,
  getTrCache,
  saveTrCache,
} from '@/lib/data/dictionary'

const LANGS = [
  { code: 'kk', label: 'Қазақша' },
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
]

type TranslateMode = '' | 'Сөздік' | 'Google' | 'API (кэш)' | 'Сөздік (офлайн)'

type Tab = 'translate' | 'latin' | 'spell'

export function AiToolsPage() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [tab, setTab] = useState<Tab>('translate')
  const [copied, setCopied] = useState(false)

  // -- Dict loading --
  const [dictLoaded, setDictLoaded] = useState(false)
  useEffect(() => {
    fetch('/dict.json')
      .then(r => r.json())
      .then(data => { mergeDictEntries(data); setDictLoaded(true) })
      .catch(() => setDictLoaded(true))
    loadTrCache()
  }, [])

  // -- Word of the Day --
  const wordOfDay = getWordOfDay()

  // -- Translate --
  const [fromLang, setFromLang] = useState('kk')
  const [toLang, setToLang] = useState('ru')
  const [srcText, setSrcText] = useState('')
  const [translated, setTranslated] = useState('')
  const [loading, setLoading] = useState(false)
  const [trMode, setTrMode] = useState<TranslateMode>('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doTranslate = useCallback(async (text: string, sl: string, tl: string) => {
    if (!text.trim() || sl === tl) {
      setTranslated(text)
      setTrMode('')
      return
    }
    const offlineResult = translateOffline(text, sl, tl)
    if (offlineResult) {
      setTranslated(offlineResult)
      setTrMode('Сөздік')
    }
    const cacheKey = `${sl}-${tl}:${text}`
    const cached = getTrCache(cacheKey)
    if (cached) {
      setTranslated(cached)
      setTrMode('API (кэш)')
      return
    }
    setLoading(true)
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`
      const res = await fetch(url)
      const data = await res.json()
      if (data?.[0]?.[0]?.[0]) {
        const result = (data[0] as [string][]).map((s: string[]) => s[0]).join('')
        setTranslated(result)
        setTrMode('Google')
        saveTrCache(cacheKey, result)
      }
    } catch {
      if (!offlineResult) setTranslated(L('Аударуда қате болды', 'Ошибка перевода'))
      setTrMode(offlineResult ? 'Сөздік (офлайн)' : '')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!srcText.trim()) {
      setTranslated('')
      setTrMode('')
      return
    }
    const offlineResult = translateOffline(srcText, fromLang, toLang)
    if (offlineResult) {
      setTranslated(offlineResult)
      setTrMode('Сөздік')
    }
    const cacheKey = `${fromLang}-${toLang}:${srcText}`
    const cached = getTrCache(cacheKey)
    if (cached) {
      setTranslated(cached)
      setTrMode('API (кэш)')
      return
    }
    timerRef.current = setTimeout(() => {
      doTranslate(srcText, fromLang, toLang)
    }, 500)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [srcText, fromLang, toLang, doTranslate, dictLoaded])

  const swapLangs = () => {
    setFromLang(toLang)
    setToLang(fromLang)
    setSrcText(translated)
    setTranslated(srcText)
  }

  // -- Latin --
  const [latDir, setLatDir] = useState<'c2l' | 'l2c'>('c2l')
  const [latInput, setLatInput] = useState('')
  const latOutput = latDir === 'c2l' ? cyrillicToLatin(latInput) : latinToCyrillic(latInput)

  // -- Spell -- auto-check on input
  const [spellInput, setSpellInput] = useState('')
  const [spellResults, setSpellResults] = useState<{ word: string; correct: string; hint: string }[]>([])
  const spellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (spellTimerRef.current) clearTimeout(spellTimerRef.current)
    if (!spellInput.trim()) {
      setSpellResults([])
      return
    }
    spellTimerRef.current = setTimeout(() => {
      const input = spellInput.toLowerCase()
      const found: { word: string; correct: string; hint: string }[] = []
      for (const [wrong, correct, hint] of SPELL_RULES) {
        const re = new RegExp(wrong, 'gi')
        if (re.test(input) && wrong !== correct) {
          found.push({ word: wrong, correct, hint })
        }
      }
      setSpellResults(found)
    }, 300)
    return () => { if (spellTimerRef.current) clearTimeout(spellTimerRef.current) }
  }, [spellInput])

  const copyText = (text: string) => {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const modeBadge = (mode: TranslateMode) => {
    if (!mode) return null
    const isApi = mode === 'Google' || mode === 'API (кэш)'
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
        isApi ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
      }`}>
        {mode}
      </span>
    )
  }

  const sozdikLink = () => {
    const trimmed = srcText.trim()
    if (!isSingleWord(trimmed)) return null
    const slang = fromLang === 'kk' ? 'kk' : (fromLang === 'ru' ? 'ru' : 'en')
    return (
      <a
        href={`https://sozdik.kz/ru/dictionary/translate/${slang}/${toLang}/${encodeURIComponent(trimmed)}/`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] text-blue-600 hover:underline"
      >
        sozdik.kz →
      </a>
    )
  }

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">🧠 {L('Тіл құралдары', 'Языковые инструменты')}</h2>
      <p className="text-sm text-muted-foreground mb-4">{L('Аударма, латын жазу, емле тексеру — бәрі бір жерде', 'Перевод, латиница, проверка орфографии — всё в одном')}</p>

      {/* Word of the Day — frosted glass */}
      <div className="relative overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] mb-5">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100/30 via-orange-50/20 to-transparent dark:from-amber-900/20 dark:via-orange-900/10 pointer-events-none" />
        <div className="relative p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">📖 {L('Күннің сөзі', 'Слово дня')}</span>
            <a
              href={`https://sozdik.kz/ru/dictionary/translate/kk/ru/${encodeURIComponent(wordOfDay.kk)}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-blue-500 hover:underline"
            >
              sozdik.kz →
            </a>
          </div>
          <div className="text-center mb-4">
            <div className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-1">{wordOfDay.kk}</div>
            <div className="text-sm text-muted-foreground">{lang === 'ru' ? wordOfDay.ru : wordOfDay.en}</div>
          </div>
          <p className="text-xs text-center text-muted-foreground italic mb-3">«{wordOfDay.example}»</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-amber-300/40 dark:border-amber-700/40 bg-amber-100/50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">{wordOfDay.type}</span>
            {wordOfDay.origin && (
              <span className="text-[10px] text-muted-foreground">{wordOfDay.origin}</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1.5 mb-5">
        {([
          { id: 'translate' as Tab, icon: '🔄', label: L('Аударма', 'Перевод') },
          { id: 'latin' as Tab, icon: '🔤', label: L('Латын', 'Латиница') },
          { id: 'spell' as Tab, icon: '✏️', label: L('Емле', 'Орфография') },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === t.id
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* === TRANSLATE TAB === */}
      {tab === 'translate' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={fromLang}
              onChange={e => setFromLang(e.target.value)}
              className="h-9 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
            >
              {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            <button
              onClick={swapLangs}
              className="h-9 w-9 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors text-lg"
            >
              ⇄
            </button>
            <select
              value={toLang}
              onChange={e => setToLang(e.target.value)}
              className="h-9 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
            >
              {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            <div className="ml-auto flex items-center gap-2">
              {modeBadge(trMode)}
              {loading && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
            </div>
          </div>

          <div className="relative">
            <textarea
              value={srcText}
              onChange={e => setSrcText(e.target.value)}
              rows={4}
              placeholder={L('Мәтін жазыңыз...', 'Введите текст...')}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none resize-none focus:border-primary transition-colors"
            />
            <div className="absolute bottom-2 right-3 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{srcText.length}</span>
              {srcText && (
                <button onClick={() => { setSrcText(''); setTranslated('') }} className="text-[10px] text-muted-foreground hover:text-red-500">✕</button>
              )}
            </div>
          </div>

          <div className="relative">
            <textarea
              value={translated}
              readOnly
              rows={4}
              className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm outline-none resize-none"
            />
            <div className="absolute bottom-2 right-3 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{translated.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => copyText(translated)}
              className="text-[11px] px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {copied ? '✓' : ''} {L('Көшіру', 'Скопировать')}
            </button>
            {sozdikLink()}
          </div>
        </div>
      )}

      {/* === LATIN TAB === */}
      {tab === 'latin' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setLatDir(d => d === 'c2l' ? 'l2c' : 'c2l'); setLatInput('') }}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/30"
            >
              {latDir === 'c2l' ? L('Кирилл → Латын', 'Кирилл → Латиница') : L('Латын → Кирилл', 'Латиница → Кирилл')}
            </button>
          </div>

          <textarea
            value={latInput}
            onChange={e => setLatInput(e.target.value)}
            rows={3}
            placeholder={latDir === 'c2l' ? L('Кириллицамен жазыңыз...', 'Введите кириллицей...') : L('Латынша жазыңыз...', 'Введите латиницей...')}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none resize-none focus:border-primary transition-colors"
          />

          <div className="relative">
            <textarea
              value={latOutput}
              readOnly
              rows={3}
              className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm outline-none resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => copyText(latOutput)}
              className="text-[11px] px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-purple-500 hover:text-purple-500 transition-colors"
            >
              {copied ? '✓' : ''} {L('Көшіру', 'Скопировать')}
            </button>
            {latOutput && (
              <span className="text-[10px] text-muted-foreground">{latOutput.length} {L('таңба', 'символов')}</span>
            )}
          </div>

          {/* Quick examples */}
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200/30 dark:border-purple-800/20">
            <p className="text-[10px] font-bold text-purple-600 dark:text-purple-300 uppercase tracking-widest mb-2">{L('Мысалдар', 'Примеры')}</p>
            <div className="space-y-1 text-xs">
              {[
                { kz: 'Сәлеметсіз бе', lat: 'Sälemetsizbе' },
                { kz: 'Қазақстан', lat: 'Qazaqstan' },
                { kz: 'Рақмет', lat: 'Raqmet' },
              ].map((ex, i) => (
                <button
                  key={i}
                  onClick={() => { setLatDir('c2l'); setLatInput(ex.kz) }}
                  className="block w-full text-left hover:bg-purple-100/50 dark:hover:bg-purple-800/20 rounded px-2 py-1 transition-colors"
                >
                  <span className="font-semibold">{ex.kz}</span>
                  <span className="text-muted-foreground"> → {ex.lat}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === SPELL TAB === */}
      {tab === 'spell' && (
        <div className="space-y-3">
          <textarea
            value={spellInput}
            onChange={e => setSpellInput(e.target.value)}
            rows={4}
            placeholder={L('Қазақша мәтін жазыңыз — автоматты тексеріледі...', 'Введите казахский текст — проверка автоматическая...')}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none resize-none focus:border-primary transition-colors"
          />

          {spellInput.trim() && spellResults.length === 0 && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/40 dark:border-emerald-800/30">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">✓ {L('Қате табылмады!', 'Ошибок не найдено!')}</p>
            </div>
          )}

          {spellResults.length > 0 && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200/40 dark:border-red-800/30 space-y-2">
              <p className="text-xs font-bold text-red-600 dark:text-red-300">{spellResults.length} {L('қате табылды:', 'ошибок найдено:')}</p>
              {spellResults.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm flex-wrap">
                  <span className="bg-red-200/50 dark:bg-red-800/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded line-through">{r.word}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">{r.correct}</span>
                  {r.hint && <span className="text-[10px] text-muted-foreground">({r.hint})</span>}
                </div>
              ))}
              <button
                onClick={() => {
                  let fixed = spellInput
                  for (const { word, correct } of spellResults) {
                    fixed = fixed.replace(new RegExp(word, 'gi'), correct)
                  }
                  setSpellInput(fixed)
                }}
                className="text-[11px] px-3 py-1.5 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
              >
                {L('Барлығын түзету', 'Исправить всё')}
              </button>
            </div>
          )}

          {/* Common mistakes reference */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/30 dark:border-amber-800/20">
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-300 uppercase tracking-widest mb-2">{L('Жиі кездесетін қателер', 'Частые ошибки')}</p>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              {[
                ['зарплата', 'жалақы'],
                ['программа', 'бағдарлама'],
                ['документ', 'құжат'],
                ['информация', 'ақпарат'],
                ['компютер', 'компьютер'],
                ['справка', 'анықтама'],
              ].map(([wrong, correct], i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-red-500 line-through">{wrong}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">{correct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <TipBox>{L('Google Translate API қолданылады. Жақында Яндекс Translate қосылады — дәлдігі жоғары.', 'Используется Google Translate API. Скоро подключим Яндекс Translate — точность выше.')}</TipBox>
      <ShareBar tool={L('Тіл құралдары', 'Языковые инструменты')} />
    </div>
  )
}
