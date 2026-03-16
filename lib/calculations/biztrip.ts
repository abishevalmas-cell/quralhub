import { MRP } from '@/lib/constants'

// Суточные нормы по НК РК 2026 (не облагаемые ИПН)
const DAILY_DOMESTIC = 6 // 6 МРП внутри КЗ
const DAILY_ABROAD = 8   // 8 МРП за рубежом

export interface BizTripResult {
  days: number
  dailyRate: number
  dailyTotal: number
  accommodation: number
  travel: number
  total: number
  taxFree: number
  taxable: number
  ipn: number
  netTotal: number
}

export function calcBizTrip(
  days: number,
  type: 'domestic' | 'abroad',
  customDaily: number, // если > нормы, разница облагается
  accommodation: number,
  travel: number,
): BizTripResult {
  const normMRP = type === 'domestic' ? DAILY_DOMESTIC : DAILY_ABROAD
  const normDaily = normMRP * MRP
  const dailyRate = customDaily > 0 ? customDaily : normDaily
  const dailyTotal = dailyRate * days

  const taxFreeDaily = Math.min(dailyRate, normDaily)
  const taxFree = taxFreeDaily * days
  const taxable = Math.max(0, dailyTotal - taxFree)
  const ipn = Math.round(taxable * 0.1) // ИПН 10% с превышения

  const total = dailyTotal + accommodation + travel
  const netTotal = total - ipn

  return {
    days,
    dailyRate,
    dailyTotal,
    accommodation,
    travel,
    total,
    taxFree,
    taxable,
    ipn,
    netTotal,
  }
}
