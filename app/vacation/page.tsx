import { VacationCalc } from '@/components/calculators/VacationCalc'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Демалыс ақы калькуляторы — Quralhub',
  description: 'Жыл сайынғы ақылы демалыс ақысын есептеу. ОПВ, ИПН, ВОСМС ұсталымдары.',
}

const faqData = [
  { question: 'Ең аз демалыс неше күн?', answer: '24 күнтізбелік күн (ЕК 88-бап). Зиянды жағдайлар үшін қосымша 6+ күн.' },
  { question: 'Демалыс ақысынан салық ұсталады ма?', answer: 'Иә, жалақыдай: ОПВ 10%, ИПН 10%, ВОСМС 2% ұсталады.' },
  { question: 'Демалыс ақысын қашан алуға болады?', answer: 'Демалыс басталғанға дейін 3 жұмыс күнінен кешіктірілмей (ЕК 92-бап).' },
  { question: 'Жұмыс істемеген ай үшін демалыс есептеле ме?', answer: 'Пропорционалды есептеледі. 12 ай жұмыс — толық 24 күн.' },
]

export default function VacationPage() {
  return (
    <>
      <ToolJsonLd name="Демалыс ақы калькуляторы" description="Жыл сайынғы ақылы демалыс ақысын есептеу. ОПВ, ИПН, ВОСМС ұсталымдары." url="/vacation" />
      <FAQJsonLd questions={faqData} />
      <VacationCalc />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
