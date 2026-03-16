import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Нұсқаулықтар — Quralhub',
  description: 'Қазақстан заңнамасы бойынша толық нұсқаулықтар: жалақы есебі, ЖК ашу, НДС, депозиттер, ипотека, штрафтар.',
  keywords: ['нұсқаулық', 'гайд', 'Казахстан заңнама', 'салық нұсқаулық', 'қаржы нұсқаулық'],
}

const guides = [
  {
    href: '/guides/salary-guide-2026',
    title: 'Жалақы есебі 2026 — толық нұсқаулық',
    subtitle: 'ОПВ, ИПН 10-15%, ВОСМС ұсталымдары. 350 000₸ мысалмен қадамдық есептеу.',
    date: '2026-01-15',
    readTime: '8 мин',
  },
  {
    href: '/guides/ip-open-2026',
    title: 'ЖК ашу 2026 — қадамдық нұсқаулық',
    subtitle: 'eGov, Kaspi Business, ЦОН арқылы тіркелу. Спрощёнка vs самозанятый салыстыру.',
    date: '2026-01-20',
    readTime: '10 мин',
  },
  {
    href: '/guides/nds-16-2026',
    title: 'НДС 16% — 2026 жылғы өзгерістер',
    subtitle: 'ҚҚС 12%-дан 16%-ға өсті. Кімдер төлейді, жеңілдікті ставкалар, бағаға әсері.',
    date: '2026-01-10',
    readTime: '6 мин',
  },
  {
    href: '/guides/deposit-compare-2026',
    title: 'Ең тиімді депозиттер — наурыз 2026',
    subtitle: 'ТОП-5 депозит ставкалары, ҚДКҚ кепілдігі, базалық ставка 18%.',
    date: '2026-03-01',
    readTime: '7 мин',
  },
  {
    href: '/guides/mortgage-programs-2026',
    title: 'Ипотека бағдарламалары 2026',
    subtitle: 'Отбасы банк 5%, 7-20-25 бағдарламасы 7%, коммерциялық 16-21% салыстыру.',
    date: '2026-02-01',
    readTime: '9 мин',
  },
  {
    href: '/guides/fines-table-2026',
    title: 'Жол штрафтары 2026 — толық кесте',
    subtitle: 'Барлық штрафтар МРП-мен, 50% жеңілдік ережесі, тексеру және төлеу.',
    date: '2026-01-25',
    readTime: '8 мин',
  },
]

export default function GuidesIndexPage() {
  return (
    <div className="max-w-[720px] mx-auto px-5 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">Нұсқаулықтар</h1>
      <p className="text-muted-foreground mb-8">Қазақстан заңнамасы бойынша толық нұсқаулықтар мен гайдтар</p>

      <div className="grid gap-4">
        {guides.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            className="block p-5 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
              <time>{guide.date}</time>
              <span>&middot;</span>
              <span>{guide.readTime} оқу</span>
            </div>
            <h2 className="text-lg font-bold mb-1">{guide.title}</h2>
            <p className="text-sm text-muted-foreground">{guide.subtitle}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
