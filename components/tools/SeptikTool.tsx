'use client'

import { useState } from 'react'
import { BackButton } from '@/components/layout/BackButton'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { useApp } from '@/components/layout/Providers'
import { Input } from '@/components/ui/input'
import { declineNoun, type DeclensionResult } from '@/lib/kazakh/septik'
import { numToKazakh } from '@/lib/kazakh/numToKazakh'

const SEPTIK_NAMES: { key: keyof DeclensionResult; name: string; nameRu: string; question: string }[] = [
  { key: 'atau', name: 'Атау', nameRu: 'Именительный', question: 'Кім? Не?' },
  { key: 'ilik', name: 'Ілік', nameRu: 'Родительный', question: 'Кімнің? Ненің?' },
  { key: 'barys', name: 'Барыс', nameRu: 'Дательный', question: 'Кімге? Неге?' },
  { key: 'tabys', name: 'Табыс', nameRu: 'Винительный', question: 'Кімді? Нені?' },
  { key: 'jatys', name: 'Жатыс', nameRu: 'Местный', question: 'Кімде? Неде?' },
  { key: 'shygys', name: 'Шығыс', nameRu: 'Исходный', question: 'Кімнен? Неден?' },
  { key: 'komektes', name: 'Көмектес', nameRu: 'Творительный', question: 'Кіммен? Немен?' },
]

type Tab = 'word' | 'number' | 'position' | 'month' | 'day'

const POSITIONS = ['директор', 'бухгалтер', 'менеджер', 'инженер', 'маман', 'кеңесші', 'хатшы', 'тілмаш']
const MONTHS = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан']
const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const DAYS = ['дүйсенбі', 'сейсенбі', 'сәрсенбі', 'бейсенбі', 'жұма', 'сенбі', 'жексенбі']
const DAYS_RU = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

function ResultTable({ result, isRu }: { result: DeclensionResult; isRu: boolean }) {
  return (
    <div className="space-y-1 mt-3">
      {SEPTIK_NAMES.map(s => (
        <div key={s.key} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
          <span className="text-[11px] font-medium text-muted-foreground w-[90px] flex-shrink-0">{isRu ? s.nameRu : s.name}</span>
          <span className="text-[10px] text-muted-foreground w-[80px] flex-shrink-0">{s.question}</span>
          <span className="text-sm font-semibold text-primary">{result[s.key]}</span>
        </div>
      ))}
    </div>
  )
}

export function SeptikTool() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz
  const isRu = lang === 'ru'

  const [tab, setTab] = useState<Tab>('word')
  const [wordInput, setWordInput] = useState('мектеп')
  const [numInput, setNumInput] = useState('')
  const [posInput, setPosInput] = useState(POSITIONS[0])
  const [customPos, setCustomPos] = useState('')
  const [monthIdx, setMonthIdx] = useState(0)
  const [dayIdx, setDayIdx] = useState(0)

  const wordResult = wordInput.trim() ? declineNoun(wordInput.trim()) : null
  const numWord = numInput ? numToKazakh(Number(numInput)) : ''
  const numResult = numWord ? declineNoun(numWord) : null
  const posWord = customPos.trim() || posInput
  const posResult = posWord ? declineNoun(posWord.split(/\s+/).pop() || posWord) : null
  const monthResult = declineNoun(MONTHS[monthIdx])
  const dayResult = declineNoun(DAYS[dayIdx])

  const TABS: { id: Tab; label: string }[] = [
    { id: 'word', label: L('Сөз', 'Слово') },
    { id: 'number', label: L('Сан', 'Число') },
    { id: 'position', label: L('Лауазым', 'Должность') },
    { id: 'month', label: L('Ай', 'Месяц') },
    { id: 'day', label: L('Күн', 'День') },
  ]

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">{L('Септік құралы', 'Склонение (септік)')}</h2>
      <p className="text-sm text-muted-foreground mb-4">{L('Қазақ тілінде сөзді 7 септікке жіктеу', 'Склонение слов по 7 падежам казахского языка')}</p>

      {/* Tabs — flex wrap, no overlap */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-xs px-3.5 py-2 min-h-[36px] rounded-full font-semibold transition-colors ${
              tab === t.id
                ? 'bg-primary text-primary-foreground'
                : 'border border-border text-muted-foreground hover:border-primary hover:text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Word */}
      {tab === 'word' && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Сөзді жазыңыз', 'Введите слово')}</label>
          <Input value={wordInput} onChange={e => setWordInput(e.target.value)} placeholder="мектеп, қала, бала..." className="text-base" />
          {wordResult && <ResultTable result={wordResult} isRu={isRu} />}
        </div>
      )}

      {/* Number */}
      {tab === 'number' && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Санды жазыңыз', 'Введите число')}</label>
          <Input type="text" inputMode="numeric" value={numInput} onChange={e => setNumInput(e.target.value.replace(/\D/g, ''))} placeholder="54321" className="text-base" />
          {numWord && <p className="mt-2 text-sm text-muted-foreground">{L('Сөзбен', 'Прописью')}: <span className="font-semibold text-foreground">{numWord}</span></p>}
          {numResult && <ResultTable result={numResult} isRu={isRu} />}
        </div>
      )}

      {/* Position */}
      {tab === 'position' && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Лауазым', 'Должность')}</label>
          <select
            value={posInput}
            onChange={e => { setPosInput(e.target.value); setCustomPos('') }}
            className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary mb-2"
          >
            {POSITIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
          <Input value={customPos} onChange={e => setCustomPos(e.target.value)} placeholder={L('Немесе өзіңіз жазыңыз...', 'Или введите свою...')} className="text-sm" />
          {posResult && <ResultTable result={posResult} isRu={isRu} />}
        </div>
      )}

      {/* Month */}
      {tab === 'month' && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Айды таңдаңыз', 'Выберите месяц')}</label>
          <select
            value={monthIdx}
            onChange={e => setMonthIdx(Number(e.target.value))}
            className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{isRu ? MONTHS_RU[i] : m.charAt(0).toUpperCase() + m.slice(1)}</option>
            ))}
          </select>
          <ResultTable result={monthResult} isRu={isRu} />
        </div>
      )}

      {/* Day */}
      {tab === 'day' && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Апта күні', 'День недели')}</label>
          <select
            value={dayIdx}
            onChange={e => setDayIdx(Number(e.target.value))}
            className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>{isRu ? DAYS_RU[i] : d.charAt(0).toUpperCase() + d.slice(1)}</option>
            ))}
          </select>
          <ResultTable result={dayResult} isRu={isRu} />
        </div>
      )}

      <TipBox>{L('Септіктеу — ресми құжаттар, іскерлік хаттар, өтініштерге қажет. Дұрыс септік формасын қолданыңыз.', 'Склонение необходимо для официальных документов, деловых писем, заявлений. Используйте правильную форму падежа.')}</TipBox>
      <ShareBar tool={L('Септік құрал', 'Склонение')} />
    </div>
  )
}
