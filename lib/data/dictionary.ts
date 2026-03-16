/**
 * Offline translation dictionary for KK ↔ RU ↔ EN
 * Base dictionary — extended with dict.json on mount
 */

export type LangPair = 'kk-ru' | 'kk-en' | 'ru-kk' | 'ru-en' | 'en-kk' | 'en-ru'

export const TR_DICT: Record<string, Record<string, string>> = {
  'kk-ru': {
    'сәлем': 'привет', 'рақмет': 'спасибо', 'кешіріңіз': 'извините',
    'қайырлы таң': 'доброе утро', 'қайырлы кеш': 'добрый вечер',
    'қалайсыз': 'как дела', 'жақсы': 'хорошо', 'иә': 'да', 'жоқ': 'нет',
    'мен': 'я', 'сен': 'ты', 'сіз': 'вы', 'бұл': 'это', 'не': 'что',
    'кім': 'кто', 'қайда': 'где', 'қашан': 'когда', 'қалай': 'как',
    'неге': 'почему', 'бар': 'есть', 'бүгін': 'сегодня', 'ертең': 'завтра',
    'кеше': 'вчера', 'үй': 'дом', 'жұмыс': 'работа', 'су': 'вода',
    'нан': 'хлеб', 'ақша': 'деньги', 'бала': 'ребёнок', 'ана': 'мать',
    'әке': 'отец', 'дос': 'друг', 'кітап': 'книга', 'мектеп': 'школа',
    'уақыт': 'время', 'жер': 'земля', 'ел': 'страна', 'қала': 'город',
    'көше': 'улица', 'дүкен': 'магазин', 'дәрігер': 'врач',
    'аурухана': 'больница', 'дәріхана': 'аптека', 'жалақы': 'зарплата',
    'салық': 'налог', 'банк': 'банк', 'несие': 'кредит', 'пайыз': 'процент',
  },
  'kk-en': {
    'сәлем': 'hello', 'рақмет': 'thank you', 'кешіріңіз': 'excuse me',
    'қайырлы таң': 'good morning', 'жақсы': 'good', 'иә': 'yes', 'жоқ': 'no',
    'мен': 'I', 'сен': 'you', 'бұл': 'this', 'не': 'what', 'кім': 'who',
    'қайда': 'where', 'қашан': 'when', 'қалай': 'how', 'неге': 'why',
    'бар': 'there is', 'бүгін': 'today', 'ертең': 'tomorrow', 'кеше': 'yesterday',
    'үй': 'house', 'жұмыс': 'work', 'су': 'water', 'нан': 'bread',
    'ақша': 'money', 'бала': 'child', 'ана': 'mother', 'әке': 'father',
    'дос': 'friend', 'кітап': 'book', 'мектеп': 'school', 'уақыт': 'time',
    'жер': 'land', 'ел': 'country', 'қала': 'city', 'банк': 'bank',
  },
  'ru-kk': {
    'привет': 'сәлем', 'спасибо': 'рақмет', 'извините': 'кешіріңіз',
    'доброе утро': 'қайырлы таң', 'добрый вечер': 'қайырлы кеш',
    'как дела': 'қалайсыз', 'хорошо': 'жақсы', 'да': 'иә', 'нет': 'жоқ',
    'я': 'мен', 'ты': 'сен', 'вы': 'сіз', 'это': 'бұл', 'что': 'не',
    'кто': 'кім', 'где': 'қайда', 'когда': 'қашан', 'как': 'қалай',
    'почему': 'неге', 'есть': 'бар', 'сегодня': 'бүгін', 'завтра': 'ертең',
    'вчера': 'кеше', 'дом': 'үй', 'работа': 'жұмыс', 'вода': 'су',
    'хлеб': 'нан', 'деньги': 'ақша', 'ребёнок': 'бала', 'мать': 'ана',
    'отец': 'әке', 'друг': 'дос', 'книга': 'кітап', 'школа': 'мектеп',
    'время': 'уақыт', 'земля': 'жер', 'страна': 'ел', 'город': 'қала',
    'улица': 'көше', 'магазин': 'дүкен', 'врач': 'дәрігер',
    'больница': 'аурухана', 'аптека': 'дәріхана', 'зарплата': 'жалақы',
    'налог': 'салық', 'банк': 'банк', 'кредит': 'несие', 'процент': 'пайыз',
  },
  'ru-en': {
    'привет': 'hello', 'спасибо': 'thank you', 'да': 'yes', 'нет': 'no',
    'хорошо': 'good', 'дом': 'house', 'работа': 'work', 'деньги': 'money',
    'время': 'time', 'город': 'city', 'банк': 'bank',
  },
  'en-kk': {
    'hello': 'сәлем', 'thank you': 'рақмет', 'good morning': 'қайырлы таң',
    'good': 'жақсы', 'yes': 'иә', 'no': 'жоқ', 'I': 'мен', 'you': 'сен',
    'this': 'бұл', 'what': 'не', 'who': 'кім', 'where': 'қайда',
    'when': 'қашан', 'how': 'қалай', 'why': 'неге', 'today': 'бүгін',
    'tomorrow': 'ертең', 'yesterday': 'кеше', 'house': 'үй', 'work': 'жұмыс',
    'water': 'су', 'bread': 'нан', 'money': 'ақша', 'child': 'бала',
    'mother': 'ана', 'father': 'әке', 'friend': 'дос', 'book': 'кітап',
    'school': 'мектеп', 'time': 'уақыт', 'city': 'қала', 'bank': 'банк',
  },
  'en-ru': {
    'hello': 'привет', 'thank you': 'спасибо', 'yes': 'да', 'no': 'нет',
    'good': 'хорошо', 'house': 'дом', 'work': 'работа', 'money': 'деньги',
    'time': 'время', 'city': 'город', 'bank': 'банк',
  },
}

/**
 * Merge extended dictionary entries (from dict.json) into TR_DICT
 */
export function mergeDictEntries(extDict: Record<string, Record<string, string>>) {
  for (const pair of Object.keys(extDict)) {
    if (pair === 'updatedAt' || pair === 'source' || pair === 'wordCount') continue
    if (!TR_DICT[pair]) TR_DICT[pair] = {}
    Object.assign(TR_DICT[pair], extDict[pair])
  }
}

/**
 * Offline dictionary translation.
 * Tries full phrase match first, then word-by-word.
 */
export function translateOffline(input: string, from: string, to: string): string | null {
  const key = `${from}-${to}`
  const dict = TR_DICT[key]
  if (!dict) return null

  const lower = input.toLowerCase()

  // Full phrase match
  if (dict[lower]) return dict[lower]

  // Word-by-word
  const words = input.split(/(\s+)/)
  const translated = words.map(w => {
    const lw = w.toLowerCase().trim()
    if (!lw) return w
    return dict[lw] || w
  }).join('')

  // If nothing changed, return null (no offline match)
  if (translated === input) return null
  return translated
}

/**
 * Check if the input is a single word (for sozdik.kz link)
 */
export function isSingleWord(text: string): boolean {
  return text.trim().split(/\s+/).length === 1 && text.trim().length > 0
}

// --- Translation cache (localStorage) ---
const TR_CACHE_KEY = 'quralhub-tr-cache'
const TR_CACHE_MAX = 500

let trCache: Record<string, string> = {}

export function loadTrCache(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    trCache = JSON.parse(localStorage.getItem(TR_CACHE_KEY) || '{}')
  } catch {
    trCache = {}
  }
  return trCache
}

export function getTrCache(key: string): string | undefined {
  return trCache[key]
}

export function saveTrCache(key: string, val: string) {
  const keys = Object.keys(trCache)
  if (keys.length > TR_CACHE_MAX) delete trCache[keys[0]]
  trCache[key] = val
  try {
    localStorage.setItem(TR_CACHE_KEY, JSON.stringify(trCache))
  } catch {
    // localStorage full — ignore
  }
}
