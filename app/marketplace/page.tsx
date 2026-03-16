import { MarketplaceCalc } from '@/components/calculators/MarketplaceCalc'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Маркетплейс маржа калькулятор — Kaspi, WB, Ozon | Quralhub',
  description: 'Маркетплейсте сатудан таза пайда мен маржаны есептеңіз. Kaspi Магазин, Wildberries, Ozon комиссия, логистика, қаптама шығындарын салыстырыңыз.',
}

const faqData = [
  { question: 'Kaspi Магазинде комиссия қанша?', answer: 'Категорияға байланысты 5-15%. Орташа 10%.' },
  { question: 'WB-де сату тиімді ме?', answer: 'Маржа 30%+ болса тиімді. Логистика + комиссия 15-35% алады.' },
  { question: 'Қай маркетплейсте бастау жеңіл?', answer: 'Kaspi Магазин — ЖК/ТОО тіркелу оңай, KZ аудитория, теңгемен есеп.' },
]

export default function MarketplacePage() {
  return (
    <>
      <ToolJsonLd name="Маркетплейс маржа калькулятор" description="Маркетплейсте сатудан таза пайда мен маржаны есептеңіз. Kaspi, WB, Ozon." url="/marketplace" />
      <FAQJsonLd questions={faqData} />
      <MarketplaceCalc />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
        <RelatedTools toolIds={['tax', 'selfemployed', 'invoice']} />
      </div>
    </>
  )
}
