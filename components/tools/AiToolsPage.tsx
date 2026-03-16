'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { BackButton } from '@/components/layout/BackButton'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { useApp } from '@/components/layout/Providers'
import { cyrillicToLatin, latinToCyrillic } from '@/lib/kazakh/c2l'
import { SPELL_RULES } from '@/lib/kazakh/spellRules'
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
  { code: 'kk', label: 'Qazaqsha' },
  { code: 'ru', label: 'Russkiy' },
  { code: 'en', label: 'English' },
]

type TranslateMode = '' | 'Sozdik' | 'Google' | 'API (kesh)' | 'Sozdik (oflain)'

export function AiToolsPage() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  // -- Dict loading --
  const [dictLoaded, setDictLoaded] = useState(false)

  useEffect(() => {
    // Load extended dictionary from dict.json
    fetch('/dict.json')
      .then(r => r.json())
      .then(data => {
        mergeDictEntries(data)
        setDictLoaded(true)
      })
      .catch(() => setDictLoaded(true)) // proceed even if load fails

    // Load translation cache
    loadTrCache()
  }, [])

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

    // 1. Show offline result immediately
    const offlineResult = translateOffline(text, sl, tl)
    if (offlineResult) {
      setTranslated(offlineResult)
      setTrMode('Sozdik')
    }

    // 2. Check cache
    const cacheKey = `${sl}-${tl}:${text}`
    const cached = getTrCache(cacheKey)
    if (cached) {
      setTranslated(cached)
      setTrMode('API (kesh)')
      return
    }

    // 3. Debounced API call
    setLoading(true)
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`
      const res = await fetch(url)
      const data = await res.json()
      if (data && data[0] && data[0][0] && data[0][0][0]) {
        const result = (data[0] as [string][]).map((s: string[]) => s[0]).join('')
        setTranslated(result)
        setTrMode('Google')
        saveTrCache(cacheKey, result)
      }
    } catch {
      // API failed — keep offline result if we have it
      if (!offlineResult) {
        setTranslated(L('Аударуда қате болды', 'Ошибка перевода'))
      }
      setTrMode(offlineResult ? 'Sozdik (oflain)' : '')
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

    // Show offline result immediately (no debounce)
    const offlineResult = translateOffline(srcText, fromLang, toLang)
    if (offlineResult) {
      setTranslated(offlineResult)
      setTrMode('Sozdik')
    }

    // Check cache immediately too
    const cacheKey = `${fromLang}-${toLang}:${srcText}`
    const cached = getTrCache(cacheKey)
    if (cached) {
      setTranslated(cached)
      setTrMode('API (kesh)')
      return // no need for API call
    }

    // Debounce the API call
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

  // -- Spell --
  const [spellInput, setSpellInput] = useState('')
  const [spellResults, setSpellResults] = useState<{ word: string; correct: string; hint: string }[]>([])
  const [spellChecked, setSpellChecked] = useState(false)

  const checkSpell = () => {
    const input = spellInput.toLowerCase()
    const found: { word: string; correct: string; hint: string }[] = []
    for (const [wrong, correct, hint] of SPELL_RULES) {
      const re = new RegExp(wrong, 'gi')
      if (re.test(input) && wrong !== correct) {
        found.push({ word: wrong, correct, hint })
      }
    }
    setSpellResults(found)
    setSpellChecked(true)
  }

  const highlightSpell = () => {
    if (!spellChecked || spellResults.length === 0) return spellInput
    let text = spellInput
    for (const { word } of spellResults) {
      text = text.replace(
        new RegExp(`(${word})`, 'gi'),
        '\u27E8$1\u27E9'
      )
    }
    return text
  }

  // Mode badge styling
  const modeBadge = (mode: TranslateMode) => {
    if (!mode) return null
    const isApi = mode === 'Google' || mode === 'API (kesh)'
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
        style={{
          background: isApi ? '#DCFCE7' : '#DBEAFE',
          color: isApi ? '#166534' : '#1E40AF',
        }}
      >
        {mode}
      </span>
    )
  }

  // sozdik.kz link for single words
  const sozdikLink = () => {
    const trimmed = srcText.trim()
    if (!isSingleWord(trimmed)) return null
    const fromIsKk = fromLang === 'kk'
    const slang = fromIsKk ? 'kk' : (fromLang === 'ru' ? 'ru' : 'en')
    return (
      <a
        href={`https://sozdik.kz/ru/dictionary/translate/${slang}/${toLang}/${encodeURIComponent(trimmed)}/`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:underline"
      >
        {L('sozdik.kz-де қарау', 'Смотреть на sozdik.kz')}
      </a>
    )
  }

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-4">{L('AI Til quraldarı', 'AI Языковые инструменты')}</h2>

      {/* Section 1: Translate */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm border-l-4 border-l-blue-500 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">{L('Аудару', 'Перевод')}</h3>
          <div className="flex items-center gap-2">
            {modeBadge(trMode)}
            {loading && (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <select
            value={fromLang}
            onChange={e => setFromLang(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
          >
            {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          <button
            onClick={swapLangs}
            className="h-8 w-8 rounded-lg border border-input flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
            title="Swap"
          >
            &#8596;
          </button>
          <select
            value={toLang}
            onChange={e => setToLang(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
          >
            {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        <div className="relative">
          <textarea
            value={srcText}
            onChange={e => setSrcText(e.target.value)}
            rows={4}
            placeholder={L('Мәтін жазыңыз...', 'Введите текст...')}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none resize-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          />
          <div className="absolute bottom-2 right-3 text-[11px] text-muted-foreground">
            {srcText.length} {L('таңба', 'символов')}
          </div>
        </div>
        <div className="flex items-center gap-2 my-2 flex-wrap">
          <button
            onClick={() => { setSrcText(''); setTranslated(''); setTrMode('') }}
            className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            {L('Тазалау', 'Очистить')}
          </button>
          <button
            onClick={() => navigator.clipboard?.writeText(translated)}
            className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            {L('Көшіру', 'Скопировать')}
          </button>
          {sozdikLink()}
        </div>
        <div className="relative">
          <textarea
            value={translated}
            readOnly
            rows={4}
            className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm outline-none resize-none"
          />
          <div className="absolute bottom-2 right-3 text-[11px] text-muted-foreground">
            {translated.length} {L('таңба', 'символов')}
          </div>
        </div>
      </div>

      {/* Section 2: Cyrillic <-> Latin */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm border-l-4 border-l-purple-500 mb-5">
        <h3 className="text-lg font-bold mb-3">
          {latDir === 'c2l' ? L('Кирилл \u2192 Латын', 'Кирилл \u2192 Латын') : L('Латын \u2192 Кирилл', 'Латын \u2192 Кирилл')}
        </h3>
        <button
          onClick={() => { setLatDir(d => d === 'c2l' ? 'l2c' : 'c2l'); setLatInput('') }}
          className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-purple-500 hover:text-purple-500 transition-colors mb-3"
        >
          &#8596; {L('Бағытты ауыстыру', 'Поменять направление')}
        </button>
        <textarea
          value={latInput}
          onChange={e => setLatInput(e.target.value)}
          rows={3}
          placeholder={latDir === 'c2l' ? L('Кириллица мәтін...', 'Текст кириллицей...') : 'Latin text...'}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none resize-none focus:border-ring focus:ring-2 focus:ring-ring/50"
        />
        <textarea
          value={latOutput}
          readOnly
          rows={3}
          className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm outline-none resize-none mt-2"
        />
      </div>

      {/* Section 3: Spell check */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm border-l-4 border-l-amber-500 mb-5">
        <h3 className="text-lg font-bold mb-3">{L('Емле тексеру', 'Проверка орфографии')}</h3>
        <textarea
          value={spellInput}
          onChange={e => { setSpellInput(e.target.value); setSpellChecked(false) }}
          rows={3}
          placeholder={L('Мәтінді жазыңыз...', 'Введите текст...')}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none resize-none focus:border-ring focus:ring-2 focus:ring-ring/50"
        />
        <button
          onClick={checkSpell}
          className="mt-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {L('Тексеру', 'Проверить')}
        </button>
        {spellChecked && (
          <div className="mt-3">
            {spellResults.length === 0 ? (
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">{L('Қате табылмады!', 'Ошибок не найдено!')}</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  {highlightSpell()}
                </p>
                <div className="space-y-1">
                  {spellResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">{r.word}</span>
                      <span className="text-muted-foreground">&rarr;</span>
                      <span className="font-semibold text-green-700 dark:text-green-300">{r.correct}</span>
                      {r.hint && <span className="text-xs text-muted-foreground">({r.hint})</span>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <TipBox>{L('Google Translate API қолданылады. Дәлдігі жоғары болмауы мүмкін.', 'Используется Google Translate API. Точность может быть невысокой.')}</TipBox>
      <ShareBar tool={L('AI Тіл құралдары', 'AI Языковые инструменты')} />
    </div>
  )
}
