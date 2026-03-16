export interface TelecomPlan {
  operator: string
  plan: string
  price: number
  gb: number       // -1 = безлимит
  min: number      // -1 = безлимит
  sms: number
  social: boolean  // соцсети безлимит
  roaming?: string // роуминг инфо
  tier: 'budget' | 'mid' | 'prem'
}

export interface ConvergentPlan {
  operator: string
  name: string
  price: number
  mobile: { gb: number; min: number }
  internet: { speed: number }
  tv?: { channels: number }
  features: string[]
}

export const TELECOM_DATA: TelecomPlan[] = [
  // ── Kcell ──
  { operator: 'Kcell', plan: 'Kcell Start', price: 3490, gb: 15, min: 200, sms: 50, social: false, tier: 'budget' },
  { operator: 'Kcell', plan: 'Kcell Optimal', price: 5990, gb: 30, min: -1, sms: 100, social: true, tier: 'mid' },
  { operator: 'Kcell', plan: 'Kcell Unlimited', price: 8990, gb: -1, min: -1, sms: 200, social: true, roaming: 'СНГ 500₸/күн', tier: 'prem' },

  // ── Beeline ──
  { operator: 'Beeline', plan: 'Beeline Старт', price: 2990, gb: 12, min: 150, sms: 30, social: false, tier: 'budget' },
  { operator: 'Beeline', plan: 'Beeline Актив', price: 5490, gb: 25, min: -1, sms: 100, social: true, tier: 'mid' },
  { operator: 'Beeline', plan: 'Beeline Безлімит', price: 8490, gb: -1, min: -1, sms: 200, social: true, roaming: 'СНГ 490₸/күн', tier: 'prem' },

  // ── Tele2 / Altel ──
  { operator: 'IZI', plan: 'IZI Ultra', price: 2690, gb: 30, min: 100, sms: 0, social: false, tier: 'budget' },
  { operator: 'Altel', plan: 'Подключай 15', price: 4990, gb: 15, min: 300, sms: 50, social: true, tier: 'mid' },
  { operator: 'Altel', plan: 'Арнау', price: 8690, gb: -1, min: -1, sms: 100, social: true, roaming: 'СНГ 450₸/күн', tier: 'prem' },
  { operator: 'Tele2', plan: 'Tele2 Calls', price: 2390, gb: 5, min: 200, sms: 0, social: false, tier: 'budget' },

  // ── Activ ──
  { operator: 'Activ', plan: 'Activ Start', price: 2490, gb: 10, min: 100, sms: 20, social: false, tier: 'budget' },
  { operator: 'Activ', plan: 'Activ Optimal', price: 4990, gb: 20, min: -1, sms: 100, social: true, tier: 'mid' },
]

export const CONVERGENT_DATA: ConvergentPlan[] = [
  {
    operator: 'Kcell',
    name: 'Kcell + iD Net Family',
    price: 11990,
    mobile: { gb: -1, min: -1 },
    internet: { speed: 100 },
    tv: { channels: 140 },
    features: ['Безлімит мобильный', '100 Мбит/с', '140 ТВ-арна', 'YouTube безлімит'],
  },
  {
    operator: 'Beeline',
    name: 'Beeline Комбо',
    price: 9990,
    mobile: { gb: -1, min: -1 },
    internet: { speed: 50 },
    tv: { channels: 80 },
    features: ['Безлімит мобильный', '50 Мбит/с', '80 ТВ-арна'],
  },
  {
    operator: 'Beeline',
    name: 'Beeline Комбо Макс',
    price: 14990,
    mobile: { gb: -1, min: -1 },
    internet: { speed: 200 },
    tv: { channels: 200 },
    features: ['Безлімит мобильный', '200 Мбит/с', '200 ТВ-арна', 'Spotify безлімит', 'YouTube безлімит'],
  },
  {
    operator: 'Altel',
    name: 'Altel Smart Home',
    price: 8990,
    mobile: { gb: 30, min: -1 },
    internet: { speed: 50 },
    features: ['30 ГБ мобильный', '50 Мбит/с', 'Соцсети безлімит'],
  },
  {
    operator: 'Tele2',
    name: 'iD Combo',
    price: 7990,
    mobile: { gb: 20, min: 300 },
    internet: { speed: 100 },
    features: ['20 ГБ мобильный', '300 мин', '100 Мбит/с'],
  },
]

export const OP_COLORS: Record<string, string> = {
  IZI: '#FF6B00',
  Tele2: '#1F2340',
  Altel: '#ED1C24',
  Activ: '#00A550',
  Kcell: '#660099',
  Beeline: '#FFCC00',
}

export const OP_TEXT_LIGHT: Record<string, boolean> = {
  Beeline: true,
}
