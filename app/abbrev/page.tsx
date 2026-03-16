import { AbbreviationsPage } from '@/components/tools/AbbreviationsPage'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

const faqData = [
  { question: 'Ресми құжаттарда қысқартуларды қалай қолдану керек?', answer: 'Бірінші рет толық жазып, жақшада қысқартуын беру: Жеке кәсіпкер (ЖК).' },
  { question: 'ЖСН мен БСН айырмашылығы не?', answer: 'ЖСН — жеке тұлғаның 12 санды нөмірі. БСН — заңды тұлғаның 12 санды нөмірі.' },
]

export const metadata: Metadata = {
  title: 'Қысқартулар анықтамасы — Quralhub',
  description: 'Қазақстандық ресми қысқартулар мен аббревиатуралар: ОПВ, ЖК, НДС, МРП, ЖСН, БСН және т.б.',
}

export default function AbbrevPage() {
  return (
    <>
      <ToolJsonLd name="Қысқартулар анықтамасы" description="Қазақстандық ресми қысқартулар мен аббревиатуралар" url="/abbrev" />
      <FAQJsonLd questions={faqData} />
      <AbbreviationsPage />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
