'use client'

import { useState } from 'react'
import { BackButton } from '@/components/layout/BackButton'
import { TipBox } from '@/components/shared/TipBox'
import { useApp } from '@/components/layout/Providers'

export function FeedbackForm() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!message.trim()) {
      setError(L('Хабарлама толтыру міндетті.', 'Сообщение обязательно для заполнения.'))
      return
    }

    if (message.trim().length < 5) {
      setError(L('Хабарлама кемінде 5 таңбадан тұруы керек.', 'Сообщение должно содержать не менее 5 символов.'))
      return
    }

    const feedback = {
      name: name.trim(),
      message: message.trim(),
      contact: contact.trim(),
      date: new Date().toISOString(),
    }

    try {
      const existing = JSON.parse(localStorage.getItem('quralhub_feedback') || '[]')
      existing.push(feedback)
      localStorage.setItem('quralhub_feedback', JSON.stringify(existing))
    } catch {
      // ignore storage errors
    }

    setSubmitted(true)
    setName('')
    setMessage('')
    setContact('')
  }

  const handleReset = () => {
    setSubmitted(false)
    setError('')
  }

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-4">{L('Кері байланыс', 'Обратная связь')}</h2>

      {submitted ? (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="p-3.5 rounded-xl bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 text-sm font-medium border border-green-200/30 dark:border-green-800/30 animate-in fade-in slide-in-from-bottom-1 duration-300">
            {L('Рахмет! Пікіріңіз қабылданды.', 'Спасибо! Ваш отзыв принят.')}
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="btn-glass w-full py-2.5 rounded-full text-sm font-semibold transition-opacity"
          >
            {L('Жаңа пікір жазу', 'Написать новый отзыв')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{L('Атыңыз', 'Ваше имя')}</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              placeholder={L('Аты-жөніңіз', 'Ваше имя')}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              {L('Хабарлама', 'Сообщение')} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={e => { setMessage(e.target.value); setError('') }}
              rows={4}
              required
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none resize-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              placeholder={L('Пікіріңіз, ұсынысыңыз немесе қате туралы хабар...', 'Ваш отзыв, предложение или сообщение об ошибке...')}
            />
            {error && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{L('Байланыс (міндетті емес)', 'Контакт (необязательно)')}</label>
            <input
              value={contact}
              onChange={e => setContact(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              placeholder={L('Email, телефон немесе Telegram', 'Email, телефон или Telegram')}
            />
          </div>
          <button
            type="submit"
            className="btn-glass w-full py-2.5 rounded-full text-sm font-semibold transition-opacity"
          >
            {L('Жіберу', 'Отправить')}
          </button>
        </form>
      )}

      <TipBox>{L('Пікіріңіз жергілікті сақталады. Деректер серверге жіберілмейді.', 'Ваш отзыв сохраняется локально. Данные не отправляются на сервер.')}</TipBox>
    </div>
  )
}
