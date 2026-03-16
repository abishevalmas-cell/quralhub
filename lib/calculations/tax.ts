import { MRP, MZP } from '../constants'

export interface TaxResult {
  income: number
  ipn: number
  opvMonthly: number
  soMonthly: number
  vosmMonthly: number
  total6Months: number
  incomeLimit?: number
  monthlyPayment?: number
}

export function calcTax(income: number, mode: 'simp' | 'self'): TaxResult {
  if (mode === 'simp') {
    const ipn = Math.round(income * 0.04)
    const opvM = Math.round(Math.min(Math.max(income / 6, MZP), 50 * MZP) * 0.10)
    const soM = Math.round(Math.max(income / 6 - opvM, MZP) * 0.05)
    const vosmM = Math.round(1.4 * MZP * 0.05)
    return { income, ipn, opvMonthly: opvM, soMonthly: soM, vosmMonthly: vosmM, total6Months: ipn + opvM * 6 + soM * 6 + vosmM * 6 }
  } else {
    const opvM = Math.round(MZP * 0.10)
    const soM = Math.round(Math.max(MZP - opvM, MZP) * 0.05)
    const vosmM = Math.round(1.4 * MZP * 0.05)
    return { income, ipn: 0, opvMonthly: opvM, soMonthly: soM, vosmMonthly: vosmM, total6Months: 0, incomeLimit: 340 * MRP, monthlyPayment: opvM + soM + vosmM }
  }
}
