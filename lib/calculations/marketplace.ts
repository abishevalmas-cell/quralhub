// ─── Types ───────────────────────────────────────────────────

export interface MarketplaceResult {
  revenue: number
  commission: number
  logistics: number
  packaging: number
  costPrice: number
  totalExpenses: number
  profit: number
  margin: number
  roi: number
}

export type PlatformId = 'kaspi' | 'wb' | 'ozon'
export type FulfillmentType = 'fbs' | 'fbo'

export type CategoryId =
  | 'electronics'
  | 'clothing'
  | 'food'
  | 'appliances'
  | 'beauty'
  | 'other'

export interface CategoryInfo {
  id: CategoryId
  labelKz: string
  labelRu: string
}

export interface PlatformConfig {
  id: PlatformId
  label: string
  color: string      // tailwind color token for visual bars
  commissions: Record<CategoryId, number>
  logistics: { fbs: number; fbo: number }
  storageCostPerDay: number  // ₸/day/unit (0 if not applicable)
}

export interface PlatformComparisonRow {
  platformId: PlatformId
  label: string
  color: string
  commissionPercent: number
  commissionAmount: number
  logisticsCost: number
  packagingCost: number
  totalCostPerUnit: number
  profitPerUnit: number
  margin: number
  roi: number
}

export interface WaterfallStep {
  labelKz: string
  labelRu: string
  value: number
  type: 'income' | 'expense' | 'profit'
}

// ─── Constants ───────────────────────────────────────────────

export const CATEGORIES: CategoryInfo[] = [
  { id: 'electronics', labelKz: 'Электроника', labelRu: 'Электроника' },
  { id: 'clothing', labelKz: 'Киім', labelRu: 'Одежда' },
  { id: 'food', labelKz: 'Азық-түлік', labelRu: 'Продукты' },
  { id: 'appliances', labelKz: 'Тұрмыстық техника', labelRu: 'Бытовая техника' },
  { id: 'beauty', labelKz: 'Сұлулық', labelRu: 'Красота' },
  { id: 'other', labelKz: 'Басқа', labelRu: 'Другое' },
]

export const PLATFORMS: PlatformConfig[] = [
  {
    id: 'kaspi',
    label: 'Kaspi',
    color: 'red',
    commissions: {
      electronics: 5,
      clothing: 12,
      food: 8,
      appliances: 7,
      beauty: 10,
      other: 10,
    },
    logistics: { fbs: 0, fbo: 0 },
    storageCostPerDay: 0,
  },
  {
    id: 'wb',
    label: 'Wildberries',
    color: 'purple',
    commissions: {
      electronics: 8,
      clothing: 15,
      food: 10,
      appliances: 10,
      beauty: 12,
      other: 15,
    },
    logistics: { fbs: 50, fbo: 80 },
    storageCostPerDay: 5,
  },
  {
    id: 'ozon',
    label: 'Ozon',
    color: 'blue',
    commissions: {
      electronics: 7,
      clothing: 12,
      food: 8,
      appliances: 8,
      beauty: 10,
      other: 12,
    },
    logistics: { fbs: 60, fbo: 90 },
    storageCostPerDay: 0,
  },
]

// ─── Core calculation (backward-compatible) ──────────────────

export function calcMarketplace(
  sellingPrice: number,
  costPrice: number,
  commissionPercent: number,
  logisticsCost: number,
  packagingCost: number,
  quantity: number
): MarketplaceResult {
  const revenue = sellingPrice * quantity
  const commission = Math.round(revenue * commissionPercent / 100)
  const logistics = logisticsCost * quantity
  const packaging = packagingCost * quantity
  const totalCost = costPrice * quantity
  const totalExpenses = commission + logistics + packaging + totalCost
  const profit = revenue - totalExpenses
  const margin = revenue > 0 ? Math.round(profit / revenue * 100) : 0
  const roi = totalCost > 0 ? Math.round(profit / totalCost * 100) : 0
  return { revenue, commission, logistics, packaging, costPrice: totalCost, totalExpenses, profit, margin, roi }
}

// ─── Platform comparison ─────────────────────────────────────

export function calcPlatformComparison(
  sellingPrice: number,
  costPrice: number,
  packagingCost: number,
  category: CategoryId,
  fulfillment: FulfillmentType,
  storageDays: number
): PlatformComparisonRow[] {
  return PLATFORMS.map(p => {
    const commissionPercent = p.commissions[category]
    const commissionAmount = Math.round(sellingPrice * commissionPercent / 100)
    const logisticsCost = p.logistics[fulfillment]
    const storageCost = p.storageCostPerDay * storageDays
    const totalCostPerUnit = costPrice + commissionAmount + logisticsCost + packagingCost + storageCost
    const profitPerUnit = sellingPrice - totalCostPerUnit
    const margin = sellingPrice > 0 ? Math.round(profitPerUnit / sellingPrice * 100) : 0
    const roi = costPrice > 0 ? Math.round(profitPerUnit / costPrice * 100) : 0
    return {
      platformId: p.id,
      label: p.label,
      color: p.color,
      commissionPercent,
      commissionAmount,
      logisticsCost: logisticsCost + storageCost,
      packagingCost,
      totalCostPerUnit,
      profitPerUnit,
      margin,
      roi,
    }
  })
}

// ─── Units needed for target income ──────────────────────────

export function calcUnitsForTarget(
  targetIncome: number,
  profitPerUnit: number
): number {
  if (profitPerUnit <= 0) return -1 // impossible
  return Math.ceil(targetIncome / profitPerUnit)
}

// ─── Break-even price ────────────────────────────────────────

export function calcBreakEvenPrice(
  costPrice: number,
  commissionPercent: number,
  logisticsCost: number,
  packagingCost: number
): number {
  // price - price * commission% - logistics - packaging - cost = 0
  // price * (1 - commission%) = cost + logistics + packaging
  // price = (cost + logistics + packaging) / (1 - commission%)
  const factor = 1 - commissionPercent / 100
  if (factor <= 0) return -1
  return Math.ceil((costPrice + logisticsCost + packagingCost) / factor)
}

// ─── Waterfall steps for a single unit ───────────────────────

export function calcWaterfall(
  sellingPrice: number,
  costPrice: number,
  commissionPercent: number,
  logisticsCost: number,
  packagingCost: number
): WaterfallStep[] {
  const commissionAmount = Math.round(sellingPrice * commissionPercent / 100)
  const profit = sellingPrice - commissionAmount - logisticsCost - packagingCost - costPrice
  return [
    { labelKz: 'Сату бағасы', labelRu: 'Цена продажи', value: sellingPrice, type: 'income' },
    { labelKz: 'Комиссия', labelRu: 'Комиссия', value: commissionAmount, type: 'expense' },
    { labelKz: 'Логистика', labelRu: 'Логистика', value: logisticsCost, type: 'expense' },
    { labelKz: 'Қаптама', labelRu: 'Упаковка', value: packagingCost, type: 'expense' },
    { labelKz: 'Өзіндік құн', labelRu: 'Себестоимость', value: costPrice, type: 'expense' },
    { labelKz: 'ПАЙДА', labelRu: 'ПРИБЫЛЬ', value: profit, type: 'profit' },
  ]
}
