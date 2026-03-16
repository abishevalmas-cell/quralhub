export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export function WebApplicationJsonLd() {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Quralhub',
      url: 'https://qural.kz',
      description: 'Қазақстан үшін 27+ тегін құралдар платформасы — калькуляторлар, тариф салыстыру, AI аудармашы',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'KZT',
      },
      inLanguage: ['kk', 'ru'],
      author: {
        '@type': 'Organization',
        name: 'Quralhub',
      },
    }} />
  )
}

export function ToolJsonLd({ name, description, url }: { name: string; description: string; url: string }) {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name,
      description,
      url: `https://qural.kz${url}`,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KZT' },
      inLanguage: ['kk', 'ru'],
    }} />
  )
}

export function FAQJsonLd({ questions }: { questions: { question: string; answer: string }[] }) {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: questions.map(q => ({
        '@type': 'Question',
        name: q.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: q.answer,
        },
      })),
    }} />
  )
}
