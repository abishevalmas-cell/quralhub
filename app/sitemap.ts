import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://qural.kz'

  const tools = [
    'salary', 'vat', 'mrp', 'tax', 'selfemployed', 'kaspi', 'vacation', 'maternity',
    'mortgage', 'transport', 'communal', 'customs',
    'currency', 'bankdep', 'bankcred', 'connect',
    'aitools', 'septik', 'propisyu', 'holidays',
    'doctemplates', 'resume', 'invoice', 'qr', 'pdf', 'passgen',
    'marketplace', 'fines', 'plates', 'calendars',
    'feedback',
  ]

  const guides = [
    'salary-guide-2026', 'ip-open-2026', 'nds-16-2026',
    'deposit-compare-2026', 'mortgage-programs-2026', 'fines-table-2026',
  ]

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...tools.map(tool => ({
      url: `${baseUrl}/${tool}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    {
      url: `${baseUrl}/guides`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    ...guides.map(guide => ({
      url: `${baseUrl}/guides/${guide}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ]
}
