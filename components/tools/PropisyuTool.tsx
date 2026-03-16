'use client'

import { useState } from 'react'
import { BackButton } from '@/components/layout/BackButton'
import { ResultCard } from '@/components/shared/ResultCard'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { useApp } from '@/components/layout/Providers'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { numToKazakh } from '@/lib/kazakh/numToKazakh'
import { F } from '@/lib/constants'

const MONTHS_KZ = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан']
const MONTHS_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

const CURRENCY_SUFFIX: Record<string, string> = {
  tenge: 'теңге',
  dollar: 'доллар',
  none: '',
}

export function PropisyuTool() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [amount, setAmount] = useState(54321)
  const [currency, setCurrency] = useState('tenge')
  const [dateStr, setDateStr] = useState('2026-03-15')
  const [copiedAmount, setCopiedAmount] = useState(false)
  const [copiedDateKz, setCopiedDateKz] = useState(false)
  const [copiedDateRu, setCopiedDateRu] = useState(false)

  const amountWords = amount > 0 ? numToKazakh(amount) : ''
  const suffix = CURRENCY_SUFFIX[currency]
  const amountDisplay = amountWords ? `${amountWords}${suffix ? ' ' + suffix : ''}` : ''

  const dateParts = dateStr ? dateStr.split('-').map(Number) : []
  const year = dateParts[0] || 2026
  const month = (dateParts[1] || 1) - 1
  const day = dateParts[2] || 1
  const dayWord = numToKazakh(day)
  const yearWord = numToKazakh(year)

  const dateKz = dateStr
    ? `${year} жылғы ${day} (${dayWord}) ${MONTHS_KZ[month]}`
    : ''
  const dateRu = dateStr
    ? `${day} ${MONTHS_RU[month]} ${year} года`
    : ''

  const handleCopy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setter(true)
      setTimeout(() => setter(false), 1500)
    })
  }

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-4">{L('Сөзбен жазу', 'Прописью')}</h2>

      <Tabs defaultValue="amount">
        <TabsList className="mb-4">
          <TabsTrigger value="amount">{L('🔢 Сома', '🔢 Сумма')}</TabsTrigger>
          <TabsTrigger value="date">{L('📅 Күн', '📅 Дата')}</TabsTrigger>
        </TabsList>

        {/* Tab 1: Amount */}
        <TabsContent value="amount">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{L('Санды енгізіңіз', 'Введите число')}</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/50 mb-3"
              placeholder={L('Санды жазыңыз...', 'Введите число...')}
            />
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{L('Валюта', 'Валюта')}</label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="h-8 w-full rounded-xl border border-input bg-transparent px-2.5 text-sm outline-none mb-3"
            >
              <option value="tenge">{L('Теңге (₸)', 'Тенге (₸)')}</option>
              <option value="dollar">{L('Доллар ($)', 'Доллар ($)')}</option>
              <option value="none">{L('Валютасыз', 'Без валюты')}</option>
            </select>

            {amount > 0 && (
              <ResultCard>
                <div className="text-sm text-muted-foreground mb-1">{L('Сан', 'Число')}:</div>
                <div className="text-xl font-extrabold text-primary mb-2">{F(amount)} {suffix}</div>
                <div className="text-sm text-muted-foreground mb-1">{L('Сөзбен', 'Прописью')}:</div>
                <div className="text-base font-semibold mb-2">{amountDisplay}</div>
                <button
                  type="button"
                  onClick={() => handleCopy(amountDisplay, setCopiedAmount)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:opacity-80 transition-opacity"
                >
                  {copiedAmount ? L('✓ Көшірілді', '✓ Скопировано') : L('📋 Көшіру', '📋 Скопировать')}
                </button>
              </ResultCard>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Date */}
        <TabsContent value="date">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{L('Күнді таңдаңыз', 'Выберите дату')}</label>
            <input
              type="date"
              value={dateStr}
              onChange={e => setDateStr(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
            />

            {dateStr && (
              <ResultCard>
                <div className="text-sm text-muted-foreground mb-1">{L('Қазақша', 'На казахском')}:</div>
                <div className="text-base font-semibold mb-1">{dateKz}</div>
                <button
                  type="button"
                  onClick={() => handleCopy(dateKz, setCopiedDateKz)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:opacity-80 transition-opacity mb-3"
                >
                  {copiedDateKz ? L('✓ Көшірілді', '✓ Скопировано') : L('📋 Көшіру', '📋 Скопировать')}
                </button>

                <div className="text-sm text-muted-foreground mb-1">{L('Орысша', 'На русском')}:</div>
                <div className="text-base font-semibold mb-1">{dateRu}</div>
                <button
                  type="button"
                  onClick={() => handleCopy(dateRu, setCopiedDateRu)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:opacity-80 transition-opacity"
                >
                  {copiedDateRu ? L('✓ Көшірілді', '✓ Скопировано') : L('📋 Көшіру', '📋 Скопировать')}
                </button>
              </ResultCard>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <TipBox>{L('Сан мен күнді қазақша сөзбен жазу - ресми құжаттарға ыңғайлы.', 'Написание числа и даты прописью — удобно для официальных документов.')}</TipBox>
      <ShareBar tool={L('Прописью', 'Прописью')} />
    </div>
  )
}
