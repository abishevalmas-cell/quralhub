import { VatCalc } from '@/components/calculators/VatCalc'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'НДС 16% калькулятор — Quralhub',
  description: 'Жаңа Салық кодексі 2026: НДС 12% → 16%. НДС қосу және бөліп алу есебі.',
}

const faqData = [
  { question: '2026 жылы НДС ставкасы қанша?', answer: 'Негізгі ставка 16% (2025 жылы 12% болған). Пониженные: медицина 5%, баспа 10%.' },
  { question: 'Кім НДС төлеуші болуы керек?', answer: 'Жылдық табысы 10 000 МРП (43 250 000₸) асқан кәсіпорындар НДС төлеуші болуы міндетті.' },
  { question: 'Упрощёнка бойынша НДС төлеу керек пе?', answer: 'Жоқ, упрощёнка (4%) бойынша жұмыс істейтін ЖК/ТОО НДС-тен босатылған (жылдық табыс 43.25М₸-ге дейін).' },
]

export default function VatPage() {
  return (
    <>
      <ToolJsonLd name="НДС 16% калькулятор" description="Жаңа Салық кодексі 2026: НДС 12% → 16%. НДС қосу және бөліп алу есебі." url="/vat" />
      <FAQJsonLd questions={faqData} />
      <VatCalc />
      <div className="max-w-[680px] mx-auto px-5">
        <RelatedTools toolIds={['tax', 'invoice', 'mrp']} />
      </div>
    </>
  )
}
