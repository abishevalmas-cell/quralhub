import { FinesCalc } from '@/components/tools/FinesCalc'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ПДД Штрафтар 2026 — Жол штрафтары анықтамалығы | Quralhub',
  description: 'Қазақстан жол қозғалысы ережелерін бұзғаны үшін штрафтар. Жылдамдық, тұрақтау, құжаттар, қауіпсіздік, алкоголь. МРП = 4 325₸.',
}

const faqData = [
  { question: 'Штрафты қалай төлеуге болады?', answer: 'Kaspi, Egov.kz, банк арқылы. 7 күн ішінде төлесе — 50% жеңілдік.' },
  { question: 'Жылдамдықты 20 км/с асырғанда штраф қанша?', answer: '10 МРП = 43 250₸. Қайталағанда — 20 МРП.' },
  { question: 'Мас күйде жүргені үшін не болады?', answer: '50 МРП (216 250₸) + куәлік 3 жылға алынады. Қайталағанда — қылмыстық жауапкершілік.' },
  { question: 'Камерадан келген штрафты даулауға бола ма?', answer: 'Иә, 10 жұмыс күні ішінде сотқа шағымдануға болады.' },
]

export default function FinesPage() {
  return (
    <>
      <ToolJsonLd name="ПДД Штрафтар калькуляторы" description="Қазақстан жол қозғалысы ережелерін бұзғаны үшін штрафтар анықтамалығы. МРП = 4 325₸." url="/fines" />
      <FAQJsonLd questions={faqData} />
      <FinesCalc />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
