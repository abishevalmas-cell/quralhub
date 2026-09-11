/**
 * Auto-collage. Every mode returns new transforms for the given items;
 * nothing else about the item is touched, so the result stays editable.
 */
import type { CollageItem, LayoutMode, LayoutOptions, Sheet } from './types'

type Box = Pick<CollageItem, 'x' | 'y' | 'w' | 'h' | 'rotation'>

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  keepScale: true,
  density: 0.45,
  gap: 28,
}

/** Relative real-world size of an object; falls back to its pixel size */
function measure(item: CollageItem, keepScale: boolean): number {
  if (!keepScale) return 1
  if (item.realWidthCm && item.realWidthCm > 0) return item.realWidthCm
  return Math.max(item.naturalW, 1)
}

function aspect(item: CollageItem): number {
  const w = item.naturalW || item.w || 1
  const h = item.naturalH || item.h || 1
  return w / h
}

function padding(sheet: Sheet): number {
  return Math.round(Math.min(sheet.w, sheet.h) * 0.06)
}

/**
 * Pick a width for every object so their combined area covers `density`
 * of the sheet while relative proportions are preserved.
 */
function scaleWidths(items: CollageItem[], area: number, opts: LayoutOptions, availW: number): number[] {
  const m = items.map(i => measure(i, opts.keepScale))
  const a = items.map(aspect)
  const areaSum = items.reduce((sum, _, i) => sum + (m[i] * m[i]) / a[i], 0)
  const k = areaSum > 0 ? Math.sqrt((area * opts.density) / areaSum) : 1
  return items.map((_, i) => Math.max(availW * 0.05, Math.min(availW * 0.85, m[i] * k)))
}

/** Rows of objects standing on a common baseline — reads like a furniture line-up */
function shelfLayout(items: CollageItem[], sheet: Sheet, opts: LayoutOptions): Box[] {
  const pad = padding(sheet)
  const availW = sheet.w - pad * 2
  const availH = sheet.h - pad * 2
  const widths = scaleWidths(items, availW * availH, opts, availW)
  const heights = items.map((it, i) => widths[i] / aspect(it))

  // Greedy row packing
  const rows: number[][] = []
  let row: number[] = []
  let rowW = 0
  items.forEach((_, i) => {
    const next = rowW + widths[i] + (row.length ? opts.gap : 0)
    if (row.length && next > availW) {
      rows.push(row)
      row = [i]
      rowW = widths[i]
    } else {
      row.push(i)
      rowW = next
    }
  })
  if (row.length) rows.push(row)

  // Fit rows to the sheet width, then the whole stack to its height
  const rowScale = rows.map(r => {
    const total = r.reduce((s, i) => s + widths[i], 0) + opts.gap * (r.length - 1)
    return total > availW ? (availW - opts.gap * (r.length - 1)) / (total - opts.gap * (r.length - 1)) : 1
  })
  const rowHeights = rows.map((r, ri) => Math.max(...r.map(i => heights[i] * rowScale[ri])))
  const stackH = rowHeights.reduce((s, h) => s + h, 0) + opts.gap * (rows.length - 1)
  const fit = stackH > availH ? availH / stackH : 1

  const boxes: Box[] = new Array(items.length)
  let y = pad + (availH - stackH * fit) / 2

  rows.forEach((r, ri) => {
    const s = rowScale[ri] * fit
    const rowW2 = r.reduce((sum, i) => sum + widths[i] * s, 0) + opts.gap * fit * (r.length - 1)
    let x = pad + (availW - rowW2) / 2
    const baseline = y + rowHeights[ri] * fit
    r.forEach(i => {
      const w = widths[i] * s
      const h = heights[i] * s
      boxes[i] = { x, y: baseline - h, w, h, rotation: 0 }
      x += w + opts.gap * fit
    })
    y = baseline + opts.gap * fit
  })

  return boxes
}

/** Even grid — every object gets the same cell, fitted inside it */
function gridLayout(items: CollageItem[], sheet: Sheet, opts: LayoutOptions): Box[] {
  const pad = padding(sheet)
  const availW = sheet.w - pad * 2
  const availH = sheet.h - pad * 2
  const n = items.length
  const cols = Math.max(1, Math.min(n, Math.round(Math.sqrt((n * availW) / availH)) || 1))
  const rows = Math.ceil(n / cols)
  const cellW = availW / cols
  const cellH = availH / rows
  const innerW = cellW - opts.gap
  const innerH = cellH - opts.gap

  return items.map((item, i) => {
    const col = i % cols
    const rowIdx = Math.floor(i / cols)
    const ar = aspect(item)
    let w = innerW
    let h = w / ar
    if (h > innerH) {
      h = innerH
      w = h * ar
    }
    return {
      x: pad + col * cellW + (cellW - w) / 2,
      y: pad + rowIdx * cellH + (cellH - h) / 2,
      w,
      h,
      rotation: 0,
    }
  })
}

/** One hero object on the left, the rest in a neat column grid on the right */
function heroLayout(items: CollageItem[], sheet: Sheet, opts: LayoutOptions): Box[] {
  if (items.length === 1) return gridLayout(items, sheet, opts)

  const pad = padding(sheet)
  const availW = sheet.w - pad * 2
  const availH = sheet.h - pad * 2

  // Biggest real-world object becomes the hero
  let heroIdx = 0
  let best = -1
  items.forEach((it, i) => {
    const m = measure(it, true)
    if (m > best) {
      best = m
      heroIdx = i
    }
  })

  const heroW = availW * 0.52 - opts.gap / 2
  const restX = pad + availW * 0.52 + opts.gap / 2
  const restW = availW * 0.48 - opts.gap / 2

  const boxes: Box[] = new Array(items.length)

  const hero = items[heroIdx]
  const heroAr = aspect(hero)
  let hw = heroW
  let hh = hw / heroAr
  if (hh > availH) {
    hh = availH
    hw = hh * heroAr
  }
  boxes[heroIdx] = { x: pad + (heroW - hw) / 2, y: pad + (availH - hh) / 2, w: hw, h: hh, rotation: 0 }

  const rest = items.map((_, i) => i).filter(i => i !== heroIdx)
  const cols = rest.length <= 3 ? 1 : 2
  const rows = Math.ceil(rest.length / cols)
  const cellW = restW / cols
  const cellH = availH / rows

  rest.forEach((idx, k) => {
    const col = k % cols
    const rowIdx = Math.floor(k / cols)
    const ar = aspect(items[idx])
    let w = cellW - opts.gap
    let h = w / ar
    if (h > cellH - opts.gap) {
      h = cellH - opts.gap
      w = h * ar
    }
    boxes[idx] = {
      x: restX + col * cellW + (cellW - w) / 2,
      y: pad + rowIdx * cellH + (cellH - h) / 2,
      w,
      h,
      rotation: 0,
    }
  })

  return boxes
}

/** Loose art-directed placement — proportional sizes, light rotation, no overlaps */
function scatterLayout(items: CollageItem[], sheet: Sheet, opts: LayoutOptions): Box[] {
  const pad = padding(sheet)
  const availW = sheet.w - pad * 2
  const availH = sheet.h - pad * 2
  const widths = scaleWidths(items, availW * availH, { ...opts, density: opts.density * 0.85 }, availW)

  const placed: Box[] = []
  const order = items.map((_, i) => i).sort((a, b) => widths[b] - widths[a])
  const boxes: Box[] = new Array(items.length)

  order.forEach(i => {
    const w = Math.min(widths[i], availW * 0.6)
    const h = Math.min(w / aspect(items[i]), availH * 0.8)
    let box: Box | null = null

    for (let attempt = 0; attempt < 220; attempt++) {
      const slack = attempt / 220
      const x = pad + Math.random() * Math.max(1, availW - w)
      const y = pad + Math.random() * Math.max(1, availH - h)
      const candidate: Box = { x, y, w, h, rotation: 0 }
      const margin = opts.gap * (1 - slack)
      const clash = placed.some(p => overlaps(p, candidate, margin))
      if (!clash) {
        box = candidate
        break
      }
    }

    const fallback: Box = {
      x: pad + Math.random() * Math.max(1, availW - w),
      y: pad + Math.random() * Math.max(1, availH - h),
      w,
      h,
      rotation: 0,
    }
    const final = box ?? fallback
    final.rotation = Math.round((Math.random() * 6 - 3) * 10) / 10
    placed.push(final)
    boxes[i] = final
  })

  return boxes
}

function overlaps(a: Box, b: Box, margin: number): boolean {
  return !(
    a.x + a.w + margin <= b.x ||
    b.x + b.w + margin <= a.x ||
    a.y + a.h + margin <= b.y ||
    b.y + b.h + margin <= a.y
  )
}

/**
 * Arrange the given items on the sheet.
 * Items are sorted biggest-first so the composition reads top-left to bottom-right.
 */
export function autoLayout(
  items: CollageItem[],
  sheet: Sheet,
  mode: LayoutMode,
  options: LayoutOptions = DEFAULT_LAYOUT_OPTIONS,
): CollageItem[] {
  if (items.length === 0) return items

  const order = items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => measure(b.item, options.keepScale) - measure(a.item, options.keepScale))
  const sorted = order.map(o => o.item)

  let boxes: Box[]
  switch (mode) {
    case 'grid':
      boxes = gridLayout(sorted, sheet, options)
      break
    case 'hero':
      boxes = heroLayout(sorted, sheet, options)
      break
    case 'scatter':
      boxes = scatterLayout(sorted, sheet, options)
      break
    case 'shelf':
    default:
      boxes = shelfLayout(sorted, sheet, options)
      break
  }

  const result = items.slice()
  order.forEach((o, k) => {
    const box = boxes[k]
    if (!box) return
    result[o.i] = { ...o.item, ...box }
  })
  return result
}
