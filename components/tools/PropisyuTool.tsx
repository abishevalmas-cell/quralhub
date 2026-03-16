'use client'

import { useState } from 'react'
import { BackButton } from '@/components/layout/BackButton'
import { ResultCard } from '@/components/shared/ResultCard'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { useApp } from '@/components/layout/Providers'
import { Input } from '@/components/ui/input'
import { numToKazakh } from '@/lib/kazakh/numToKazakh'
import { numToRussian } from '@/lib/kazakh/numToRussian'
import { F } from '@/lib/constants'

const MONTHS_KZ = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан']
const MONTHS_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

type Tab = 'amount' | 'date'

export function PropisyuTool() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [tab, setTab] = useState<Tab>('amount')
  const [amount, setAmount] = useState(54321)
  const [currency, setCurrency] = useState('tenge')
  const [dateStr, setDateStr] = useState('2026-03-15')
  const [copied, setCopied] = useState('')

  const isRu = lang === 'ru'
  const numToWords = isRu ? numToRussian : numToKazakh

  const CURRENCY_SUFFIX_KZ: Record<string, string> = { tenge: 'теңге', dollar: 'доллар', euro: 'еуро', none: '' }
  const CURRENCY_SUFFIX_RU: Record<string, string> = { tenge: 'тенге', dollar: 'долларов', euro: 'евро', none: '' }
  const suffix = (isRu ? CURRENCY_SUFFIX_RU : CURRENCY_SUFFIX_KZ)[currency] || ''
  const amountWords = amount > 0 ? numToWords(amount) : ''
  const amountDisplay = amountWords ? `${amountWords}${suffix ? ' ' + suffix : ''}` : ''

  const dateParts = dateStr ? dateStr.split('-').map(Number) : []
  const year = dateParts[0] || 2026
  const month = (dateParts[1] || 1) - 1
  const day = dateParts[2] || 1
  const dateKz = dateStr ? `${year} жылғы ${day} (${numToKazakh(day)}) ${MONTHS_KZ[month]}` : ''
  const dateRu = dateStr ? `${day} (${numToRussian(day)}) ${MONTHS_RU[month]} ${year} года` : ''

  const copyText = (text: string, id: string) => {
    navigator.clipboard?.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(''), 1500)
  }

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">✍️ {L('Сөзбен жазу', 'Прописью')}</h2>
      <p className="text-sm text-muted-foreground mb-4">{L('Сан мен күнді қазақша сөзбен жазу', 'Число и дата прописью на казахском')}</p>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          onClick={() => setTab('amount')}
          className={`py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
            tab === 'amount'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-card border border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          🔢 {L('Сома', 'Сумма')}
        </button>
        <button
          onClick={() => setTab('date')}
          className={`py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
            tab === 'date'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-card border border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          📅 {L('Күн', 'Дата')}
        </button>
      </div>

      {/* Amount tab */}
      {tab === 'amount' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Санды енгізіңіз', 'Введите число')}</label>
              <Input
                type="text"
                inputMode="numeric"
                value={amount || ''}
                onChange={e => setAmount(parseInt(e.target.value.replace(/\s/g, '')) || 0)}
                className="text-base"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Валюта', 'Валюта')}</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
              >
                <option value="tenge">{L('Теңге (₸)', 'Тенге (₸)')}</option>
                <option value="dollar">{L('Доллар ($)', 'Доллар ($)')}</option>
                <option value="euro">{L('Еуро (€)', 'Евро (€)')}</option>
                <option value="none">{L('Валютасыз', 'Без валюты')}</option>
              </select>
            </div>
          </div>

          {amount > 0 && (
            <ResultCard>
              <div className="text-xs text-muted-foreground mb-1">{L('Сан', 'Число')}:</div>
              <div className="text-xl font-extrabold text-primary mb-3">{F(amount)} {suffix}</div>
              <div className="text-xs text-muted-foreground mb-1">{L('Сөзбен', 'Прописью')}:</div>
              <div className="text-base font-semibold mb-3 leading-relaxed">{amountDisplay}</div>
              <button
                onClick={() => copyText(amountDisplay, 'amount')}
                className="text-[11px] px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {copied === 'amount' ? '✓' : '📋'} {L('Көшіру', 'Скопировать')}
              </button>
            </ResultCard>
          )}

          {/* Quick amounts */}
          <div className="flex flex-wrap gap-1.5">
            {[1000, 10000, 50000, 100000, 350000, 1000000, 5000000].map(n => (
              <button
                key={n}
                onClick={() => setAmount(n)}
                className={`text-[10px] px-2.5 py-1.5 rounded-full border font-medium transition-colors ${
                  amount === n
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                }`}
              >
                {F(n)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date tab */}
      {tab === 'date' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Күнді таңдаңыз', 'Выберите дату')}</label>
            <input
              type="date"
              value={dateStr}
              onChange={e => setDateStr(e.target.value)}
              className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
            />
          </div>

          {dateStr && (
            <ResultCard>
              <div className="text-xs text-muted-foreground mb-1">{L('Қазақша', 'На казахском')}:</div>
              <div className="text-base font-semibold mb-2">{dateKz}</div>
              <button
                onClick={() => copyText(dateKz, 'dateKz')}
                className="text-[11px] px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors mb-3"
              >
                {copied === 'dateKz' ? '✓' : '📋'} {L('Көшіру', 'Скопировать')}
              </button>

              <div className="text-xs text-muted-foreground mb-1 mt-2">{L('Орысша', 'На русском')}:</div>
              <div className="text-base font-semibold mb-2">{dateRu}</div>
              <button
                onClick={() => copyText(dateRu, 'dateRu')}
                className="text-[11px] px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {copied === 'dateRu' ? '✓' : '📋'} {L('Көшіру', 'Скопировать')}
              </button>
            </ResultCard>
          )}
        </div>
      )}

      <TipBox>{L('Ресми құжаттарда (шарт, бұйрық, шот-фактура) сома мен күнді сөзбен жазу міндетті.', 'В официальных документах (договор, приказ, счёт-фактура) сумму и дату нужно писать прописью.')}</TipBox>
      <ShareBar tool={L('Сөзбен жазу', 'Прописью')} />
    </div>
  )
}
