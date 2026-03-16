import { InvoiceTool } from '@/components/tools/InvoiceTool'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

const faqData = [
  { question: 'Шот-фактура НДС-пен берілуі міндетті ме?', answer: 'НДС төлеуші ретінде тіркелген болсаңыз — иә. Упрощёнка бойынша — НДС жазылмайды.' },
  { question: 'Электронды шот-фактура заңды ма?', answer: 'Иә, ЭСФ (электронды шот-фактура) eSF.gov.kz арқылы ресми берілуі керек.' },
]

export const metadata: Metadata = {
  title: 'Шот-фактура генераторы — Quralhub',
  description: 'НДС 16% есебімен шот-фактура жасау',
}

export default function InvoicePage() {
  return (
    <>
      <ToolJsonLd name="Шот-фактура генераторы" description="НДС 16% есебімен шот-фактура жасау" url="/invoice" />
      <FAQJsonLd questions={faqData} />
      <InvoiceTool />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
