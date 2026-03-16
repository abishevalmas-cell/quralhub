import { MRP } from '../constants'

export interface TransportTaxResult {
  cc: number
  rateMRP: number
  rateAmount: number
  coefficient: number
  tax: number
}

export function calcTransport(cc: number, ageCategory: number): TransportTaxResult {
  const coefficient = ageCategory >= 20 ? 0.5 : ageCategory >= 10 ? 0.7 : 1.0
  let rateMRP: number
  if (cc <= 1100) rateMRP = 1
  else if (cc <= 1500) rateMRP = 2
  else if (cc <= 2000) rateMRP = 3
  else if (cc <= 2500) rateMRP = 5
  else if (cc <= 3000) rateMRP = 7
  else if (cc <= 4000) rateMRP = 10
  else rateMRP = 15
  const rateAmount = rateMRP * MRP
  const tax = Math.round(rateAmount * coefficient)
  return { cc, rateMRP, rateAmount, coefficient, tax }
}
