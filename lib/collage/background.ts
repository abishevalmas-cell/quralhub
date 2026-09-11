/**
 * Item preparation for the collage editor.
 *
 * Any photo the designer has goes in — on white, on colour, on a gradient,
 * or a PNG that is already cut out. The subject is detected automatically,
 * the background is dropped and the result is cropped tight to the object.
 */
import { removeBackground } from '@/lib/pdf/removeBackground'
import {
  cutoutImageData,
  eraseRegionImageData,
  DEFAULT_CUTOUT_OPTIONS,
  type CutoutMethod,
  type CutoutOptions,
  type CutoutStats,
} from './autoCutout'

export type { CutoutMethod, CutoutOptions }
export { DEFAULT_CUTOUT_OPTIONS }

export interface PreparedImage {
  dataUrl: string
  width: number
  height: number
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = src
  })
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

/** Crop fully transparent margins away, keeping a small padding */
export async function autoCropTransparent(dataUrl: string, padding = 2): Promise<PreparedImage> {
  const img = await loadImage(dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  const { width, height } = canvas
  const { data } = ctx.getImageData(0, 0, width, height)

  let top = height
  let bottom = -1
  let left = width
  let right = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 12) {
        if (y < top) top = y
        if (y > bottom) bottom = y
        if (x < left) left = x
        if (x > right) right = x
      }
    }
  }

  if (bottom < top || right < left) {
    return { dataUrl, width, height }
  }

  const cropX = Math.max(0, left - padding)
  const cropY = Math.max(0, top - padding)
  const cropW = Math.min(width - cropX, right - left + 1 + padding * 2)
  const cropH = Math.min(height - cropY, bottom - top + 1 + padding * 2)

  const out = document.createElement('canvas')
  out.width = cropW
  out.height = cropH
  out.getContext('2d')!.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

  return { dataUrl: out.toDataURL('image/png'), width: cropW, height: cropH }
}

/** Downscale oversized marketplace photos so the editor stays responsive */
export async function downscale(dataUrl: string, maxSide = 1600): Promise<PreparedImage> {
  const img = await loadImage(dataUrl)
  const { naturalWidth: w, naturalHeight: h } = img
  if (Math.max(w, h) <= maxSide) return { dataUrl, width: w, height: h }

  const ratio = maxSide / Math.max(w, h)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * ratio)
  canvas.height = Math.round(h * ratio)
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height }
}

/** Read a data URL into a pixel buffer */
async function toImageData(dataUrl: string): Promise<{ image: ImageData; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> {
  const img = await loadImage(dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  return { image: ctx.getImageData(0, 0, canvas.width, canvas.height), canvas, ctx }
}

/** Share of fully or partly transparent pixels in an image */
async function transparencyRatio(dataUrl: string): Promise<number> {
  const { image } = await toImageData(dataUrl)
  let clear = 0
  for (let i = 3; i < image.data.length; i += 4) {
    if (image.data[i] < 250) clear++
  }
  return clear / (image.width * image.height)
}

/** The original brightness-based remover, kept as a fallback for flat light backdrops */
export async function cutoutFromDataUrl(dataUrl: string, threshold: number): Promise<PreparedImage> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  const file = new File([blob], 'item.png', { type: blob.type || 'image/png' })
  const removed = await removeBackground(file, { threshold })
  return autoCropTransparent(removed.dataUrl)
}

export interface CutoutResult extends PreparedImage, CutoutStats {}

/**
 * Work out what the background is and keep only the object.
 * Falls back to the brightness remover when the subject pass finds nothing,
 * and hands the photo back untouched when neither is confident.
 */
export async function autoCutout(
  dataUrl: string,
  options: CutoutOptions = DEFAULT_CUTOUT_OPTIONS,
): Promise<CutoutResult> {
  const { image, canvas, ctx } = await toImageData(dataUrl)
  const stats = cutoutImageData(image, options)

  if (stats.method === 'alpha') {
    const cropped = await autoCropTransparent(dataUrl)
    return { ...cropped, ...stats }
  }

  if (stats.method === 'none') {
    // Flat, light backdrop the flood could not seed on — try the simple remover
    try {
      const fallback = await cutoutFromDataUrl(dataUrl, 225)
      const ratio = await transparencyRatio(fallback.dataUrl)
      if (ratio > 0.01 && ratio < 0.985) {
        return { ...fallback, method: 'threshold', removedRatio: ratio, confidence: 'medium' }
      }
    } catch {
      /* fall through to the untouched image */
    }
    const img = await loadImage(dataUrl)
    return {
      dataUrl,
      width: img.naturalWidth,
      height: img.naturalHeight,
      method: 'none',
      removedRatio: 0,
      confidence: 'low',
    }
  }

  ctx.putImageData(image, 0, 0)
  const cropped = await autoCropTransparent(canvas.toDataURL('image/png'))
  return { ...cropped, ...stats }
}

/** Magic eraser — clear the region around a point the designer clicked */
export async function eraseAt(
  dataUrl: string,
  x: number,
  y: number,
  tolerance: number,
): Promise<PreparedImage & { removedRatio: number }> {
  const { image, canvas, ctx } = await toImageData(dataUrl)
  const removedRatio = eraseRegionImageData(image, x, y, tolerance)
  ctx.putImageData(image, 0, 0)
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
    removedRatio,
  }
}

export interface PreparedItem {
  originalSrc: string
  cutoutSrc?: string
  src: string
  width: number
  height: number
  method: CutoutMethod
  confidence: CutoutStats['confidence']
}

/** File → sheet-ready object, with the subject already isolated */
export async function prepareItem(
  file: File,
  opts: { removeBg: boolean; options: CutoutOptions },
): Promise<PreparedItem> {
  const raw = await fileToDataUrl(file)
  const original = await downscale(raw)

  if (!opts.removeBg) {
    return {
      originalSrc: original.dataUrl,
      src: original.dataUrl,
      width: original.width,
      height: original.height,
      method: 'none',
      confidence: 'high',
    }
  }

  const cutout = await autoCutout(original.dataUrl, opts.options)
  return {
    originalSrc: original.dataUrl,
    cutoutSrc: cutout.method === 'none' ? undefined : cutout.dataUrl,
    src: cutout.dataUrl,
    width: cutout.width,
    height: cutout.height,
    method: cutout.method,
    confidence: cutout.confidence,
  }
}
