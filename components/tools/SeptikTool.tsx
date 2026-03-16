'use client'

import { useState } from 'react'
import { BackButton } from '@/components/layout/BackButton'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { useApp } from '@/components/layout/Providers'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { declineNoun, type DeclensionResult } from '@/lib/kazakh/septik'
import { numToKazakh } from '@/lib/kazakh/numToKazakh'

const SEPTIK_NAMES: { key: keyof DeclensionResult; name: string; nameRu: string; question: string; questionRu: string }[] = [
  { key: 'atau', name: 'Атау', nameRu: 'Именительный', question: 'Кім? Не?', questionRu: 'Кто? Что?' },
  { key: 'ilik', name: 'Ілік', nameRu: 'Родительный', question: 'Кімнің? Ненің?', questionRu: 'Чей? Чего?' },
  { key: 'barys', name: 'Барыс', nameRu: 'Дательный', question: 'Кімге? Неге?', questionRu: 'Кому? Чему?' },
  { key: 'tabys', name: 'Табыс', nameRu: 'Винительный', question: 'Кімді? Нені?', questionRu: 'Кого? Что?' },
  { key: 'jatys', name: 'Жатыс', nameRu: 'Местный', question: 'Кімде? Неде?', questionRu: 'Где? В чём?' },
  { key: 'shygys', name: 'Шығыс', nameRu: 'Исходный', question: 'Кімнен? Неден?', questionRu: 'Откуда? От чего?' },
  { key: 'komektes', name: 'Көмектес', nameRu: 'Творительный', question: 'Кіммен? Немен?', questionRu: 'С кем? С чем?' },
]

const POSITIONS = ['директор', 'бухгалтер', 'менеджер', 'инженер', 'маман', 'кеңесші', 'хатшы', 'тілмаш']
const MONTHS = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан']
const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const DAYS = ['дүйсенбі', 'сейсенбі', 'сәрсенбі', 'бейсенбі', 'жұма', 'сенбі', 'жексенбі']
const DAYS_RU = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

const POSITIONS_DISPLAY: { [key: string]: string } = {
  'директор': 'Директор',
  'бухгалтер': 'Бухгалтер',
  'менеджер': 'Менеджер',
  'инженер': 'Инженер',
  'маман': 'Маман',
  'кеңесші': 'Кеңесші',
  'хатшы': 'Хатшы',
  'тілмаш': 'Тілмаш',
}

function SeptikTable({ result, isRu }: { result: DeclensionResult; isRu: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{isRu ? 'Падеж' : 'Септік'}</TableHead>
          <TableHead>{isRu ? 'Вопрос' : 'Сұрақ'}</TableHead>
          <TableHead>{isRu ? 'Результат' : 'Нәтиже'}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {SEPTIK_NAMES.map(s => (
          <TableRow key={s.key}>
            <TableCell className="font-medium">{isRu ? s.nameRu : s.name}</TableCell>
            <TableCell className="text-muted-foreground">{isRu ? s.questionRu : s.question}</TableCell>
            <TableCell className="font-semibold text-primary">{result[s.key]}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function SeptikTool() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz
  const isRu = lang === 'ru'

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
  const posLastWord = posWord.split(/\s+/).pop() || posWord
  const posResult = posLastWord ? declineNoun(posLastWord) : null

  const monthResult = declineNoun(MONTHS[monthIdx])
  const dayResult = declineNoun(DAYS[dayIdx])

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-4">{L('Септік құралы', 'Инструмент склонения')}</h2>

      <Tabs defaultValue="word">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="word">{L('Сөз', 'Слово')}</TabsTrigger>
          <TabsTrigger value="number">{L('Сан', 'Число')}</TabsTrigger>
          <TabsTrigger value="position">{L('Лауазым', 'Должность')}</TabsTrigger>
          <TabsTrigger value="month">{L('Ай', 'Месяц')}</TabsTrigger>
          <TabsTrigger value="day">{L('Апта күні', 'День недели')}</TabsTrigger>
        </TabsList>

        {/* Tab 1: Word */}
        <TabsContent value="word">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{L('Сөзді жазыңыз', 'Введите слово')}</label>
            <input
              value={wordInput}
              onChange={e => setWordInput(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              placeholder="мектеп, қала, бала..."
            />
            {wordResult && <div className="mt-4"><SeptikTable result={wordResult} isRu={isRu} /></div>}
          </div>
        </TabsContent>

        {/* Tab 2: Number */}
        <TabsContent value="number">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{L('Санды жазыңыз', 'Введите число')}</label>
            <input
              type="number"
              value={numInput}
              onChange={e => setNumInput(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              placeholder="54321"
            />
            {numWord && (
              <p className="mt-2 text-sm text-muted-foreground">{L('Сөзбен', 'Прописью')}: <span className="font-semibold text-foreground">{numWord}</span></p>
            )}
            {numResult && <div className="mt-4"><SeptikTable result={numResult} isRu={isRu} /></div>}
          </div>
        </TabsContent>

        {/* Tab 3: Position */}
        <TabsContent value="position">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{L('Лауазымды таңдаңыз', 'Выберите должность')}</label>
            <select
              value={posInput}
              onChange={e => { setPosInput(e.target.value); setCustomPos('') }}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none mb-2"
            >
              {POSITIONS.map(p => <option key={p} value={p}>{POSITIONS_DISPLAY[p] || p}</option>)}
            </select>
            <input
              value={customPos}
              onChange={e => setCustomPos(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              placeholder={L('Немесе өзіңіз жазыңыз...', 'Или введите свою...')}
            />
            {posResult && <div className="mt-4"><SeptikTable result={posResult} isRu={isRu} /></div>}
          </div>
        </TabsContent>

        {/* Tab 4: Month */}
        <TabsContent value="month">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{L('Айды таңдаңыз', 'Выберите месяц')}</label>
            <select
              value={monthIdx}
              onChange={e => setMonthIdx(Number(e.target.value))}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
            >
              {MONTHS.map((m, i) => {
                const capitalized = m.charAt(0).toUpperCase() + m.slice(1)
                return <option key={m} value={i}>{isRu ? MONTHS_RU[i] : capitalized} ({isRu ? capitalized : MONTHS_RU[i]})</option>
              })}
            </select>
            <div className="mt-4"><SeptikTable result={monthResult} isRu={isRu} /></div>
          </div>
        </TabsContent>

        {/* Tab 5: Day */}
        <TabsContent value="day">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{L('Апта күнін таңдаңыз', 'Выберите день недели')}</label>
            <select
              value={dayIdx}
              onChange={e => setDayIdx(Number(e.target.value))}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
            >
              {DAYS.map((d, i) => {
                const capitalized = d.charAt(0).toUpperCase() + d.slice(1)
                return <option key={d} value={i}>{isRu ? DAYS_RU[i] : capitalized} ({isRu ? capitalized : DAYS_RU[i]})</option>
              })}
            </select>
            <div className="mt-4"><SeptikTable result={dayResult} isRu={isRu} /></div>
          </div>
        </TabsContent>
      </Tabs>

      <TipBox>{L('Септіктеу ережелері дауысты дыбыстардың жуан/жіңішкелігіне және сөз соңғы дыбысына негізделген.', 'Правила склонения основаны на гармонии гласных и последнем звуке слова.')}</TipBox>
      <ShareBar tool={L('Септік құрал', 'Инструмент склонения')} />
    </div>
  )
}
