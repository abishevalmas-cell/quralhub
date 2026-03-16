import { MRP, MZP } from '../constants'

export interface SalaryResult {
  oklad: number
  opv: number
  vosms: number
  ipn: number
  net: number
  so: number
  sn: number
  oosms: number
  opvr: number
  totalCost: number
}

function computeNet(ok: number, options: { pension: boolean; disabled: boolean; deduction: boolean }) {
  const { pension, disabled, deduction } = options
  const opv = pension ? 0 : Math.round(Math.min(ok, 50 * MZP) * 0.10)
  const vosms = (pension || disabled) ? 0 : Math.round(Math.min(ok, 20 * MZP) * 0.02)
  let ipnBase = ok - opv - vosms
  if (deduction) ipnBase -= 30 * MRP
  if (disabled) ipnBase -= Math.round(882 * MRP / 12)
  if (ipnBase < 0) ipnBase = 0
  const annualBase = ipnBase * 12
  const threshold = 8500 * MRP
  let ipn: number
  if (annualBase <= threshold) {
    ipn = Math.round(ipnBase * 0.10)
  } else {
    const monthlyThreshold = threshold / 12
    ipn = Math.round(monthlyThreshold * 0.10 + (ipnBase - monthlyThreshold) * 0.15)
  }
  return { opv, vosms, ipn, net: ok - opv - vosms - ipn }
}

export function calcSalary(
  amount: number,
  method: 'direct' | 'reverse',
  options: { pension: boolean; disabled: boolean; deduction: boolean }
): SalaryResult {
  let ok: number
  if (method === 'direct') {
    ok = amount
  } else {
    let lo = amount, hi = amount * 2
    for (let i = 0; i < 50; i++) {
      const mid = Math.round((lo + hi) / 2)
      const r = computeNet(mid, options)
      if (r.net < amount) lo = mid + 1; else hi = mid
    }
    ok = Math.round((lo + hi) / 2)
  }
  const { opv, vosms, ipn, net } = computeNet(ok, options)
  const so = options.pension ? 0 : Math.round(Math.max(ok - opv, MZP) * 0.05)
  let sn = Math.round(ok * 0.06 - so)
  if (sn < 0) sn = 0
  const oosms = (options.pension || options.disabled) ? 0 : Math.round(ok * 0.03)
  const opvr = options.pension ? 0 : Math.round(Math.min(ok, 50 * MZP) * 0.035)
  const totalCost = ok + so + sn + oosms + opvr
  return { oklad: ok, opv, vosms, ipn, net, so, sn, oosms, opvr, totalCost }
}
