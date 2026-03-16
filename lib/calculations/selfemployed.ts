import { MRP, MZP } from '../constants'

export interface SelfEmployedResult {
  income: number
  overLimit: boolean
  limit: number
  opv: number
  so: number
  vosm: number
  total: number
  netIncome: number
}

export function calcSelfEmployed(income: number): SelfEmployedResult {
  const limit = 340 * MRP
  const overLimit = income > limit
  const opv = Math.round(Math.min(income, 50 * MZP) * 0.10)
  const so = Math.round(Math.max(income - opv, MZP) * 0.05)
  const vosm = Math.round(1.4 * MZP * 0.05)
  const total = opv + so + vosm
  return { income, overLimit, limit, opv, so, vosm, total, netIncome: income - total }
}
