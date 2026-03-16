import { CalendarsPage } from '@/components/tools/CalendarsPage'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Күнтізбелер 2026 — Мереке, мектеп, салық күнтізбесі | Quralhub',
  description: '2026 жылғы мерекелер, кәсіби күндер, мектеп күнтізбесі, салық мерзімдері. 14 мереке + 20 кәсіби күн + мектеп каникулдары.',
}

const faqData = [
  { question: '2026 жылы неше мереке бар?', answer: '14 мемлекеттік мереке + 20+ кәсіби күн.' },
  { question: 'Мектеп каникулы қашан?', answer: 'Күзгі: 26.10-01.11, Қысқы: 28.12-10.01, Көктемгі: 22-29.03, Жазғы: 26.05-31.08.' },
  { question: 'Салық декларациясын қашан тапсыру керек?', answer: 'Упрощёнка: 15.03 және 15.08. НДС: тоқсан сайын 25-ші күнге дейін. КПН: 31.03.' },
  { question: 'Транспорт салығын қашан төлеу керек?', answer: '1 сәуірге дейін жыл сайын.' },
]

export default function CalendarsPageRoute() {
  return (
    <>
      <ToolJsonLd name="Күнтізбелер 2026" description="2026 жылғы мерекелер, кәсіби күндер, мектеп күнтізбесі, салық мерзімдері" url="/calendars" />
      <FAQJsonLd questions={faqData} />
      <CalendarsPage />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
