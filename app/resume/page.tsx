import { ResumeBuilder } from '@/components/tools/ResumeBuilder'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

const faqData = [
  { question: 'Қазақстанда CV қандай форматта болу керек?', answer: 'A4 бір бет, фото міндетті емес, хронологиялық тәртіп.' },
  { question: 'CV-де не жазу керек?', answer: 'Т.А.Ә., байланыс, мақсат, білім, тәжірибе, дағдылар. Жалақы күтімін жазбаңыз.' },
]

export const metadata: Metadata = {
  title: 'Түйіндеме конструкторы — Quralhub',
  description: 'Қазақша CV жасау — 3 үлгі, білім, тәжірибе, дағдылар',
}

export default function ResumePage() {
  return (
    <>
      <ToolJsonLd name="Түйіндеме конструкторы" description="Қазақша CV жасау — 3 үлгі, білім, тәжірибе, дағдылар" url="/resume" />
      <FAQJsonLd questions={faqData} />
      <ResumeBuilder />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
