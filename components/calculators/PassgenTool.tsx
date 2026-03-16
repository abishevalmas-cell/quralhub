'use client'
import { useState, useCallback, useEffect } from 'react'
import { BackButton } from '@/components/layout/BackButton'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { useApp } from '@/components/layout/Providers'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'

function generatePassword(length: number): string {
  const arr = new Uint32Array(length)
  crypto.getRandomValues(arr)
  return Array.from(arr, v => CHARS[v % CHARS.length]).join('')
}

export function PassgenTool() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [length, setLength] = useState(16)
  const [password, setPassword] = useState('')
  const [copied, setCopied] = useState(false)

  const regenerate = useCallback(() => {
    setPassword(generatePassword(length))
    setCopied(false)
  }, [length])

  useEffect(() => {
    regenerate()
  }, [regenerate])

  const handleCopy = () => {
    navigator.clipboard?.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">🔑 {L('Құпия сөз генераторы', 'Генератор паролей')}</h2>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{L('Қауіпсіз құпия сөз жасаңыз. Деректер серверге жіберілмейді.', 'Создайте безопасный пароль. Данные не отправляются на сервер.')}</p>

      <div className="mb-4">
        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
          {L('Ұзындығы', 'Длина')}: {length}
        </label>
        <input
          type="range"
          min={8}
          max={32}
          value={length}
          onChange={e => setLength(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
          <span>8</span>
          <span>32</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 mt-4 shadow-sm">
        <p className="font-mono text-lg break-all text-center select-all leading-relaxed tracking-wide">
          {password}
        </p>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={handleCopy}
          className="flex-1 py-3 px-4 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all"
        >
          {copied ? L('Көшірілді!', 'Скопировано!') : L('Көшіру', 'Скопировать')}
        </button>
        <button
          onClick={regenerate}
          className="flex-1 py-3 px-4 rounded-full text-sm font-semibold bg-card border border-border text-foreground hover:border-primary hover:text-primary transition-all"
        >
          {L('Жаңарту', 'Обновить')}
        </button>
      </div>

      <TipBox>
        {L(
          'Құпия сөзді ешкімге бермеңіз. Әр сайтта бөлек құпия сөз қолданыңыз. Ең қауіпсіз ұзындық — 16+ таңба.',
          'Не сообщайте пароль никому. Используйте отдельный пароль для каждого сайта. Безопасная длина — 16+ символов.'
        )}
      </TipBox>

      <ShareBar tool="passgen" text={L('Құпия сөз генераторы — Quralhub', 'Генератор паролей — Quralhub')} />
    </div>
  )
}
