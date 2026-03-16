import { SelfemployedCalc } from '@/components/calculators/SelfemployedCalc'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Самозанятый калькулятор — Quralhub',
  description: 'ИПН 0%, тек соц.платежтер. Самозанятый табысынан ОПВ, СО, ВОСМС есебі.',
}

const faqData = [
  { question: 'Самозанятый кім бола алады?', answer: 'Жеке тұлғалар, жұмысшылары жоқ, ай сайынғы табысы 340 МРП-дан (1 470 500₸) аспайтындар.' },
  { question: 'Самозанятый ИПН төлей ме?', answer: 'Жоқ, ИПН 0%. Тек әлеуметтік платежтер: ОПВ 10%, СО 5%, ВОСМС.' },
  { question: 'Самозанятый болу үшін не қажет?', answer: 'eGov.kz немесе Kaspi Business арқылы тіркелу. ЖК ашу міндетті емес.' },
  { question: 'Табыс шегінен асса не болады?', answer: 'Упрощёнка немесе жалпы режимге көшу керек. Шек — 340 МРП/ай.' },
]

export default function SelfemployedPage() {
  return (
    <>
      <ToolJsonLd name="Самозанятый калькулятор" description="ИПН 0%, тек соц.платежтер. Самозанятый табысынан ОПВ, СО, ВОСМС есебі." url="/selfemployed" />
      <FAQJsonLd questions={faqData} />
      <SelfemployedCalc />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
        <RelatedTools toolIds={['tax', 'salary', 'invoice']} />
      </div>
    </>
  )
}
