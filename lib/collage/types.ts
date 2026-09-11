/** MyTerior collage editor — data model */
import type { CutoutMethod } from './autoCutout'

export type ItemKind = 'image' | 'text'

export interface CollageItem {
  id: string
  kind: ItemKind
  name: string

  /** Currently rendered source (background-removed or original) */
  src: string
  /** Untouched source, so background removal can be toggled/redone */
  originalSrc: string
  /** Background-free version cached after processing */
  cutoutSrc?: string
  bgRemoved: boolean
  /** How the background was detected for the cached cutout */
  cutoutMethod: CutoutMethod
  /** 0..100 — colour tolerance used when detecting the background */
  tolerance: number
  /** Drop blobs that are not part of the main object */
  keepMain: boolean

  naturalW: number
  naturalH: number

  /** Text item payload */
  text?: string
  fontSize?: number
  fontWeight?: number
  color?: string
  align?: 'left' | 'center' | 'right'

  /** Transform — sheet coordinates in px, x/y is the unrotated top-left corner */
  x: number
  y: number
  w: number
  h: number
  /** Degrees, clockwise, around the box centre */
  rotation: number
  opacity: number
  flipX: boolean
  shadow: boolean
  locked: boolean
  visible: boolean

  /** Real-world width in cm — used by auto-layout to keep objects in scale */
  realWidthCm?: number
}

export interface Sheet {
  w: number
  h: number
  /** CSS colour, or 'transparent' */
  background: string
  backgroundImage?: string
  /** 'cover' | 'contain' */
  backgroundFit: 'cover' | 'contain'
  showGrid: boolean
}

export interface CollageDoc {
  sheet: Sheet
  /** Painting order — index 0 is the bottom layer */
  items: CollageItem[]
}

export type LayoutMode = 'shelf' | 'grid' | 'hero' | 'scatter'

export interface LayoutOptions {
  /** Keep relative sizes of objects (a sofa stays bigger than a lamp) */
  keepScale: boolean
  /** 0..1 — how much of the sheet the objects should cover */
  density: number
  gap: number
}

export const ITEM_MIN_SIZE = 24

/** Fill in anything an older saved project is missing */
export function normalizeItem(raw: Partial<CollageItem> & { bgThreshold?: number }): CollageItem {
  return {
    id: raw.id ?? `it_${Math.random().toString(36).slice(2, 9)}`,
    kind: raw.kind ?? 'image',
    name: raw.name ?? '',
    src: raw.src ?? '',
    originalSrc: raw.originalSrc ?? raw.src ?? '',
    cutoutSrc: raw.cutoutSrc,
    bgRemoved: raw.bgRemoved ?? false,
    cutoutMethod: raw.cutoutMethod ?? (raw.bgRemoved ? 'threshold' : 'none'),
    tolerance: raw.tolerance ?? 32,
    keepMain: raw.keepMain ?? true,
    naturalW: raw.naturalW ?? raw.w ?? 100,
    naturalH: raw.naturalH ?? raw.h ?? 100,
    text: raw.text,
    fontSize: raw.fontSize,
    fontWeight: raw.fontWeight,
    color: raw.color,
    align: raw.align,
    x: raw.x ?? 0,
    y: raw.y ?? 0,
    w: raw.w ?? 100,
    h: raw.h ?? 100,
    rotation: raw.rotation ?? 0,
    opacity: raw.opacity ?? 1,
    flipX: raw.flipX ?? false,
    shadow: raw.shadow ?? false,
    locked: raw.locked ?? false,
    visible: raw.visible ?? true,
    realWidthCm: raw.realWidthCm,
  }
}

export function normalizeDoc(raw: { sheet?: Partial<Sheet>; items?: unknown[] }): CollageDoc {
  return {
    sheet: {
      w: raw.sheet?.w ?? 1754,
      h: raw.sheet?.h ?? 1240,
      background: raw.sheet?.background ?? '#F7F5F2',
      backgroundImage: raw.sheet?.backgroundImage,
      backgroundFit: raw.sheet?.backgroundFit ?? 'cover',
      showGrid: raw.sheet?.showGrid ?? false,
    },
    items: (raw.items ?? []).map(i => normalizeItem(i as Partial<CollageItem>)),
  }
}
