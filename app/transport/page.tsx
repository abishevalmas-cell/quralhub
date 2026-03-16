import { TransportCalc } from '@/components/calculators/TransportCalc'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Транспорт салығы — Quralhub',
  description: 'Жеңіл авто көлікке жылдық салық есебі. Жаңа коэффициенттер: ескі авто салығы азайды.',
}

const faqData = [
  { question: 'Транспорт салығын қашан төлейді?', answer: 'Жыл сайын 1 сәуірге дейін. Egov.kz немесе Kaspi арқылы төлеуге болады.' },
  { question: '2026 жылғы жаңа коэффициенттер қандай?', answer: '10-20 жыл авто — ×0.7 (30% жеңілдік). 20+ жыл — ×0.5 (50% жеңілдік).' },
  { question: 'Электромобильдер салық төлей ме?', answer: '2026 жылға дейін электромобильдер транспорт салығынан босатылған.' },
]

export default function TransportPage() {
  return (
    <>
      <ToolJsonLd name="Транспорт салығы калькуляторы" description="Жеңіл авто көлікке жылдық салық есебі. Жаңа коэффициенттер: ескі авто салығы азайды." url="/transport" />
      <FAQJsonLd questions={faqData} />
      <TransportCalc />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
        <RelatedTools toolIds={['fines', 'plates', 'customs']} />
      </div>
    </>
  )
}
