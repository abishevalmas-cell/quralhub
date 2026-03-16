import { CustomsCalc } from '@/components/calculators/CustomsCalc'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Авто растаможка — Quralhub',
  description: 'ЕАЭС кеден бажы есебі. Кеден бажы, кәдеге жарату алымы, тіркеу.',
}

const faqData = [
  { question: 'ЕАЭС елдерінен авто әкелуге баж бар ма?', answer: 'Иә, ЕАЭС ішінде де кедендік баж төленеді. Ставка авто жасы мен қозғалтқыш көлеміне байланысты.' },
  { question: 'Кәдеге жарату алымы қанша?', answer: '3000 см³ дейін — 413 000₸. 3000+ см³ — 620 000₸.' },
  { question: 'Растаможка құжаттары қандай?', answer: 'Тех.паспорт, сатып алу-сату шарты, ЖСН/БСН, кедендік декларация.' },
]

export default function CustomsPage() {
  return (
    <>
      <ToolJsonLd name="Авто растаможка калькуляторы" description="ЕАЭС кеден бажы есебі. Кеден бажы, кәдеге жарату алымы, тіркеу." url="/customs" />
      <FAQJsonLd questions={faqData} />
      <CustomsCalc />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
