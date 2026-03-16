import { PlatesPage } from '@/components/tools/PlatesPage'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Авто нөмір бағалары 2026 — VIP, таңдау, стандартты | Quralhub',
  description: 'Қазақстан авто нөмір белгілерінің бағалары 2026. Стандартты 3 975₸, таңдау 129 750₸, VIP 432 500₸, премиум 865 000₸. 20 аймақ, онлайн тіркеу.',
}

const faqData = [
  { question: 'VIP нөмір алу қанша тұрады?', answer: '100 МРП = 432 500₸. Премиум (001, 007) — 200 МРП = 865 000₸.' },
  { question: 'Нөмірді онлайн таңдауға бола ма?', answer: 'Иә, Egov.kz → «Көлік құралын тіркеу» → «Нөмір таңдау» бөлімінде.' },
  { question: 'Стандартты нөмір қанша?', answer: '3 975₸ (0.92 МРП). Тіркеу кезінде автоматты беріледі.' },
  { question: 'Нөмірді бір көліктен екіншіге ауыстыруға бола ма?', answer: 'Иә, қайта тіркеу 5 406₸ (1.25 МРП). СпецЦОН-ға бару керек.' },
]

export default function PlatesPageRoute() {
  return (
    <>
      <ToolJsonLd name="Авто нөмір бағалары" description="Қазақстан авто нөмір белгілерінің бағалары 2026. VIP, таңдау, стандартты нөмірлер." url="/plates" />
      <FAQJsonLd questions={faqData} />
      <PlatesPage />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
