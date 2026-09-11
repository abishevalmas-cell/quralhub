import type { CollageItem } from './types'
import { ITEM_MIN_SIZE } from './types'

export interface Point { x: number; y: number }

export type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw'

/** Fixed (anchor) corner for each handle, expressed as 0/1 ratios of the box */
const ANCHOR: Record<ResizeHandle, { fx: 0 | 1; fy: 0 | 1 }> = {
  nw: { fx: 1, fy: 1 },
  ne: { fx: 0, fy: 1 },
  se: { fx: 0, fy: 0 },
  sw: { fx: 1, fy: 0 },
}

export function centerOf(item: CollageItem): Point {
  return { x: item.x + item.w / 2, y: item.y + item.h / 2 }
}

/** Local box coordinates (0..w, 0..h) → sheet coordinates */
export function localToSheet(item: CollageItem, lx: number, ly: number): Point {
  const rad = (item.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = lx - item.w / 2
  const dy = ly - item.h / 2
  const c = centerOf(item)
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos }
}

/** Sheet coordinates → local box coordinates (0..w, 0..h) */
export function sheetToLocal(item: CollageItem, px: number, py: number): Point {
  const rad = (-item.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const c = centerOf(item)
  const dx = px - c.x
  const dy = py - c.y
  return { x: dx * cos - dy * sin + item.w / 2, y: dx * sin + dy * cos + item.h / 2 }
}

/** Axis-aligned bounding box of the rotated item, in sheet coordinates */
export function boundsOf(item: CollageItem) {
  const corners = [
    localToSheet(item, 0, 0),
    localToSheet(item, item.w, 0),
    localToSheet(item, item.w, item.h),
    localToSheet(item, 0, item.h),
  ]
  const xs = corners.map(p => p.x)
  const ys = corners.map(p => p.y)
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  return { left, top, right, bottom, w: right - left, h: bottom - top }
}

/**
 * Resize an item by dragging one of its corner handles.
 * The opposite corner stays pinned in place, which is what every
 * graphics editor does and what makes rotated boxes feel right.
 */
export function resizeByHandle(
  item: CollageItem,
  handle: ResizeHandle,
  pointer: Point,
  keepAspect: boolean,
): Pick<CollageItem, 'x' | 'y' | 'w' | 'h'> {
  const { fx, fy } = ANCHOR[handle]
  const anchor = localToSheet(item, fx * item.w, fy * item.h)
  const local = sheetToLocal(item, pointer.x, pointer.y)

  let w = fx === 0 ? local.x : item.w - local.x
  let h = fy === 0 ? local.y : item.h - local.y

  if (keepAspect) {
    const s = Math.max((w / item.w + h / item.h) / 2, ITEM_MIN_SIZE / Math.max(item.w, item.h))
    w = item.w * s
    h = item.h * s
  }

  w = Math.max(ITEM_MIN_SIZE, w)
  h = Math.max(ITEM_MIN_SIZE, h)

  // Put the centre where it has to be so the anchor corner does not move
  const rad = (item.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const ox = (0.5 - fx) * w
  const oy = (0.5 - fy) * h
  const cx = anchor.x + ox * cos - oy * sin
  const cy = anchor.y + ox * sin + oy * cos

  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

export function angleBetween(center: Point, p: Point): number {
  return (Math.atan2(p.y - center.y, p.x - center.x) * 180) / Math.PI
}

/** Hit test in sheet coordinates, respecting rotation */
export function hitTest(item: CollageItem, p: Point): boolean {
  const l = sheetToLocal(item, p.x, p.y)
  return l.x >= 0 && l.x <= item.w && l.y >= 0 && l.y <= item.h
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}
