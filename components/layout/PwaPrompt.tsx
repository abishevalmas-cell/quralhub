'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function PwaPrompt() {
  const [show, setShow] = useState(false)
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [step, setStep] = useState(0) // for iOS animated steps

  useEffect(() => {
    if (localStorage.getItem('pwa-dismissed')) return
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const ua = navigator.userAgent
    const isIos = /iPhone|iPad|iPod/i.test(ua)
    const isAndroid = /Android/i.test(ua)
    if (!isIos && !isAndroid) return

    setPlatform(isIos ? 'ios' : 'android')

    if (isAndroid) {
      const handler = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e)
        setTimeout(() => setShow(true), 3000)
      }
      window.addEventListener('beforeinstallprompt', handler as EventListener)
      const timer = setTimeout(() => setShow(true), 5000)
      return () => {
        window.removeEventListener('beforeinstallprompt', handler as EventListener)
        clearTimeout(timer)
      }
    }

    if (isIos) {
      const timer = setTimeout(() => setShow(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  // iOS step animation
  useEffect(() => {
    if (!show || platform !== 'ios') return
    const interval = setInterval(() => {
      setStep(prev => (prev + 1) % 3)
    }, 2500)
    return () => clearInterval(interval)
  }, [show, platform])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      if (result.outcome === 'accepted') dismiss()
    }
  }

  const dismiss = () => {
    setShow(false)
    localStorage.setItem('pwa-dismissed', '1')
  }

  const iosSteps = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-blue-500">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 6l-4-4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 2v13" strokeLinecap="round" />
        </svg>
      ),
      title: 'Нажмите «Поделиться»',
      subtitle: 'Кнопка внизу экрана Safari',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-blue-500">
          <rect x="3" y="3" width="18" height="18" rx="4" strokeLinecap="round" />
          <path d="M12 8v8M8 12h8" strokeLinecap="round" />
        </svg>
      ),
      title: '«На экран Домой»',
      subtitle: 'Прокрутите вниз в меню',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
          <rect x="3" y="3" width="18" height="18" rx="4" fill="url(#qg)" />
          <text x="12" y="16" textAnchor="middle" fill="white" fontSize="11" fontWeight="800" fontFamily="Inter,sans-serif">Q</text>
          <defs><linearGradient id="qg" x1="3" y1="3" x2="21" y2="21"><stop stopColor="#10B981" /><stop offset="1" stopColor="#059669" /></linearGradient></defs>
        </svg>
      ),
      title: 'Нажмите «Добавить»',
      subtitle: 'Quralhub появится на экране',
    },
  ]

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-4 left-3 right-3 z-50"
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-neutral-900/80 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)] max-w-[400px] mx-auto">
            {/* Top shine */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent" />

            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors z-10"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>

            <div className="p-5">
              {/* Header with animated icon */}
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-xl font-extrabold flex-shrink-0 shadow-lg"
                >
                  Q
                </motion.div>
                <div>
                  <p className="text-[15px] font-bold text-foreground">Установите Quralhub</p>
                  <p className="text-xs text-muted-foreground">Быстрый доступ одним нажатием</p>
                </div>
              </div>

              {platform === 'android' ? (
                /* Android — simple install button */
                <div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Добавьте Quralhub на главный экран — все 33 инструмента всегда под рукой, без браузера.
                  </p>
                  <button
                    onClick={handleInstall}
                    className="btn-glass w-full !h-11 justify-center !text-sm"
                  >
                    Установить приложение
                  </button>
                </div>
              ) : (
                /* iOS — animated 3-step instruction */
                <div>
                  <div className="relative h-[72px] mb-3">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 flex items-center gap-3 p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/30 dark:border-blue-800/20"
                      >
                        <div className="flex-shrink-0">
                          {iosSteps[step].icon}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{iosSteps[step].title}</p>
                          <p className="text-[11px] text-muted-foreground">{iosSteps[step].subtitle}</p>
                        </div>
                        <div className="ml-auto flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                          {step + 1}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Step dots */}
                  <div className="flex justify-center gap-1.5 mb-1">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === step ? 'w-5 bg-blue-500' : 'w-1.5 bg-muted-foreground/20'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
