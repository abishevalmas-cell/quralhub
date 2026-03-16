const GA_ID = process.env.NEXT_PUBLIC_GA_ID || ''
const YM_ID = process.env.NEXT_PUBLIC_YM_ID || ''

export function trackEvent(action: string, category: string, label?: string, value?: number) {
  // GA4
  if (GA_ID && typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value,
    })
  }
  // Yandex.Metrika
  if (YM_ID && typeof window !== 'undefined' && (window as any).ym) {
    (window as any).ym(Number(YM_ID), 'reachGoal', action, { category, label, value })
  }
}
