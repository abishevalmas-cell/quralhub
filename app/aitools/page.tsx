import { AiToolsPage } from '@/components/tools/AiToolsPage'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

const faqData = [
  { question: 'Офлайн аударма қалай жұмыс істейді?', answer: '700+ сөзден тұратын ішкі сөздік. Интернетсіз де негізгі сөздерді аударады.' },
  { question: 'Латын қазақ әліпбиі қашан енгізіледі?', answer: '2023 жылы бекітілген. Толық көшу 2031 жылға жоспарланған.' },
  { question: 'Емле тексерушісі нені тексереді?', answer: '48 жиі кездесетін қате: ү/у, ө/о, қ/к ауыстыру, орысша баламалар, кәсіби терминдер.' },
]

export const metadata: Metadata = {
  title: 'AI Тіл құралдары — Quralhub',
  description: 'Аудару, латынға айналдыру, емлесін тексеру',
}

export default function AitoolsPage() {
  return (
    <>
      <ToolJsonLd name="AI Тіл құралдары" description="Аудару, латынға айналдыру, емлесін тексеру" url="/aitools" />
      <FAQJsonLd questions={faqData} />
      <AiToolsPage />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
