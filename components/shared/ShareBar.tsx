'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/components/layout/Providers'
import { trackEvent } from '@/components/analytics/TrackEvent'

interface ShareBarProps {
  tool: string
  text?: string
}

export function ShareBar({ tool, text }: ShareBarProps) {
  const [url, setUrl] = useState('')
  const { lang } = useApp()
  const shareText = text || `Quralhub — ${tool}`

  useEffect(() => {
    setUrl(window.location.href)
  }, [])

  return (
    <div className="flex flex-col sm:flex-row gap-2 mt-5">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('share', 'social', 'whatsapp')}
        className="flex-1 min-h-[44px] h-10 rounded-full text-xs font-semibold uppercase tracking-[0.15em] text-white flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95 border border-white/20 backdrop-blur-2xl bg-[#25D366]/75 shadow-[0_4px_14px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-[#25D366]/85"
      >
        WhatsApp
      </a>
      <a
        href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('share', 'social', 'telegram')}
        className="flex-1 min-h-[44px] h-10 rounded-full text-xs font-semibold uppercase tracking-[0.15em] text-white flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95 border border-white/20 backdrop-blur-2xl bg-[#229ED9]/75 shadow-[0_4px_14px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-[#229ED9]/85"
      >
        Telegram
      </a>
      <button
        onClick={() => { navigator.clipboard?.writeText(url); trackEvent('share', 'social', 'copy') }}
        className="btn-glass-outline flex-1 !text-xs !h-10 !min-h-[44px]"
      >
        {lang === 'ru' ? 'Скопировать' : 'Көшіру'}
      </button>
    </div>
  )
}
