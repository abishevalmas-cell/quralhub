import { MrpCalc } from '@/components/calculators/MrpCalc'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'МРП ↔ Тенге конвертер — Quralhub',
  description: 'МРП 2026 = 4 325₸. МРП-ны тенгеге және тенгені МРП-ға конверттеу.',
}

const faqData = [
  { question: 'МРП 2026 жылы қанша?', answer: '1 МРП = 4 325₸ (2025 жылы 3 932₸ болған, +10% өсім).' },
  { question: 'МРП не үшін қолданылады?', answer: 'Штрафтар, мемлекеттік бажылар, пособиелер, салық вычеттері — барлығы МРП арқылы есептеледі.' },
  { question: 'Жол полициясының штрафы қанша?', answer: 'Ең жиі штраф 5 МРП = 21 625₸. Жолақы бұзушылықтары 3-30 МРП аралығында.' },
]

export default function MrpPage() {
  return (
    <>
      <ToolJsonLd name="МРП ↔ Тенге конвертер" description="МРП 2026 = 4 325₸. МРП-ны тенгеге және тенгені МРП-ға конверттеу." url="/mrp" />
      <FAQJsonLd questions={faqData} />
      <MrpCalc />
      <div className="max-w-[680px] mx-auto px-5">
        <RelatedTools toolIds={['salary', 'fines', 'transport']} />
      </div>
    </>
  )
}
