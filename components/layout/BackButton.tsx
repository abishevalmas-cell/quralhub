'use client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useApp } from '@/components/layout/Providers'

export function BackButton() {
  const { lang } = useApp()

  return (
    <Link href="/" className="btn-glass-outline !h-9 !px-5 !text-xs mb-5 inline-flex">
      <ArrowLeft className="w-3.5 h-3.5" />
      {lang === 'ru' ? 'Все инструменты' : 'Барлық құралдар'}
    </Link>
  )
}
