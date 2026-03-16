import { BankCredPage } from '@/components/tools/BankCredPage'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

const faqData = [
  { question: 'Ең арзан тұтыну кредиті қай банкте?', answer: 'Kaspi Bank — 18% жылдық. Бірақ шарттар скоринг бойынша өзгереді.' },
  { question: 'Кредит алу үшін не қажет?', answer: 'ЖСН, 3 айдан кем емес жұмыс стажы, тұрақты табыс. Банктер қосымша құжат сұрауы мүмкін.' },
  { question: 'Кредитті мерзімінен бұрын жабуға бола ма?', answer: 'Иә, айыппұлсыз (ҚР заңы бойынша). Банк кедергі жасай алмайды.' },
]

export const metadata: Metadata = {
  title: 'Банк кредиттері — Quralhub',
  description: 'Барлық банктердің кредит шарттарын салыстырыңыз — ставка, ай сайынғы төлем, артық төлем',
}

export default function BankcredPage() {
  return (
    <>
      <ToolJsonLd name="Банк кредиттері салыстыру" description="Барлық банктердің кредит шарттарын салыстырыңыз — ставка, ай сайынғы төлем, артық төлем" url="/bankcred" />
      <FAQJsonLd questions={faqData} />
      <BankCredPage />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
