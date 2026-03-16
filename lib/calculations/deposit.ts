export interface DepositResult {
  amount: number
  months: number
  rate: number
  profit: number
  total: number
}

export function calcDeposit(amount: number, months: number, rate: number): DepositResult {
  const profit = Math.round(amount * rate / 100 / 12 * months)
  return { amount, months, rate, profit, total: amount + profit }
}
