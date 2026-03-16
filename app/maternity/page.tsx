import { MaternityCalc } from '@/components/calculators/MaternityCalc'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Декрет ақы калькуляторы — Quralhub',
  description: 'Жүктілік, босану, бала күтімі жәрдемақысын есептеу. 126/140/170 күн босану демалысы.',
}

const faqData = [
  { question: 'Декрет ақысын кім төлейді?', answer: 'Босану демалысын — жұмыс беруші. Бала күтімі жәрдемақысын — мемлекет (ГЦВП арқылы).' },
  { question: 'Туу бойынша бір реттік төлем қанша?', answer: '63 МРП = 272 475₸ (1-3 бала). 4+ бала — 104 МРП = 449 800₸.' },
  { question: 'Декрет демалысы неше күн?', answer: 'Қалыпты босану — 126 күн. Қиын/көп бала — 140 күн. Асқынған — 170 күн.' },
  { question: 'Жұмыс істемейтін әйел декрет ақы ала ма?', answer: 'Босану демалысы — жоқ. Бірақ туу бойынша бір реттік төлем + бала күтімі жәрдемақысы (МЗП-ның 40%) алады.' },
]

export default function MaternityPage() {
  return (
    <>
      <ToolJsonLd name="Декрет ақы калькуляторы" description="Жүктілік, босану, бала күтімі жәрдемақысын есептеу. 126/140/170 күн босану демалысы." url="/maternity" />
      <FAQJsonLd questions={faqData} />
      <MaternityCalc />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
