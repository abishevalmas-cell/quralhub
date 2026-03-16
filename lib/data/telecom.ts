export interface TelecomPlan {
  operator: string
  plan: string
  price: number
  gb: number
  min: number
  sms: number
  tier: 'budget' | 'mid' | 'prem'
}

export const TELECOM_DATA: TelecomPlan[] = [
  { operator: 'IZI', plan: 'Ultra', price: 2690, gb: 30, min: 100, sms: 0, tier: 'budget' },
  { operator: 'Tele2', plan: 'Calls', price: 2390, gb: 0, min: 100, sms: 0, tier: 'budget' },
  { operator: 'IZI', plan: 'Max', price: 3390, gb: 50, min: 150, sms: 0, tier: 'budget' },
  { operator: 'Activ', plan: 'Лучше', price: 5590, gb: 40, min: 200, sms: 0, tier: 'mid' },
  { operator: 'Kcell', plan: 'HIT', price: 5999, gb: 25, min: 300, sms: 50, tier: 'mid' },
  { operator: 'Beeline', plan: 'Яркий', price: 6490, gb: 35, min: 250, sms: 0, tier: 'mid' },
  { operator: 'Altel', plan: 'Арнау', price: 8690, gb: -1, min: 0, sms: 0, tier: 'prem' },
  { operator: 'Tele2', plan: 'Unlim', price: 9192, gb: -1, min: 350, sms: 0, tier: 'prem' },
  { operator: 'Beeline', plan: 'Безлімит', price: 9990, gb: -1, min: 500, sms: 100, tier: 'prem' },
  { operator: 'Kcell', plan: 'MAX', price: 10990, gb: -1, min: 500, sms: 100, tier: 'prem' },
  { operator: 'Activ', plan: 'Безлімит', price: 11990, gb: -1, min: 500, sms: 0, tier: 'prem' },
  { operator: 'Tele2', plan: 'Premium', price: 14990, gb: -1, min: 1000, sms: 500, tier: 'prem' },
]

export const OP_COLORS: Record<string, string> = {
  IZI: '#FF6B00', Tele2: '#1F2340', Altel: '#ED1C24', Activ: '#00A550',
  Kcell: '#660099', Beeline: '#FFCC00',
}
