export const MRP = 4325
export const MZP = 85000
export const F = (n: number) => Math.round(n).toLocaleString('ru-RU')

export const STORAGE_KEYS = {
  THEME: 'quralhub-theme',
  LANG: 'quralhub-lang',
  RECENT: 'quralhub-recent',
  CITY: 'quralhub-city',
  TR_CACHE: 'quralhub-tr-cache',
  FEEDBACK: 'qural-feedback',
} as const
