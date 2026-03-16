import { TaxCalc } from '@/components/calculators/TaxCalc'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ЖК салық калькуляторы — Quralhub',
  description: 'Упрощёнка 4%, самозанятый ИПН=0%. Жаңа Салық кодексі 2026 бойынша ЖК салық есебі.',
}

const faqData = [
  { question: 'Упрощёнка 2026 жылы қанша пайыз?', answer: '4% (2025 жылы 3% болған). Маслихат шешімімен 2%-дан 6%-ға дейін өзгеруі мүмкін.' },
  { question: 'Патент режимі жойылды ма?', answer: 'Иә, 2026 жылдан бастап патент режимі толығымен жойылды. Оның орнына самозанятый режимі енгізілді.' },
  { question: 'ЖК НДС төлеуі керек пе?', answer: 'Жылдық табыс 10 000 МРП (43 250 000₸) аспаса — НДС-тен босатылған.' },
  { question: 'Упрощёнкадан жалпыға қалай көшуге болады?', answer: 'Салық комитетіне өтініш беру арқылы. Көшу жаңа салық кезеңінен бастап жүзеге асады.' },
]

export default function TaxPage() {
  return (
    <>
      <ToolJsonLd name="ЖК салық калькуляторы" description="Упрощёнка 4%, самозанятый ИПН=0%. Жаңа Салық кодексі 2026 бойынша ЖК салық есебі." url="/tax" />
      <FAQJsonLd questions={faqData} />
      <TaxCalc />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
