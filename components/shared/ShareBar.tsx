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
  const [copied, setCopied] = useState(false)
  const { lang } = useApp()
  const shareText = text || `Quralhub — ${tool}`

  useEffect(() => {
    setUrl(window.location.href)
  }, [])

  const handleCopy = () => {
    navigator.clipboard?.writeText(url)
    trackEvent('share', 'social', 'copy')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="grid grid-cols-3 gap-2 mt-5">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('share', 'social', 'whatsapp')}
        className="h-10 rounded-xl text-[11px] font-semibold tracking-wide flex items-center justify-center gap-1.5 cursor-pointer transition-colors border border-[#25D366]/20 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20"
      >
        WhatsApp
      </a>
      <a
        href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('share', 'social', 'telegram')}
        className="h-10 rounded-xl text-[11px] font-semibold tracking-wide flex items-center justify-center gap-1.5 cursor-pointer transition-colors border border-[#229ED9]/20 bg-[#229ED9]/10 text-[#229ED9] hover:bg-[#229ED9]/20"
      >
        Telegram
      </a>
      <button
        onClick={handleCopy}
        className="h-10 rounded-xl text-[11px] font-semibold tracking-wide flex items-center justify-center gap-1.5 cursor-pointer transition-colors border border-border/40 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-primary"
      >
        {copied ? '✓' : ''} {lang === 'ru' ? 'Скопировать' : 'Көшіру'}
      </button>
    </div>
  )
}
