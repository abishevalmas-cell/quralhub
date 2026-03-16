export interface CommunalTariff {
  el: number
  cw: number
  hw: number
  gas: number | null
  heat: number
  src: string
}

export const CM_TARIFFS: Record<string, CommunalTariff> = {
  'Алматы': { el: 25.8, cw: 91, hw: 430, gas: 25.5, heat: 87.5, src: 'АлматыЭнергоСбыт, Алматы Су' },
  'Астана': { el: 22.8, cw: 105, hw: 520, gas: null, heat: 109, src: 'Астана-ЭнергоСбыт, Астана Су' },
  'Шымкент': { el: 23.5, cw: 78, hw: 380, gas: 22.0, heat: 75, src: 'Оңтүстік Жарық, ШымкентСу' },
  'Қарағанды': { el: 24.2, cw: 85, hw: 450, gas: 27.0, heat: 95, src: 'КРЭК, Қарағанды Су' },
  'Ақтау': { el: 20.5, cw: 310, hw: 580, gas: null, heat: 110, src: 'МАЭК, ҚазТрансОйл' },
  'Ақтөбе': { el: 23.0, cw: 88, hw: 410, gas: 24.0, heat: 85, src: 'Батыс ЭнергоСбыт' },
  'Павлодар': { el: 19.5, cw: 72, hw: 390, gas: 23.0, heat: 80, src: 'ПЭСК, Павлодар Су' },
  'Семей': { el: 21.0, cw: 80, hw: 400, gas: 24.5, heat: 82, src: 'Семей Энергосбыт' },
}

export interface CommunalResult {
  electricity: number
  coldWater: number
  hotWater: number
  gas: number
  heating: number
  total: number
  source: string
}

export function calcCommunal(city: string, el: number, cw: number, hw: number, gas: number, heat: number): CommunalResult {
  const t = CM_TARIFFS[city] || CM_TARIFFS['Алматы']
  const electricity = Math.round(el * t.el)
  const coldWater = Math.round(cw * t.cw)
  const hotWater = Math.round(hw * t.hw)
  const gasTotal = t.gas !== null ? Math.round(gas * t.gas) : 0
  const heating = Math.round(heat * t.heat)
  return {
    electricity, coldWater, hotWater, gas: gasTotal, heating,
    total: electricity + coldWater + hotWater + gasTotal + heating,
    source: t.src + ' (' + city + ', 2026)'
  }
}
