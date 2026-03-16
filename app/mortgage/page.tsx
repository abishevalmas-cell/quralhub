import { MortgageCalc } from '@/components/calculators/MortgageCalc'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ипотека калькуляторы — Quralhub',
  description: 'Отбасы банк, 7-20-25, коммерциялық ипотека — ай сайынғы төлемді есептеңіз.',
}

const faqData = [
  { question: 'Отбасы банк ипотека ставкасы қанша?', answer: 'Отбасы банк бағдарламасы бойынша жылдық 5% ставка. Бұл ең тиімді мемлекеттік бағдарлама.' },
  { question: '7-20-25 бағдарламасы деген не?', answer: '7% ставка, 20 жыл мерзім, 25% алғашқы жарна. Бірінші тұрғын үй сатып алушыларға арналған.' },
  { question: 'Коммерциялық ипотека ставкасы қанша?', answer: '2026 жылы коммерциялық банктерде 16-21% аралығында. Halyk, BCC — 16-18%, басқалар 18-21%.' },
]

export default function MortgagePage() {
  return (
    <>
      <ToolJsonLd name="Ипотека калькуляторы" description="Отбасы банк, 7-20-25, коммерциялық ипотека — ай сайынғы төлемді есептеңіз." url="/mortgage" />
      <FAQJsonLd questions={faqData} />
      <MortgageCalc />
      <div className="max-w-[680px] mx-auto px-5">
        <RelatedTools toolIds={['bankdep', 'bankcred', 'communal']} />
      </div>
    </>
  )
}
