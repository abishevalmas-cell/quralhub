import { PdfToolsPage } from '@/components/tools/PdfToolsPage'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

const faqData = [
  { question: 'PDF файлдар серверге жіберіле ме?', answer: 'Жоқ, 100% клиент жағында. Файлдар браузеріңізден шықпайды.' },
  { question: 'PDF-ті қанша рет сығуға болады?', answer: 'Бірнеше рет. Бірақ әр сығу сапаны азайтуы мүмкін (суреттер бұлдырауы).' },
]

export const metadata: Metadata = {
  title: 'PDF құралдар — Quralhub',
  description: 'PDF файлдармен жұмыс — мәтін/сурет конвертация, біріктіру, бөлу, сығу',
}

export default function PdfPage() {
  return (
    <>
      <ToolJsonLd name="PDF құралдар" description="PDF файлдармен жұмыс — мәтін/сурет конвертация, біріктіру, бөлу, сығу" url="/pdf" />
      <FAQJsonLd questions={faqData} />
      <PdfToolsPage />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
