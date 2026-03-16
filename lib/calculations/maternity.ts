import { MRP } from '../constants'

export interface MaternityResult {
  birthDays: number
  avgDaily: number
  birthPay: number
  socTax: number
  netBirthPay: number
  childCareMonthly: number
  childCareTotal: number
  birthGrant: number
}

export function calcMaternity(salary: number, birthDays: number, workedMonths: number): MaternityResult {
  const avgDaily = Math.round((salary * workedMonths / 12) / 30)
  const birthPay = Math.round(avgDaily * birthDays)
  const socTax = Math.round(birthPay * 0.10)
  const netBirthPay = birthPay - socTax
  const childCareMonthly = Math.round(salary * 0.4)
  const childCareTotal = childCareMonthly * 12
  const birthGrant = 63 * MRP
  return { birthDays, avgDaily, birthPay, socTax, netBirthPay, childCareMonthly, childCareTotal, birthGrant }
}
