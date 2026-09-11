/**
 * Automatic subject extraction.
 *
 * The designer drops in whatever photo they have — a catalogue shot on white,
 * a studio shot on colour or on a gradient, a PNG that is already cut out —
 * and we work out what the background is and keep only the object.
 *
 * How it works, in order:
 *  1. If the file already carries meaningful transparency, trust it.
 *  2. Read the background colours off the image border, then flood-fill
 *     inwards from every border pixel that matches them. The fill walks
 *     through smooth gradients but stops at the object's edge.
 *  3. Drop stray blobs (watermarks, specks) and keep the object.
 *  4. Soften and de-fringe the boundary so no halo of the old background
 *     is left around the object.
 * Everything runs on the client; nothing is uploaded anywhere.
 */

export type CutoutMethod = 'alpha' | 'subject' | 'threshold' | 'none'

export interface CutoutOptions {
  /** 0..100 — how far a colour may drift from the background and still be cut */
  tolerance: number
  /** Keep only the main object and drop unrelated blobs */
  keepMain: boolean
  /** Edge softening in pixels */
  feather: number
}

export const DEFAULT_CUTOUT_OPTIONS: CutoutOptions = {
  tolerance: 32,
  keepMain: true,
  feather: 1,
}

export interface CutoutStats {
  method: CutoutMethod
  /** Share of the image that was turned transparent, 0..1 */
  removedRatio: number
  /** How uniform the border was — low means a busy background, e.g. a room photo */
  confidence: 'high' | 'medium' | 'low'
}

/** Perceptual-ish RGB distance, normalised to roughly 0..255 */
function dist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const rm = (r1 + r2) * 0.5
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  return Math.sqrt(((512 + rm) * dr * dr) / 256 + 4 * dg * dg + ((767 - rm) * db * db) / 256) / 3
}

interface BackgroundRefs {
  refs: number[]
  coverage: number
}

/**
 * Dominant colours along the image border.
 * Quantising to 32 levels per channel groups the noise of a real photo
 * without merging a beige backdrop into a white one.
 */
function borderRefs(data: Uint8ClampedArray, w: number, h: number, tol: number): BackgroundRefs {
  interface Bin { r: number; g: number; b: number; n: number; edges: number }
  const bins = new Map<number, Bin>()
  const thickness = Math.max(1, Math.round(Math.min(w, h) * 0.01))
  let total = 0

  const sample = (x: number, y: number, edge: number) => {
    const i = (y * w + x) * 4
    if (data[i + 3] < 250) return
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
    const bin = bins.get(key)
    if (bin) {
      bin.r += r; bin.g += g; bin.b += b; bin.n++; bin.edges |= 1 << edge
    } else {
      bins.set(key, { r, g, b, n: 1, edges: 1 << edge })
    }
    total++
  }

  for (let t = 0; t < thickness; t++) {
    for (let x = 0; x < w; x++) {
      sample(x, t, 0)
      sample(x, h - 1 - t, 1)
    }
    for (let y = 0; y < h; y++) {
      sample(t, y, 2)
      sample(w - 1 - t, y, 3)
    }
  }

  if (!total) return { refs: [], coverage: 0 }

  const edgeCount = (mask: number) => ((mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1) + ((mask >> 3) & 1))
  const sorted = [...bins.values()].sort((a, b) => b.n - a.n)
  const refs: number[] = []
  let covered = 0

  for (const bin of sorted) {
    if (refs.length >= 6 || covered / total >= 0.85) break
    // The most common border colour is the background by definition. Any other
    // colour has to show up on at least three sides to count — otherwise it is
    // the object itself running off the edge of the frame, which happens a lot
    // with cropped catalogue shots.
    const accept = refs.length === 0 || (edgeCount(bin.edges) >= 3 && bin.n / total >= 0.03)
    if (!accept) continue
    refs.push(bin.r / bin.n, bin.g / bin.n, bin.b / bin.n)
    covered += bin.n
  }

  // Real coverage: border pixels that actually sit near one of the refs
  let near = 0
  const check = (x: number, y: number) => {
    const i = (y * w + x) * 4
    if (data[i + 3] < 250) return
    for (let k = 0; k < refs.length; k += 3) {
      if (dist(data[i], data[i + 1], data[i + 2], refs[k], refs[k + 1], refs[k + 2]) <= tol) {
        near++
        return
      }
    }
  }
  for (let x = 0; x < w; x++) {
    check(x, 0)
    check(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    check(0, y)
    check(w - 1, y)
  }

  return { refs, coverage: near / Math.max(1, 2 * (w + h)) }
}

function nearestRef(refs: number[], r: number, g: number, b: number): { d: number; k: number } {
  let best = Infinity
  let bestK = 0
  for (let k = 0; k < refs.length; k += 3) {
    const d = dist(r, g, b, refs[k], refs[k + 1], refs[k + 2])
    if (d < best) {
      best = d
      bestK = k
    }
  }
  return { d: best, k: bestK }
}

/** Drop foreground blobs that are far smaller than the main object */
function keepMainBlobs(alpha: Uint8Array, w: number, h: number, keepMain: boolean) {
  const n = w * h
  const label = new Int32Array(n).fill(-1)
  const sizes: number[] = []
  const stack = new Int32Array(n)

  for (let start = 0; start < n; start++) {
    if (alpha[start] < 40 || label[start] !== -1) continue
    const id = sizes.length
    let size = 0
    let top = 0
    stack[top++] = start
    label[start] = id
    while (top > 0) {
      const i = stack[--top]
      size++
      const x = i % w
      const y = (i / w) | 0
      if (x > 0 && label[i - 1] === -1 && alpha[i - 1] >= 40) { label[i - 1] = id; stack[top++] = i - 1 }
      if (x < w - 1 && label[i + 1] === -1 && alpha[i + 1] >= 40) { label[i + 1] = id; stack[top++] = i + 1 }
      if (y > 0 && label[i - w] === -1 && alpha[i - w] >= 40) { label[i - w] = id; stack[top++] = i - w }
      if (y < h - 1 && label[i + w] === -1 && alpha[i + w] >= 40) { label[i + w] = id; stack[top++] = i + w }
    }
    sizes.push(size)
  }

  if (!sizes.length) return
  const largest = Math.max(...sizes)
  // A chair's separate parts stay; a watermark or a speck goes
  const minSize = keepMain ? largest * 0.12 : Math.max(24, n * 0.0002)

  for (let i = 0; i < n; i++) {
    const id = label[i]
    if (id >= 0 && sizes[id] < minSize) alpha[i] = 0
  }
}

/** One box-blur pass over the boundary pixels only */
function featherAlpha(alpha: Uint8Array, w: number, h: number, radius: number) {
  if (radius < 1) return
  const src = Uint8Array.from(alpha)
  const r = Math.round(radius)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const a = src[i]
      // Only touch the edge; solid interior and clean background stay crisp
      if (a === 0 || a === 255) {
        const left = x > 0 ? src[i - 1] : a
        const right = x < w - 1 ? src[i + 1] : a
        const up = y > 0 ? src[i - w] : a
        const down = y < h - 1 ? src[i + w] : a
        if (left === a && right === a && up === a && down === a) continue
      }
      let sum = 0
      let count = 0
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= h) continue
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= w) continue
          sum += src[yy * w + xx]
          count++
        }
      }
      alpha[i] = Math.round(sum / count)
    }
  }
}

/**
 * Segment the background in place and return what happened.
 * The pixel buffer comes back with its alpha channel rewritten.
 */
export function cutoutImageData(image: ImageData, options: CutoutOptions): CutoutStats {
  const { width: w, height: h, data } = image
  const n = w * h
  const tolHard = Math.max(4, (options.tolerance / 100) * 90)
  const tolSoft = tolHard * 1.45
  const tolLocal = Math.max(5, tolHard * 0.45)
  const tolGradient = tolHard * 3.2

  // 1. Already transparent? Then the designer did the cutting for us.
  let transparent = 0
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) transparent++
  }
  if (transparent / n > 0.02) {
    return { method: 'alpha', removedRatio: transparent / n, confidence: 'high' }
  }

  const { refs, coverage } = borderRefs(data, w, h, tolHard)
  if (!refs.length) {
    return { method: 'none', removedRatio: 0, confidence: 'low' }
  }

  const alpha = new Uint8Array(n).fill(255)
  // Distance in pixels from solid background, so the soft edge band cannot
  // creep deep into an object that happens to be close to the backdrop colour
  const softDepth = new Uint8Array(n)
  const maxSoftDepth = 6
  const visited = new Uint8Array(n)
  const stack = new Int32Array(n)
  let top = 0

  // 2. Seed from border pixels that match the background, so an object
  //    running off the edge of the frame is not eaten from outside.
  const seed = (x: number, y: number) => {
    const i = y * w + x
    if (visited[i]) return
    const p = i * 4
    if (nearestRef(refs, data[p], data[p + 1], data[p + 2]).d > tolHard) return
    visited[i] = 1
    alpha[i] = 0
    stack[top++] = i
  }
  for (let x = 0; x < w; x++) {
    seed(x, 0)
    seed(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    seed(0, y)
    seed(w - 1, y)
  }

  const visit = (i: number, from: number) => {
    if (visited[i]) return
    const p = i * 4
    const q = from * 4
    const r = data[p]
    const g = data[p + 1]
    const b = data[p + 2]
    const dRef = nearestRef(refs, r, g, b).d
    const dLocal = dist(r, g, b, data[q], data[q + 1], data[q + 2])

    if (dRef <= tolHard) {
      visited[i] = 1
      alpha[i] = 0
      stack[top++] = i
      return
    }
    // A smooth backdrop drifts far from the border sample while every single
    // step stays tiny — keep walking, this is still background. Checked before
    // the soft band so a gradient is not mistaken for an object edge.
    if (alpha[from] === 0 && dLocal <= tolLocal * 0.55 && dRef <= tolGradient) {
      visited[i] = 1
      alpha[i] = 0
      stack[top++] = i
      return
    }
    if (dRef <= tolSoft) {
      // Boundary band — soft shadows and anti-aliased edges fade out here
      const depth = softDepth[from] + 1
      if (depth > maxSoftDepth) return
      visited[i] = 1
      softDepth[i] = depth
      alpha[i] = Math.round((255 * (dRef - tolHard)) / (tolSoft - tolHard))
      if (dLocal <= tolLocal) stack[top++] = i
    }
  }

  while (top > 0) {
    const i = stack[--top]
    const x = i % w
    const y = (i / w) | 0
    if (x > 0) visit(i - 1, i)
    if (x < w - 1) visit(i + 1, i)
    if (y > 0) visit(i - w, i)
    if (y < h - 1) visit(i + w, i)
  }

  let removed = 0
  for (let i = 0; i < n; i++) removed += (255 - alpha[i]) / 255

  // 3. A fill that ate the whole frame means the object matched the border;
  //    better to hand back the untouched photo than an empty sheet.
  if (removed / n > 0.985 || removed / n < 0.005) {
    return { method: 'none', removedRatio: removed / n, confidence: 'low' }
  }

  keepMainBlobs(alpha, w, h, options.keepMain)
  featherAlpha(alpha, w, h, options.feather)

  // 4. Un-mix the old background out of the semi-transparent edge pixels,
  //    otherwise a white photo leaves a white fringe on a dark sheet.
  for (let i = 0; i < n; i++) {
    const a = alpha[i]
    const p = i * 4
    if (a > 25 && a < 250) {
      const { k } = nearestRef(refs, data[p], data[p + 1], data[p + 2])
      const f = a / 255
      for (let c = 0; c < 3; c++) {
        const un = (data[p + c] - (1 - f) * refs[k + c]) / f
        data[p + c] = Math.max(0, Math.min(255, Math.round(un)))
      }
    }
    data[p + 3] = a
  }

  let finalRemoved = 0
  for (let i = 0; i < n; i++) finalRemoved += (255 - alpha[i]) / 255

  return {
    method: 'subject',
    removedRatio: finalRemoved / n,
    confidence: coverage > 0.8 ? 'high' : coverage > 0.5 ? 'medium' : 'low',
  }
}

/**
 * Magic eraser — wipe the region the designer clicked on.
 * Used when the automatic pass leaves a piece of a busy background behind.
 */
export function eraseRegionImageData(
  image: ImageData,
  seedX: number,
  seedY: number,
  tolerance: number,
): number {
  const { width: w, height: h, data } = image
  const n = w * h
  const sx = Math.max(0, Math.min(w - 1, Math.round(seedX)))
  const sy = Math.max(0, Math.min(h - 1, Math.round(seedY)))
  const start = sy * w + sx
  if (data[start * 4 + 3] === 0) return 0

  const tol = Math.max(4, (tolerance / 100) * 90)
  const tolLocal = Math.max(5, tol * 0.5)
  const ref = [data[start * 4], data[start * 4 + 1], data[start * 4 + 2]]

  const visited = new Uint8Array(n)
  const stack = new Int32Array(n)
  let top = 0
  visited[start] = 1
  stack[top++] = start
  let removed = 0

  const visit = (i: number, from: number) => {
    if (visited[i]) return
    const p = i * 4
    if (data[p + 3] === 0) return
    const dRef = dist(data[p], data[p + 1], data[p + 2], ref[0], ref[1], ref[2])
    const q = from * 4
    const dLocal = dist(data[p], data[p + 1], data[p + 2], data[q], data[q + 1], data[q + 2])
    if (dRef <= tol || dLocal <= tolLocal * 0.6) {
      visited[i] = 1
      stack[top++] = i
    }
  }

  while (top > 0) {
    const i = stack[--top]
    data[i * 4 + 3] = 0
    removed++
    const x = i % w
    const y = (i / w) | 0
    if (x > 0) visit(i - 1, i)
    if (x < w - 1) visit(i + 1, i)
    if (y > 0) visit(i - w, i)
    if (y < h - 1) visit(i + w, i)
  }

  return removed / n
}
