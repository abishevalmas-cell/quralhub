import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { CursorBlob } from '@/components/layout/CursorBlob'
import { WebApplicationJsonLd } from '@/components/seo/JsonLd'
import { Footer } from '@/components/layout/Footer'
import { Providers } from '@/components/layout/Providers'
import { Analytics } from '@/components/analytics/Analytics'
import { TrackPageView } from '@/components/analytics/TrackPageView'
import { PwaPrompt } from '@/components/layout/PwaPrompt'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'cyrillic'],
})

export const metadata: Metadata = {
  title: 'Quralhub — Құралдар платформасы | Қазақстан 2026',
  description: 'Quralhub — Қазақстан үшін AI құралдар платформасы. Калькуляторлар, тариф салыстыру, AI аудармашы, құжат генераторы — бәрі тегін, қазақша.',
  keywords: 'жалақы калькулятор, ипотека есептеу, ндс 16 есептеу, қазақстан калькулятор, мрп 2026',
  openGraph: {
    title: 'Quralhub — Қазақстандықтар үшін құралдар',
    description: 'Жалақы, ипотека, НДС 16%, тариф салыстыру — 25+ тегін құрал',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="kk" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#0B8A6B" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('quralhub-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()` }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <WebApplicationJsonLd />
        <CursorBlob />
        <div className="ambient-glow" aria-hidden="true" />
        <Providers>
          <Navbar />
          <main className="relative z-10 min-h-screen pt-[60px]">
            {children}
          </main>
          <Footer />
          <PwaPrompt />
          <Analytics />
          <TrackPageView />
        </Providers>
      </body>
    </html>
  )
}
