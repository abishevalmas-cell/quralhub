export interface PlateCategory {
  id: string
  name: string
  nameRu: string
  description: string
  price: number
  mrp: number
  icon: string
  examples: string[]
  note?: string
}

export interface PlateRegion {
  code: string
  region: string
  regionRu: string
}

// Regions by code
export const PLATE_REGIONS: PlateRegion[] = [
  { code: '01', region: 'Астана', regionRu: 'Астана' },
  { code: '02', region: 'Алматы', regionRu: 'Алматы' },
  { code: '03', region: 'Ақмола облысы', regionRu: 'Акмолинская область' },
  { code: '04', region: 'Ақтөбе облысы', regionRu: 'Актюбинская область' },
  { code: '05', region: 'Алматы облысы', regionRu: 'Алматинская область' },
  { code: '06', region: 'Атырау облысы', regionRu: 'Атырауская область' },
  { code: '07', region: 'Батыс Қазақстан облысы', regionRu: 'Западно-Казахстанская область' },
  { code: '08', region: 'Жамбыл облысы', regionRu: 'Жамбылская область' },
  { code: '09', region: 'Қарағанды облысы', regionRu: 'Карагандинская область' },
  { code: '10', region: 'Қостанай облысы', regionRu: 'Костанайская область' },
  { code: '11', region: 'Қызылорда облысы', regionRu: 'Кызылординская область' },
  { code: '12', region: 'Маңғыстау облысы', regionRu: 'Мангистауская область' },
  { code: '13', region: 'Түркістан облысы', regionRu: 'Туркестанская область' },
  { code: '14', region: 'Павлодар облысы', regionRu: 'Павлодарская область' },
  { code: '15', region: 'Солтүстік Қазақстан облысы', regionRu: 'Северо-Казахстанская область' },
  { code: '16', region: 'Шығыс Қазақстан облысы', regionRu: 'Восточно-Казахстанская область' },
  { code: '17', region: 'Шымкент', regionRu: 'Шымкент' },
  { code: '18', region: 'Абай облысы', regionRu: 'Область Абай' },
  { code: '19', region: 'Жетісу облысы', regionRu: 'Область Жетысу' },
  { code: '20', region: 'Ұлытау облысы', regionRu: 'Область Улытау' },
]

// Plate categories with EXACT prices from Egov.kz (2026, 1 АЕК = 4 325₸)
export const PLATE_CATEGORIES: PlateCategory[] = [
  {
    id: 'basic',
    name: 'Қарапайым таңдау',
    nameRu: 'Стандартный выбор',
    description: 'Кез келген әріп-сан комбинациясы',
    price: 43250, // 10 АЕК
    mrp: 10,
    icon: '🚗',
    examples: ['429 BKA 01', '783 DEF 02'],
  },
  {
    id: 'palindrome',
    name: 'Палиндром нөмір',
    nameRu: 'Палиндром',
    description: 'Айналы сандар: 101, 121, 131, 141, 151 т.б.',
    price: 64875, // 15 АЕК
    mrp: 15,
    icon: '🔄',
    examples: ['101 ABC 01', '131 KAZ 02'],
  },
  {
    id: 'round',
    name: 'Дөңгелек нөмір',
    nameRu: 'Круглый номер',
    description: '010, 020, 030, 040, 050, 060, 070, 077, 080, 090, 707',
    price: 246525, // 57 АЕК
    mrp: 57,
    icon: '⭐',
    examples: ['010 ABC 01', '070 KAZ 02'],
  },
  {
    id: 'palindrome-triple-letter',
    name: 'Палиндром + үш әріп',
    nameRu: 'Палиндром + три буквы',
    description: 'Айналы сан + бірдей үш әріп (101 AAA, 121 BBB)',
    price: 311400, // 72 АЕК
    mrp: 72,
    icon: '✨',
    examples: ['101 AAA 01', '121 BBB 02'],
  },
  {
    id: 'round-triple-letter',
    name: 'Дөңгелек + үш әріп',
    nameRu: 'Круглый + три буквы',
    description: 'Дөңгелек сан + бірдей үш әріп (010 AAA, 070 BBB)',
    price: 493050, // 114 АЕК
    mrp: 114,
    icon: '🔥',
    examples: ['010 AAA 01', '070 BBB 02'],
  },
  {
    id: 'sequential',
    name: 'Реттік нөмір',
    nameRu: 'Последовательный номер',
    description: '100, 111, 200, 222, 300, 333, 400, 444, 500, 555, 600, 666, 800, 888, 900, 999',
    price: 592525, // 137 АЕК
    mrp: 137,
    icon: '🎯',
    examples: ['100 ABC 01', '555 KAZ 02'],
  },
  {
    id: 'sequential-triple-letter',
    name: 'Реттік + үш әріп',
    nameRu: 'Последовательный + три буквы',
    description: 'Реттік сан + бірдей үш әріп (111 AAA, 555 BBB)',
    price: 839050, // 194 АЕК
    mrp: 194,
    icon: '👑',
    examples: ['111 AAA 01', '555 BBB 02'],
  },
  {
    id: 'vip',
    name: 'VIP нөмір',
    nameRu: 'VIP номер',
    description: '001–009 және 777 — ерекше нөмірлер',
    price: 986100, // 228 АЕК
    mrp: 228,
    icon: '💎',
    examples: ['007 ABC 01', '777 KAZ 02'],
  },
  {
    id: 'vip-triple-letter',
    name: 'VIP + үш әріп',
    nameRu: 'VIP + три буквы',
    description: '001–009, 777 + бірдей үш әріп (007 AAA, 777 BBB)',
    price: 1232625, // 285 АЕК
    mrp: 285,
    icon: '💎👑',
    examples: ['007 AAA 01', '777 BBB 02'],
  },
]
