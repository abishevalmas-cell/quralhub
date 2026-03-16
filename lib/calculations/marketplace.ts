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
