import { SalaryCalc } from '@/components/calculators/SalaryCalc'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Жалақы калькуляторы — Quralhub',
  description: 'Жаңа Салық кодексі 2026 бойынша жалақы есебі. ОПВ, ИПН 10-15%, ВОСМС, ОПВР 3.5% ұсталымдары.',
}

const faqData = [
  { question: '2026 жылы жалақыдан қандай салықтар ұсталады?', answer: 'ОПВ 10%, ИПН 10-15% (прогрессивті шкала), ВОСМС 2%. Жұмыс беруші: СО 5%, СН 6%, ООСМС 3%, ОПВР 3.5%.' },
  { question: '2026 жылы ИПН вычет қанша?', answer: '30 МРП = 129 750₸ (2025 жылы 14 МРП болған). Бұл жалақыңыздың салық базасын азайтады.' },
  { question: 'Прогрессивті ИПН деген не?', answer: '2026 жылдан бастап ИПН прогрессивті: жылдық табыс 8 500 МРП-ға дейін — 10%, одан жоғары — 15%.' },
  { question: 'ОПВР 3.5% деген не?', answer: 'Жұмыс берушінің міндетті зейнетақы жарнасы. 2025 жылы 1.5% болған, 2026 жылдан 3.5%-ға өсті.' },
]

export default function SalaryPage() {
  return (
    <>
      <ToolJsonLd name="Жалақы калькуляторы" description="Жаңа Салық кодексі 2026 бойынша жалақы есебі. ОПВ, ИПН 10-15%, ВОСМС, ОПВР 3.5% ұсталымдары." url="/salary" />
      <FAQJsonLd questions={faqData} />
      <SalaryCalc />
    </>
  )
}
