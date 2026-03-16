import { PropisyuTool } from '@/components/tools/PropisyuTool'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

const faqData = [
  { question: 'Прописью не үшін қажет?', answer: 'Шарттарда, бұйрықтарда, қаржы құжаттарында сома мен күн сөзбен жазылуы міндетті.' },
  { question: 'Қазақша сандар қалай жазылады?', answer: "Мысалы: 54 321 = 'елу төрт мың үш жүз жиырма бір теңге'." },
]

export const metadata: Metadata = {
  title: 'Прописью — Quralhub',
  description: 'Сан мен күнді қазақша сөзбен жазу',
}

export default function PropisyuPage() {
  return (
    <>
      <ToolJsonLd name="Прописью құрал" description="Сан мен күнді қазақша сөзбен жазу" url="/propisyu" />
      <FAQJsonLd questions={faqData} />
      <PropisyuTool />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
