export interface KaspiResult {
  price: number
  months: number
  total: number
  monthly: number
  overpay: number
  interestFree: boolean
}

export function calcKaspi(price: number, months: number): KaspiResult {
  const rates: Record<number, number> = { 3: 0, 6: 0, 12: 0.12, 24: 0.24 }
  const r = rates[months] || 0
  const total = Math.round(price * (1 + r))
  const monthly = Math.round(total / months)
  const overpay = total - price
  return { price, months, total, monthly, overpay, interestFree: r === 0 }
}
