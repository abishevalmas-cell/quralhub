import { MRP } from '../constants'

export type Currency = 'usd' | 'eur'
export type CarType = 'ice' | 'ev'

const RATES: Record<Currency, number> = { usd: 510, eur: 560 }

export interface CustomsResult {
  priceKzt: number
  duty: number
  utilization: number
  registration: number
  evDiscount: boolean
  total: number
}

export function calcCustoms(
  price: number,
  cc: number,
  age: 'new' | 'mid' | 'old',
  currency: Currency = 'usd',
  carType: CarType = 'ice',
): CustomsResult {
  const rate = RATES[currency]
  const priceKzt = Math.round(price * rate)
  let duty: number

  if (carType === 'ev') {
    // Электромобили — 0% таможенная пошлина до 31.12.2026 (Постановление Правительства РК)
    duty = 0
  } else if (age === 'new') {
    const pct = cc <= 1000 ? 2.5 : cc <= 1500 ? 4 : cc <= 1800 ? 5.5 : cc <= 2300 ? 7.5 : cc <= 3000 ? 15 : 20
    duty = Math.round(price * pct / 100 * rate)
  } else if (age === 'mid') {
    const perCc = cc <= 1000 ? 1.5 : cc <= 1500 ? 1.7 : cc <= 1800 ? 2.5 : cc <= 2300 ? 2.7 : cc <= 3000 ? 3 : 3.6
    duty = Math.round(cc * perCc * RATES.eur) // пошлина всегда в EUR за см³
  } else {
    const perCc = cc <= 1000 ? 3 : cc <= 1500 ? 3.2 : cc <= 1800 ? 3.5 : cc <= 2300 ? 4.8 : cc <= 3000 ? 5 : 5.7
    duty = Math.round(cc * perCc * RATES.eur)
  }

  // Утильсбор: электрокары — сниженный (50 МРП), ДВС — стандартный
  let utilization: number
  if (carType === 'ev') {
    utilization = Math.round(50 * MRP) // сниженный для электрокаров
  } else {
    utilization = cc <= 3000 ? 413000 : 620000
  }

  const registration = Math.round(0.25 * 25 * MRP)

  return {
    priceKzt,
    duty,
    utilization,
    registration,
    evDiscount: carType === 'ev',
    total: duty + utilization + registration,
  }
}
