'use client'
import Link from 'next/link'
import { MRP, MZP, F } from '@/lib/constants'
import { useApp } from '@/components/layout/Providers'

export function Footer() {
  const { lang } = useApp()

  return (
    <footer className="py-10 px-5 text-center border-t border-border bg-card mt-10">
      <p className="text-sm font-semibold text-foreground">Quralhub</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {lang === 'ru' ? 'Платформа инструментов для казахстанцев' : 'Қазақстандықтар үшін құралдар платформасы'}
      </p>
      <div className="mt-2 flex justify-center gap-4 flex-wrap text-xs text-muted-foreground">
        <span>МРП {F(MRP)}₸</span>
        <span>МЗП {F(MZP)}₸</span>
        <span>НДС 16%</span>
      </div>
      <div className="mt-3">
        <Link href="/guides" className="text-xs text-primary hover:underline font-medium">
          {lang === 'ru' ? 'Руководства' : 'Нұсқаулықтар'}
        </Link>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        © 2026 Quralhub. {lang === 'ru' ? 'Все расчёты носят информационный характер.' : 'Барлық есептеулер ақпараттық сипатта.'}
      </p>
    </footer>
  )
}
