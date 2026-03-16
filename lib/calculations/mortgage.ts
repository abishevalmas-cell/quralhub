export interface MortgageResult {
  price: number
  downPayment: number
  loan: number
  rate: number
  monthly: number
  total: number
  overpay: number
}

export function calcMortgage(price: number, downPercent: number, years: number, rate: number): MortgageResult {
  const downPayment = Math.round(price * downPercent / 100)
  const loan = price - downPayment
  const mr = rate / 100 / 12
  const n = years * 12
  const monthly = Math.round(loan * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1))
  const total = monthly * n
  const overpay = total - loan
  return { price, downPayment, loan, rate, monthly, total, overpay }
}
