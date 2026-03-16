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

export const NB_RATES: Record<string, number> = {
  usd: 515,
  eur: 560,
  rub: 5.3,
  cny: 71,
}

export const EXCHANGE_OFFICES: Record<string, ExchangeOffice[]> = {
  'Алматы': [
    { name: 'Обменник "Алтын"', usd: { buy: 513, sell: 517 }, eur: { buy: 557, sell: 563 }, rub: { buy: 5.2, sell: 5.4 }, cny: { buy: 70, sell: 72 } },
    { name: 'Kaspi Обмен', usd: { buy: 514, sell: 516 }, eur: { buy: 558, sell: 562 }, rub: { buy: 5.25, sell: 5.35 }, cny: { buy: 70.5, sell: 71.5 } },
    { name: 'Exchange Pro', usd: { buy: 512, sell: 518 }, eur: { buy: 556, sell: 564 }, rub: { buy: 5.15, sell: 5.45 }, cny: { buy: 69.5, sell: 72.5 } },
    { name: 'Halyk Обмен', usd: { buy: 513.5, sell: 516.5 }, eur: { buy: 558, sell: 562 }, rub: { buy: 5.2, sell: 5.4 }, cny: { buy: 70, sell: 72 } },
    { name: 'ForteExchange', usd: { buy: 514, sell: 517 }, eur: { buy: 559, sell: 563 }, rub: { buy: 5.22, sell: 5.38 }, cny: { buy: 70.2, sell: 71.8 } },
    { name: 'Обменник "Тенге"', usd: { buy: 514.5, sell: 515.5 }, eur: { buy: 559.5, sell: 561 }, rub: { buy: 5.28, sell: 5.32 }, cny: { buy: 70.8, sell: 71.2 } },
  ],
  'Астана': [
    { name: 'Обменник "Астана"', usd: { buy: 513, sell: 517 }, eur: { buy: 557, sell: 563 }, rub: { buy: 5.2, sell: 5.4 }, cny: { buy: 70, sell: 72 } },
    { name: 'Kaspi Обмен', usd: { buy: 514, sell: 516 }, eur: { buy: 558, sell: 562 }, rub: { buy: 5.25, sell: 5.35 }, cny: { buy: 70.5, sell: 71.5 } },
    { name: 'Capital Exchange', usd: { buy: 513.5, sell: 516.5 }, eur: { buy: 558, sell: 562 }, rub: { buy: 5.22, sell: 5.38 }, cny: { buy: 70.2, sell: 71.8 } },
    { name: 'Halyk Обмен', usd: { buy: 513, sell: 517 }, eur: { buy: 557, sell: 563 }, rub: { buy: 5.2, sell: 5.4 }, cny: { buy: 70, sell: 72 } },
    { name: 'Сарыарқа Обмен', usd: { buy: 514, sell: 516.5 }, eur: { buy: 559, sell: 562 }, rub: { buy: 5.24, sell: 5.36 }, cny: { buy: 70.3, sell: 71.7 } },
  ],
  'Шымкент': [
    { name: 'Обменник "Оңтүстік"', usd: { buy: 512, sell: 518 }, eur: { buy: 556, sell: 564 }, rub: { buy: 5.15, sell: 5.45 }, cny: { buy: 69.5, sell: 72.5 } },
    { name: 'Kaspi Обмен', usd: { buy: 514, sell: 516 }, eur: { buy: 558, sell: 562 }, rub: { buy: 5.25, sell: 5.35 }, cny: { buy: 70.5, sell: 71.5 } },
    { name: 'Шымкент Exchange', usd: { buy: 513, sell: 517 }, eur: { buy: 557, sell: 563 }, rub: { buy: 5.2, sell: 5.4 }, cny: { buy: 70, sell: 72 } },
    { name: 'Halyk Обмен', usd: { buy: 513.5, sell: 516.5 }, eur: { buy: 558, sell: 562 }, rub: { buy: 5.2, sell: 5.4 }, cny: { buy: 70, sell: 72 } },
    { name: 'Айнабұлақ Обмен', usd: { buy: 513, sell: 517.5 }, eur: { buy: 557, sell: 563.5 }, rub: { buy: 5.18, sell: 5.42 }, cny: { buy: 69.8, sell: 72.2 } },
  ],
}

export const CURRENCY_KEYS = ['usd', 'eur', 'rub', 'cny'] as const
export type CurrencyKey = typeof CURRENCY_KEYS[number]

export const CURRENCY_LABELS: Record<CurrencyKey, string> = {
  usd: 'USD — АҚШ доллары',
  eur: 'EUR — Еуро',
  rub: 'RUB — Ресей рублі',
  cny: 'CNY — Қытай юані',
}

export const CITY_LIST = ['Алматы', 'Астана', 'Шымкент'] as const

/** Get offices for a city, falls back to Almaty data */
export function getOfficesForCity(city: string): ExchangeOffice[] {
  return EXCHANGE_OFFICES[city] || EXCHANGE_OFFICES['Алматы']
}
