import { KaspiCalc } from '@/components/calculators/KaspiCalc'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kaspi Red калькулятор — Quralhub',
  description: 'Kaspi Red бөліп төлеу есебі. 3-12 ай пайызсыз, 24 ай сыйақымен.',
}

const faqData = [
  { question: 'Kaspi Red бөліп төлеу қалай жұмыс істейді?', answer: '3-6 ай — пайызсыз. 12-24 ай — сыйақы сатушы төлейді, сізге артық төлем жоқ.' },
  { question: 'Kaspi Red лимиті қалай анықталады?', answer: 'Kaspi қосымшасындағы кредиттік скоринг бойынша. Орташа 200 000₸ — 2 000 000₸.' },
  { question: 'Kaspi Red-пен кез келген тауар ала ма?', answer: 'Тек Kaspi Магазин және серіктес дүкендерден. Барлық дүкендер қабылдай бермейді.' },
]

export default function KaspiPage() {
  return (
    <>
      <ToolJsonLd name="Kaspi Red калькулятор" description="Kaspi Red бөліп төлеу есебі. 3-12 ай пайызсыз, 24 ай сыйақымен." url="/kaspi" />
      <FAQJsonLd questions={faqData} />
      <KaspiCalc />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
