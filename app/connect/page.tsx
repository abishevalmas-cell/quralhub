import { ConnectPage } from '@/components/tools/ConnectPage'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

const faqData = [
  { question: 'Ең арзан ұялы тариф қайсы?', answer: 'IZI Ultra — 2 690₸/ай (30 ГБ, 100 мин). Ең арзан безлімит — Altel Арнау (8 690₸).' },
  { question: 'НДС 16% тарифтерге қосылды ма?', answer: 'Иә, 2026 жылдан бастап барлық тарифтер 15-20% қымбаттады.' },
  { question: 'Ең жылдам үй интернет қай провайдер?', answer: 'Beeline Хит 1000 — 1000 Мбит/с (9 990₸/ай). Kazakhtelecom iD Net — 500 Мбит/с.' },
  { question: 'Нөмірді сақтап оператор ауыстыруға бола ма?', answer: 'Иә, MNP (Mobile Number Portability) қызметі барлық операторларда жұмыс істейді.' },
]

export const metadata: Metadata = {
  title: 'Байланыс тарифтер — Quralhub',
  description: 'Ұялы байланыс пен үй интернет тарифтерін салыстыру',
}

export default function ConnectPageRoute() {
  return (
    <>
      <ToolJsonLd name="Байланыс тарифтер салыстыру" description="Ұялы байланыс пен үй интернет тарифтерін салыстыру" url="/connect" />
      <FAQJsonLd questions={faqData} />
      <ConnectPage />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
        <RelatedTools toolIds={['communal', 'currency']} />
      </div>
    </>
  )
}
