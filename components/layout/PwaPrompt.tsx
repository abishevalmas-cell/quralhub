'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useApp } from './Providers'

export function PwaPrompt() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz
  const [show, setShow] = useState(false)
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Don't show if already dismissed or already installed
    if (localStorage.getItem('pwa-dismissed')) return
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const ua = navigator.userAgent
    const isIos = /iPhone|iPad|iPod/i.test(ua)
    const isAndroid = /Android/i.test(ua)
    const isMobile = isIos || isAndroid

    if (!isMobile) return

    setPlatform(isIos ? 'ios' : 'android')

    // Android: listen for beforeinstallprompt
    if (isAndroid) {
      const handler = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e)
        setTimeout(() => setShow(true), 3000)
      }
      window.addEventListener('beforeinstallprompt', handler as EventListener)
      // Fallback: show anyway after 5s
      const timer = setTimeout(() => setShow(true), 5000)
      return () => {
        window.removeEventListener('beforeinstallprompt', handler as EventListener)
        clearTimeout(timer)
      }
    }

    // iOS: show after 3 seconds
    if (isIos) {
      const timer = setTimeout(() => setShow(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      if (result.outcome === 'accepted') {
        dismiss()
      }
    }
  }

  const dismiss = () => {
    setShow(false)
    localStorage.setItem('pwa-dismissed', '1')
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-3 right-3 z-50 animate-in slide-in-from-bottom-4 fade-in duration-400">
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-2xl p-4 shadow-lg max-w-[420px] mx-auto">
        <div className="flex items-start gap-3">
          {/* App icon */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-lg font-extrabold flex-shrink-0 shadow-md">
            Q
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">
              {L('Quralhub қосымшасын орнатыңыз', 'Установите приложение Quralhub')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {platform === 'ios'
                ? L('Бір кликпен — телефоныңыздың экранына', 'Одним нажатием — на экран телефона')
                : L('Жылдам кіру үшін экранға қосыңыз', 'Добавьте на экран для быстрого доступа')
              }
            </p>

            <div className="flex gap-2 mt-2.5">
              {platform === 'android' && deferredPrompt ? (
                <button
                  onClick={handleInstall}
                  className="btn-glass !h-9 !px-4 !text-xs"
                >
                  {L('Орнату', 'Установить')}
                </button>
              ) : platform === 'ios' ? (
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">
                    {L('Safari → ', 'Safari → ')}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <svg className="w-3.5 h-3.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
                    </svg>
                    {L(' Бөлісу → "Экранға қосу"', ' Поделиться → "На экран «Домой»"')}
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleInstall}
                  className="btn-glass !h-9 !px-4 !text-xs"
                >
                  {L('Орнату', 'Установить')}
                </button>
              )}
            </div>
          </div>

          {/* Close */}
          <button
            onClick={dismiss}
            className="p-1 rounded-full hover:bg-muted transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  )
}
