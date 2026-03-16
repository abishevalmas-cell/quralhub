import { CommunalCalc } from '@/components/calculators/CommunalCalc'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Коммуналдық есеп — Quralhub',
  description: '8 қала бойынша коммуналдық төлемдер есебі. 2026 жылғы тарифтер.',
}

const faqData = [
  { question: 'Қай қалада электр энергиясы ең арзан?', answer: 'Павлодар — 19.5₸/кВт·сағ. Ең қымбат — Алматы (25.8₸).' },
  { question: 'Газ тарифі бар қалалар қайсы?', answer: 'Алматы, Шымкент, Қарағанды, Ақтөбе, Павлодар, Семей. Астана мен Ақтау — газсыз.' },
  { question: 'НДС 16% коммуналдық тарифтерге қосылды ма?', answer: 'Иә, 2026 жылдан бастап барлық тарифтерге НДС 16% қосылған.' },
]

export default function CommunalPage() {
  return (
    <>
      <ToolJsonLd name="Коммуналдық есеп калькуляторы" description="8 қала бойынша коммуналдық төлемдер есебі. 2026 жылғы тарифтер." url="/communal" />
      <FAQJsonLd questions={faqData} />
      <CommunalCalc />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
