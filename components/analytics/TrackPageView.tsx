'use client'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || ''
const YM_ID = process.env.NEXT_PUBLIC_YM_ID || ''

export function TrackPageView() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    // GA4
    if (GA_ID && typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', GA_ID, { page_path: pathname })
    }
    // Yandex.Metrika
    if (YM_ID && typeof window !== 'undefined' && (window as any).ym) {
      (window as any).ym(Number(YM_ID), 'hit', pathname)
    }
  }, [pathname])

  return null
}
