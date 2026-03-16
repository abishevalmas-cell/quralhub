import { SeptikTool } from '@/components/tools/SeptikTool'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

const faqData = [
  { question: 'Қазақ тілінде неше септік бар?', answer: '7 септік: Атау, Ілік, Барыс, Табыс, Жатыс, Шығыс, Көмектес.' },
  { question: 'Жуан/жіңішке дауыстылар қалай анықталады?', answer: 'Жуан: а, о, ұ, ы. Жіңішке: ә, ө, ү, і, е. Жалғау осыған байланысты.' },
  { question: 'Лауазым септеуде ерекшелік бар ма?', answer: "Көп сөзді лауазымдарда тек соңғы сөз септеледі: 'бас директор' → 'бас директордың'." },
]

export const metadata: Metadata = {
  title: 'Септік құрал — Quralhub',
  description: 'Сөздерді, сандарды 7 септік бойынша септеу',
}

export default function SeptikPage() {
  return (
    <>
      <ToolJsonLd name="Септік құрал" description="Сөздерді, сандарды 7 септік бойынша септеу" url="/septik" />
      <FAQJsonLd questions={faqData} />
      <SeptikTool />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
