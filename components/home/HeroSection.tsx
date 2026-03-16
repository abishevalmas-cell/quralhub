'use client'
import { Star } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useApp } from '@/components/layout/Providers'

const ACTIONS = [
  { text: 'Жалақыңызды есептеңіз', textRu: 'Рассчитайте зарплату', href: '/salary', icon: '💰' },
  { text: 'НДС 16% есептеңіз', textRu: 'Рассчитайте НДС 16%', href: '/vat', icon: '🧾' },
  { text: 'Ипотека төлемін біліңіз', textRu: 'Узнайте платёж по ипотеке', href: '/mortgage', icon: '🏠' },
  { text: 'Тариф салыстырыңыз', textRu: 'Сравните тарифы', href: '/connect', icon: '📡' },
  { text: 'Штрафыңызды тексеріңіз', textRu: 'Проверьте штрафы', href: '/fines', icon: '🚔' },
  { text: 'Депозит табысын есептеңіз', textRu: 'Рассчитайте доход по депозиту', href: '/bankdep', icon: '🏦' },
  { text: 'Маркетплейс маржаңыз', textRu: 'Маржа маркетплейса', href: '/marketplace', icon: '📦' },
  { text: 'Валюта конверттеңіз', textRu: 'Конвертируйте валюту', href: '/currency', icon: '💱' },
  { text: 'Құжат жасаңыз', textRu: 'Создайте документ', href: '/doctemplates', icon: '📑' },
  { text: 'Қазақша аударыңыз', textRu: 'Переведите на казахский', href: '/aitools', icon: '🧠' },
  { text: 'QR-код жасаңыз', textRu: 'Создайте QR-код', href: '/qr', icon: '▣' },
  { text: 'Транспорт салығын біліңіз', textRu: 'Узнайте транспортный налог', href: '/transport', icon: '🚗' },
]

// Duplicate for seamless loop
const MARQUEE_ITEMS = [...ACTIONS, ...ACTIONS]

export function HeroSection() {
  const { lang } = useApp()

  return (
    <section className="px-3 sm:px-5 py-8 sm:py-12 md:py-16 text-center relative overflow-hidden">
      <div className="absolute top-[-30%] right-[-15%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(147,197,253,0.08)_0%,transparent_70%)] pointer-events-none dark:hidden" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.05)_0%,transparent_70%)] pointer-events-none dark:hidden" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-primary bg-accent/80 backdrop-blur-sm rounded-full mb-5 border border-primary/15">
          <Star className="w-3.5 h-3.5 fill-current" />
          {lang === 'ru' ? 'Данные 2026 года' : '2026 жылғы деректер'}
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-3xl sm:text-4xl md:text-[44px] font-extrabold tracking-tight leading-tight mb-3"
      >
        {lang === 'ru' ? (
          <>
            Деньги, документы, язык —{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-600">всё в одном месте</span>
          </>
        ) : (
          <>
            Ақша, құжат, тіл —{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-600">бәрі бір жерде</span>
          </>
        )}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-base text-muted-foreground max-w-[460px] mx-auto mb-8 leading-relaxed"
      >
        {lang === 'ru'
          ? 'Рассчитать зарплату, сравнить тарифы, создать документ — за 3 секунды, бесплатно'
          : 'Жалақы есептеу, тариф салыстыру, құжат жасау — 3 секундта, тегін, қазақша'}
      </motion.p>

      {/* Stat cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex justify-center gap-3 sm:gap-4 mb-8"
      >
        {[
          { n: '33+', l: lang === 'ru' ? 'Инструменты' : 'Құралдар' },
          { n: '2026', l: lang === 'ru' ? 'Новый НК' : 'Жаңа НК' },
          { n: '0₸', l: lang === 'ru' ? 'Бесплатно' : 'Тегін' },
        ].map((stat) => (
          <motion.div
            key={stat.n}
            whileHover={{ y: -3, scale: 1.03 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="relative overflow-hidden bg-card/70 backdrop-blur-xl border border-border/60 rounded-2xl px-3 py-2.5 sm:px-5 sm:py-3.5 shadow-sm min-w-[80px] sm:min-w-[95px]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 via-transparent to-transparent dark:hidden pointer-events-none" />
            <div className="relative">
              <div className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">{stat.n}</div>
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">{stat.l}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Infinite marquee */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="relative w-full marquee-container"
      >
        <div className="marquee-track flex gap-4 w-max py-3">
          {MARQUEE_ITEMS.map((action, i) => (
            <Link
              key={`${action.href}-${i}`}
              href={action.href}
              className="btn-glass-outline !h-10 !px-4 !text-xs sm:!h-12 sm:!px-6 sm:!text-sm !normal-case !tracking-normal !font-semibold flex-shrink-0 hover:!border-primary hover:!text-primary gap-2"
            >
              <span className="text-xl">{action.icon}</span>
              <span>{lang === 'ru' ? action.textRu : action.text}</span>
            </Link>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
