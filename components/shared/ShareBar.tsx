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
    <div className="flex gap-2 mt-5">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('share', 'social', 'whatsapp')}
        className="h-8 px-3 rounded-full text-[10px] font-semibold tracking-wide text-muted-foreground flex items-center justify-center gap-1 cursor-pointer transition-colors border border-border/60 bg-card/50 hover:border-[#25D366]/50 hover:text-[#25D366]"
      >
        WhatsApp
      </a>
      <a
        href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('share', 'social', 'telegram')}
        className="h-8 px-3 rounded-full text-[10px] font-semibold tracking-wide text-muted-foreground flex items-center justify-center gap-1 cursor-pointer transition-colors border border-border/60 bg-card/50 hover:border-[#229ED9]/50 hover:text-[#229ED9]"
      >
        Telegram
      </a>
      <button
        onClick={() => { navigator.clipboard?.writeText(url); trackEvent('share', 'social', 'copy') }}
        className="h-8 px-3 rounded-full text-[10px] font-semibold tracking-wide text-muted-foreground flex items-center justify-center gap-1 cursor-pointer transition-colors border border-border/60 bg-card/50 hover:border-primary/50 hover:text-primary"
      >
        {lang === 'ru' ? 'Скопировать' : 'Көшіру'}
      </button>
    </div>
  )
}
