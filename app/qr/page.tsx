import { QrTool } from '@/components/tools/QrTool'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

const faqData = [
  { question: 'QR-кодты қалай пайдалануға болады?', answer: 'Визитка, WiFi бөлісу, WhatsApp сілтеме, веб-сайт, іс-шара билеті.' },
  { question: 'QR-код қанша уақыт жарамды?', answer: 'Шексіз. URL өзгермесе — QR-код мәңгілік жарамды.' },
]

export const metadata: Metadata = {
  title: 'QR-код генераторы — Quralhub',
  description: 'QR-код жасау: URL, WiFi, WhatsApp, телефон. Тегін генератор.',
}

export default function QrPage() {
  return (
    <>
      <ToolJsonLd name="QR-код генераторы" description="QR-код жасау: URL, WiFi, WhatsApp, телефон. Тегін генератор." url="/qr" />
      <FAQJsonLd questions={faqData} />
      <QrTool />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
