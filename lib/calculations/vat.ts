export interface VatResult {
  withVat: number
  withoutVat: number
  vat: number
}

export function calcVat(amount: number, ratePercent: number, method: 'add' | 'extract'): VatResult {
  const rate = ratePercent / 100
  if (method === 'add') {
    const withoutVat = amount
    const vat = Math.round(amount * rate)
    return { withoutVat, vat, withVat: amount + vat }
  } else {
    const withVat = amount
    const vat = Math.round(amount * rate / (1 + rate))
    return { withVat, vat, withoutVat: amount - vat }
  }
}
