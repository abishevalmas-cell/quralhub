// === EXCHANGE OFFICES DATA (2026 March) ===

export interface CurrencyRates {
  buy: number
  sell: number
}

export interface ExchangeOffice {
  name: string
  usd: CurrencyRates
  eur: CurrencyRates
  rub: CurrencyRates
  cny: CurrencyRates
}

// Fallback NB rates — updated from data.json on mount
export const NB_RATES: Record<string, number> = {
  usd: 483,
  eur: 540,
  rub: 5.6,
  cny: 67,
}

export const EXCHANGE_OFFICES: Record<string, ExchangeOffice[]> = {
  'Алматы': [
    { name: 'Обменник "Алтын"', usd: { buy: 481, sell: 485 }, eur: { buy: 538, sell: 543 }, rub: { buy: 5.5, sell: 5.7 }, cny: { buy: 66, sell: 68 } },
    { name: 'Kaspi Обмен', usd: { buy: 482, sell: 484 }, eur: { buy: 539, sell: 542 }, rub: { buy: 5.55, sell: 5.65 }, cny: { buy: 66.5, sell: 67.5 } },
    { name: 'Exchange Pro', usd: { buy: 480, sell: 486 }, eur: { buy: 537, sell: 544 }, rub: { buy: 5.45, sell: 5.75 }, cny: { buy: 65.5, sell: 68.5 } },
  ],
  'Астана': [
    { name: 'Обменник "Астана"', usd: { buy: 481, sell: 485 }, eur: { buy: 538, sell: 543 }, rub: { buy: 5.5, sell: 5.7 }, cny: { buy: 66, sell: 68 } },
    { name: 'Capital Exchange', usd: { buy: 481.5, sell: 484.5 }, eur: { buy: 538, sell: 542 }, rub: { buy: 5.52, sell: 5.68 }, cny: { buy: 66.2, sell: 67.8 } },
  ],
  'Шымкент': [
    { name: 'Обменник "Оңтүстік"', usd: { buy: 480, sell: 486 }, eur: { buy: 537, sell: 544 }, rub: { buy: 5.45, sell: 5.75 }, cny: { buy: 65.5, sell: 68.5 } },
    { name: 'Kaspi Обмен', usd: { buy: 482, sell: 484 }, eur: { buy: 539, sell: 542 }, rub: { buy: 5.55, sell: 5.65 }, cny: { buy: 66.5, sell: 67.5 } },
  ],
}

export const CURRENCY_KEYS = ['usd', 'eur', 'rub', 'cny'] as const
export type CurrencyKey = typeof CURRENCY_KEYS[number]

// All convertible currencies including KZT
export type ConvertCurrency = CurrencyKey | 'kzt'

export const ALL_CURRENCIES = ['kzt', 'usd', 'eur', 'rub', 'cny'] as const

export const CURRENCY_LABELS: Record<string, { kz: string; ru: string; flag: string }> = {
  kzt: { kz: 'KZT — Қазақстан теңгесі', ru: 'KZT — Казахстанский тенге', flag: '🇰🇿' },
  usd: { kz: 'USD — АҚШ доллары', ru: 'USD — Доллар США', flag: '🇺🇸' },
  eur: { kz: 'EUR — Еуро', ru: 'EUR — Евро', flag: '🇪🇺' },
  rub: { kz: 'RUB — Ресей рублі', ru: 'RUB — Российский рубль', flag: '🇷🇺' },
  cny: { kz: 'CNY — Қытай юані', ru: 'CNY — Китайский юань', flag: '🇨🇳' },
}

// All cities from kurs.kz (data.json provides live data)
export const ALL_CITIES = [
  'Алматы', 'Астана', 'Шымкент', 'Қарағанды', 'Ақтөбе',
  'Павлодар', 'Семей', 'Қостанай', 'Орал', 'Атырау',
  'Тараз', 'Өскемен', 'Ақтау', 'Түркістан',
] as const

export const CITY_LIST = ALL_CITIES

export function getOfficesForCity(city: string): ExchangeOffice[] {
  return EXCHANGE_OFFICES[city] || []
}
