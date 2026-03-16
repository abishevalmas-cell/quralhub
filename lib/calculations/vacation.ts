import { MRP } from '../constants'

export interface VacationResult {
  avgDaily: number
  days: number
  vacPay: number
  opv: number
  ipn: number
  vosms: number
  net: number
}

export function calcVacation(salary: number, days: number, workedMonths: number): VacationResult {
  const avgDaily = Math.round((salary * workedMonths / 12) / 29.3)
  const vacPay = Math.round(avgDaily * days)
  const opv = Math.round(vacPay * 0.10)
  const ipn = Math.round(Math.max(vacPay - opv - Math.min(30 * MRP, vacPay), 0) * 0.10)
  const vosms = Math.round(vacPay * 0.02)
  const net = vacPay - opv - ipn - vosms
  return { avgDaily, days, vacPay, opv, ipn, vosms, net }
}
