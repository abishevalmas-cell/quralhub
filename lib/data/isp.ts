export interface ISPPlan {
  name: string
  speed: number
  price: number
  tv: number
  tier: 'budget' | 'mid' | 'premium'
}

export interface ISPProvider {
  name: string
  color: string
  textColor: string
  plans: ISPPlan[]
}

export const ISP_DATA: ISPProvider[] = [
  { name: 'Beeline', color: '#FFCC00', textColor: '#000', plans: [
    { name: 'Хит 100', speed: 100, price: 4490, tv: 0, tier: 'budget' },
    { name: 'Хит 300', speed: 300, price: 5990, tv: 80, tier: 'mid' },
    { name: 'Хит 500', speed: 500, price: 7490, tv: 150, tier: 'premium' },
    { name: 'Хит 1000', speed: 1000, price: 9990, tv: 200, tier: 'premium' },
  ]},
  { name: 'Kazakhtelecom', color: '#003DA5', textColor: '#fff', plans: [
    { name: 'iD Net 60', speed: 60, price: 2990, tv: 0, tier: 'budget' },
    { name: 'iD Net 100', speed: 100, price: 3990, tv: 0, tier: 'budget' },
    { name: 'iD Net 300', speed: 300, price: 5490, tv: 100, tier: 'mid' },
    { name: 'iD TV+Net 500', speed: 500, price: 7990, tv: 200, tier: 'premium' },
    { name: 'iD Net 1000', speed: 1000, price: 9490, tv: 250, tier: 'premium' },
  ]},
  { name: 'Tele2 Home', color: '#1F2340', textColor: '#fff', plans: [
    { name: 'Базовый', speed: 100, price: 3790, tv: 0, tier: 'budget' },
    { name: 'Оптимальный', speed: 200, price: 4990, tv: 60, tier: 'mid' },
    { name: 'Максимальный', speed: 500, price: 6990, tv: 120, tier: 'mid' },
  ]},
  { name: 'Alma TV', color: '#E31837', textColor: '#fff', plans: [
    { name: 'Старт', speed: 50, price: 3290, tv: 90, tier: 'budget' },
    { name: 'Оптимал', speed: 100, price: 4790, tv: 180, tier: 'mid' },
    { name: 'Премиум', speed: 300, price: 7290, tv: 250, tier: 'premium' },
  ]},
  { name: 'Kcell Home', color: '#660099', textColor: '#fff', plans: [
    { name: 'Home 100', speed: 100, price: 4290, tv: 0, tier: 'budget' },
    { name: 'Home 300', speed: 300, price: 5990, tv: 0, tier: 'mid' },
    { name: 'Home 500', speed: 500, price: 6990, tv: 0, tier: 'mid' },
  ]},
  { name: 'iDNet', color: '#00A859', textColor: '#fff', plans: [
    { name: 'Базовый', speed: 100, price: 3490, tv: 0, tier: 'budget' },
    { name: 'Стандарт', speed: 300, price: 5290, tv: 80, tier: 'mid' },
    { name: 'Максимум', speed: 1000, price: 8990, tv: 200, tier: 'premium' },
  ]},
]
