import { HolidayCalendar } from '@/components/tools/HolidayCalendar'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

const faqData = [
  { question: '2026 жылы неше мереке күні бар?', answer: '14 мемлекеттік мереке (ішінде кейбіреулері 2-3 күндік).' },
  { question: 'Мереке демалыс күнмен сәйкес келсе?', answer: 'Демалыс келесі жұмыс күніне ауысады (ЕК 84-бап).' },
  { question: 'Наурыз неше күн демалыс?', answer: '3 күн: 21-23 наурыз. Қосымша демалыс күндерімен 5-7 күнге дейін созылуы мүмкін.' },
]

export const metadata: Metadata = {
  title: 'Мерекелер 2026 — Quralhub',
  description: 'ҚР 2026 жылғы мемлекеттік мерекелер мен демалыс күндері',
}

export default function HolidaysPage() {
  return (
    <>
      <ToolJsonLd name="Мерекелер күнтізбесі 2026" description="ҚР 2026 жылғы мемлекеттік мерекелер мен демалыс күндері" url="/holidays" />
      <FAQJsonLd questions={faqData} />
      <HolidayCalendar />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
