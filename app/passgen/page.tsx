import { PassgenTool } from '@/components/calculators/PassgenTool'
import { ToolJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'
import { FAQ } from '@/components/seo/FAQ'
import type { Metadata } from 'next'

const faqData = [
  { question: 'Қауіпсіз құпия сөз қандай болу керек?', answer: 'Кемінде 12 символ, бас/кіші әріптер, сандар, арнайы символдар. Әр сайтқа жеке құпия сөз.' },
  { question: 'Құпия сөзді қалай сақтау керек?', answer: 'Пароль менеджері (Bitwarden, 1Password) қолданыңыз. Браузерде сақтау — қауіпті.' },
]

export const metadata: Metadata = {
  title: 'Құпия сөз генераторы — Quralhub',
  description: 'Қауіпсіз құпия сөз генераторы. 8-32 таңба, арнайы символдар.',
}

export default function PassgenPage() {
  return (
    <>
      <ToolJsonLd name="Құпия сөз генераторы" description="Қауіпсіз құпия сөз генераторы. 8-32 таңба, арнайы символдар." url="/passgen" />
      <FAQJsonLd questions={faqData} />
      <PassgenTool />
      <div className="max-w-[680px] mx-auto px-5">
        <FAQ items={faqData} />
      </div>
    </>
  )
}
