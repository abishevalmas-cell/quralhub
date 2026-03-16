export interface CommunalTariff {
  el: number
  cw: number
  hw: number
  gas: number | null
  heat: number
  src: string
}

export const CM_TARIFFS: Record<string, CommunalTariff> = {
  // --- 3 города республиканского значения ---
  'Алматы':     { el: 25.8, cw: 91,  hw: 430, gas: 25.5, heat: 87.5, src: 'АлматыЭнергоСбыт, Алматы Су' },
  'Астана':     { el: 22.8, cw: 105, hw: 520, gas: null,  heat: 109,  src: 'Астана-ЭнергоСбыт, Астана Су' },
  'Шымкент':    { el: 23.5, cw: 78,  hw: 380, gas: 22.0, heat: 75,   src: 'Оңтүстік Жарық, ШымкентСу' },
  // --- Карағанды облысы ---
  'Қарағанды':  { el: 24.2, cw: 85,  hw: 450, gas: 27.0, heat: 95,   src: 'КРЭК, Қарағанды Су' },
  'Теміртау':   { el: 23.8, cw: 82,  hw: 440, gas: 26.5, heat: 92,   src: 'АрселорМиттал Энерго, Теміртау Су' },
  'Жезқазған':  { el: 22.5, cw: 90,  hw: 460, gas: 26.0, heat: 98,   src: 'Жезқазғанэнерго, Жезқазған Су' },
  // --- Маңғыстау облысы ---
  'Ақтау':      { el: 20.5, cw: 310, hw: 580, gas: null,  heat: 110,  src: 'МАЭК, ҚазТрансОйл' },
  // --- Ақтөбе облысы ---
  'Ақтөбе':     { el: 23.0, cw: 88,  hw: 410, gas: 24.0, heat: 85,   src: 'Батыс ЭнергоСбыт, Ақтөбе Су' },
  // --- Павлодар облысы ---
  'Павлодар':   { el: 19.5, cw: 72,  hw: 390, gas: 23.0, heat: 80,   src: 'ПЭСК, Павлодар Су' },
  'Екібастұз':  { el: 17.0, cw: 65,  hw: 350, gas: null,  heat: 70,   src: 'Екібастұз ГРЭС, Екібастұз Су' },
  // --- Шығыс Қазақстан облысы ---
  'Семей':      { el: 21.0, cw: 80,  hw: 400, gas: 24.5, heat: 82,   src: 'Семей Энергосбыт, Семей Су' },
  // --- Атырау облысы ---
  'Атырау':     { el: 21.5, cw: 120, hw: 490, gas: 22.5, heat: 105,  src: 'АтырауЭнерго, Атырау Су' },
  // --- Қостанай облысы ---
  'Қостанай':   { el: 22.0, cw: 75,  hw: 400, gas: 25.0, heat: 88,   src: 'ҚостанайЭнерго, Қостанай Су' },
  // --- Жамбыл облысы ---
  'Тараз':      { el: 23.2, cw: 70,  hw: 370, gas: 23.5, heat: 78,   src: 'ЖамбылЭнерго, Тараз Су' },
  // --- Батыс Қазақстан облысы ---
  'Орал':       { el: 22.8, cw: 95,  hw: 420, gas: 23.0, heat: 90,   src: 'БатысЭнерго, Орал Су' },
  // --- Ақмола облысы ---
  'Көкшетау':   { el: 21.8, cw: 78,  hw: 395, gas: null,  heat: 86,   src: 'Көкшетау Энерго, Көкшетау Су' },
  // --- Солтүстік Қазақстан облысы ---
  'Петропавл':  { el: 20.8, cw: 68,  hw: 375, gas: null,  heat: 84,   src: 'СКЭС, Петропавл Су' },
  // --- Қызылорда облысы ---
  'Қызылорда':  { el: 24.0, cw: 100, hw: 460, gas: 23.0, heat: 95,   src: 'Қызылорда Энерго, Қызылорда Су' },
  // --- Түркістан облысы ---
  'Түркістан':  { el: 24.5, cw: 85,  hw: 390, gas: 22.5, heat: 76,   src: 'Түркістан Энерго, Түркістан Су' },
  // --- Алматы облысы ---
  'Талдықорған':{ el: 24.8, cw: 80,  hw: 410, gas: 25.0, heat: 88,   src: 'Жетісу Энерго, Талдықорған Су' },
}

/** Utility keys for iteration */
export const UTILITY_KEYS = ['electricity', 'coldWater', 'hotWater', 'gas', 'heating'] as const
export type UtilityKey = typeof UTILITY_KEYS[number]

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

/** Additional housing services (КСК/ОСИ) — average rates per m² or flat */
export interface ExtraService {
  id: string
  name: string
  nameRu: string
  unit: 'sqm' | 'flat'  // per m² or flat rate per month
  avgRate: number        // average ₸
}

export const EXTRA_SERVICES: ExtraService[] = [
  { id: 'maintenance', name: 'КСК/ОСИ қызметі', nameRu: 'Содержание дома (КСК/ОСИ)', unit: 'sqm', avgRate: 55 },
  { id: 'elevator', name: 'Лифт', nameRu: 'Лифт', unit: 'sqm', avgRate: 15 },
  { id: 'trash', name: 'Қоқыс шығару', nameRu: 'Вывоз мусора', unit: 'flat', avgRate: 650 },
  { id: 'cleaning', name: 'Аулаңды тазалау', nameRu: 'Уборка территории', unit: 'flat', avgRate: 400 },
  { id: 'intercom', name: 'Домофон', nameRu: 'Домофон', unit: 'flat', avgRate: 300 },
  { id: 'antenna', name: 'Антенна/ТВ', nameRu: 'Антенна/ТВ', unit: 'flat', avgRate: 500 },
  { id: 'internet', name: 'Интернет', nameRu: 'Интернет', unit: 'flat', avgRate: 4500 },
]

export function calcExtras(area: number, selectedIds: string[]): { items: { id: string; cost: number }[]; total: number } {
  const items = selectedIds.map(id => {
    const svc = EXTRA_SERVICES.find(s => s.id === id)
    if (!svc) return { id, cost: 0 }
    const cost = svc.unit === 'sqm' ? Math.round(area * svc.avgRate) : svc.avgRate
    return { id, cost }
  })
  return { items, total: items.reduce((s, i) => s + i.cost, 0) }
}

/** Standard monthly consumption for comparison */
export const STD_CONSUMPTION = { el: 200, cw: 5, hw: 3, gas: 30, heat: 60 }

export interface CityComparison {
  city: string
  electricity: number
  coldWater: number
  hotWater: number
  gas: number
  heating: number
  total: number
  mostExpensive: UtilityKey
}

export function calcAllCities(): CityComparison[] {
  const { el, cw, hw, gas, heat } = STD_CONSUMPTION
  return Object.keys(CM_TARIFFS).map(city => {
    const r = calcCommunal(city, el, cw, hw, gas, heat)
    // find which utility costs most
    const parts: { key: UtilityKey; val: number }[] = [
      { key: 'electricity', val: r.electricity },
      { key: 'coldWater', val: r.coldWater },
      { key: 'hotWater', val: r.hotWater },
      { key: 'gas', val: r.gas },
      { key: 'heating', val: r.heating },
    ]
    const mostExpensive = parts.reduce((a, b) => b.val > a.val ? b : a).key
    return { city, ...r, mostExpensive }
  }).sort((a, b) => a.total - b.total)
}
