import { MRP } from '../constants'

export interface CustomsResult {
  duty: number
  utilization: number
  registration: number
  total: number
}

export function calcCustoms(priceEur: number, cc: number, age: 'new' | 'mid' | 'old'): CustomsResult {
  const eurKzt = 560
  let duty: number
  if (age === 'new') {
    const rate = cc <= 1000 ? 2.5 : cc <= 1500 ? 4 : cc <= 1800 ? 5.5 : cc <= 2300 ? 7.5 : cc <= 3000 ? 15 : 20
    duty = Math.round(priceEur * rate / 100 * eurKzt)
  } else if (age === 'mid') {
    const perCc = cc <= 1000 ? 1.5 : cc <= 1500 ? 1.7 : cc <= 1800 ? 2.5 : cc <= 2300 ? 2.7 : cc <= 3000 ? 3 : 3.6
    duty = Math.round(cc * perCc * eurKzt)
  } else {
    const perCc = cc <= 1000 ? 3 : cc <= 1500 ? 3.2 : cc <= 1800 ? 3.5 : cc <= 2300 ? 4.8 : cc <= 3000 ? 5 : 5.7
    duty = Math.round(cc * perCc * eurKzt)
  }
  const utilization = cc <= 3000 ? 413000 : 620000
  const registration = Math.round(0.25 * 25 * MRP)
  return { duty, utilization, registration, total: duty + utilization + registration }
}
