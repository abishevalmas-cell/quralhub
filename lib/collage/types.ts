/** MyTerior collage editor — data model */

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
  /** Threshold used for the cached cutout */
  bgThreshold: number

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
