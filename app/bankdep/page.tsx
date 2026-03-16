import { BankDepPage } from '@/components/tools/BankDepPage'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

const faqData = [
  { question: 'Ең жоғары депозит ставкасы қай банкте?', answer: '2026 наурыз: Eurasian Bank — 20% ГЭСВ (Turbo Deposit). Kaspi, ForteBank — 20% ГЭСВ.' },
  { question: 'КФГД кепілдігі қанша?', answer: 'Сберегательный — 20 млн₸ дейін. Талап етілгенге дейін — 10 млн₸.' },
  { question: 'Депозитке салық салына ма?', answer: 'Жоқ, жеке тұлғалардың депозит табысы ИПН-нен босатылған.' },
  { question: 'ГЭСВ деген не?', answer: 'Гарантированная эффективная ставка вознаграждения — бұл капитализацияны ескерген нақты ставка.' },
]

export const metadata: Metadata = {
  title: 'Банк депозиттері салыстыру — 14 банк | Quralhub',
  description: '14 банктің депозит ставкаларын ГЭСВ бойынша салыстырыңыз. Ең тиімді депозитті таңдаңыз.',
}

export default function BankdepPage() {
  return (
    <>
      <ToolJsonLd name="Банк депозиттері салыстыру" description="14 банктің депозит ставкаларын ГЭСВ бойынша салыстырыңыз" url="/bankdep" />
      <FAQJsonLd questions={faqData} />
      <BankDepPage />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
