import { DocTemplatesPage } from '@/components/tools/DocTemplatesPage'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

const faqData = [
  { question: 'Құжат шаблондары заңды күшке ие ме?', answer: 'Шаблондар үлгі ретінде берілген. Нотариалды куәландыру қажет болуы мүмкін.' },
  { question: 'Қандай шарт түрлері бар?', answer: '8 түрі: жалға беру, сату-сатып алу, еңбек, қарыз, қызмет, сенімхат, ЖК қызмет, көлік сату.' },
  { question: 'Құжатты қазақша ма, орысша ма жасау керек?', answer: 'Екі тілде де жарамды. Мемлекеттік мекемелерге — қазақша. Бизнеске — екі тілде.' },
]

export const metadata: Metadata = {
  title: 'Құжат үлгілері — Quralhub',
  description: 'Ресми құжаттар: өтініш, бұйрық, шарт, хат — қазақ тілінде толтыру',
}

export default function DoctemplatesPage() {
  return (
    <>
      <ToolJsonLd name="Құжат үлгілері" description="Ресми құжаттар: өтініш, бұйрық, шарт, хат — қазақ тілінде толтыру" url="/doctemplates" />
      <FAQJsonLd questions={faqData} />
      <DocTemplatesPage />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
        <RelatedTools toolIds={['resume', 'invoice', 'abbrev']} />
      </div>
    </>
  )
}
