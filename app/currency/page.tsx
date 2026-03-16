import { CurrencyConverter } from '@/components/tools/CurrencyConverter'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

const faqData = [
  { question: 'НБ РК курсын қайдан білуге болады?', answer: 'nationalbank.kz сайтынан. Quralhub автоматты түрде жаңартады.' },
  { question: 'Обменникте курс неге басқа?', answer: 'Обменниктер спред қосады (buy/sell арасы). НБ курсы — орталықтандырылған, обменниктер нарықтық.' },
  { question: 'Долларды қашан сатып алу тиімді?', answer: 'Курс түсіп жатқанда. Ұзақ мерзімде теңге жыл сайын 5-8% құнсызданады.' },
  { question: 'Криптовалюта Қазақстанда заңды ма?', answer: 'AIFC аясында заңды. Binance P2P арқылы сатып алуға болады.' },
]

export const metadata: Metadata = {
  title: 'Валюта конвертер — Quralhub',
  description: 'НБ РК курсы, валюта айырбастау, кросс-конверсия',
}

export default function CurrencyPage() {
  return (
    <>
      <ToolJsonLd name="Валюта конвертер" description="НБ РК курсы, валюта айырбастау, кросс-конверсия" url="/currency" />
      <FAQJsonLd questions={faqData} />
      <CurrencyConverter />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
        <RelatedTools toolIds={['bankdep', 'bankcred']} />
      </div>
    </>
  )
}
