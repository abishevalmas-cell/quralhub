import type { Sheet } from './types'

export interface SheetPreset {
  id: string
  name: [string, string]
  w: number
  h: number
}

export const SHEET_PRESETS: SheetPreset[] = [
  { id: 'a4l', name: ['A4 көлденең', 'A4 альбомный'], w: 1754, h: 1240 },
  { id: 'a4p', name: ['A4 тік', 'A4 книжный'], w: 1240, h: 1754 },
  { id: 'a3l', name: ['A3 көлденең', 'A3 альбомный'], w: 2480, h: 1754 },
  { id: 'square', name: ['Шаршы 1:1', 'Квадрат 1:1'], w: 1400, h: 1400 },
  { id: 'story', name: ['Сторис 9:16', 'Сторис 9:16'], w: 1080, h: 1920 },
  { id: 'wide', name: ['Презентация 16:9', 'Презентация 16:9'], w: 1920, h: 1080 },
]

export const BACKGROUND_SWATCHES = [
  '#FFFFFF', '#F7F5F2', '#EFE9E1', '#E6E2DB',
  '#DCE3E0', '#E7E4EF', '#1C1C1C', 'transparent',
]

export const DEFAULT_SHEET: Sheet = {
  w: 1754,
  h: 1240,
  background: '#F7F5F2',
  backgroundFit: 'cover',
  showGrid: false,
}

export const STORAGE_KEY = 'myterior_collage_doc'

/** Snap tolerance in sheet px (scaled by zoom at call site) */
export const SNAP_TOLERANCE = 6
