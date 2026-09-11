/**
 * Item preparation for the collage editor.
 * Reuses the background remover built for the PDF tools and adds
 * transparent-edge cropping so every object arrives on the sheet tight.
 */
import { removeBackground } from '@/lib/pdf/removeBackground'

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

/** Run the background remover over an already-loaded data URL */
export async function cutoutFromDataUrl(dataUrl: string, threshold: number): Promise<PreparedImage> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  const file = new File([blob], 'item.png', { type: blob.type || 'image/png' })
  const removed = await removeBackground(file, { threshold })
  return autoCropTransparent(removed.dataUrl)
}

export interface PreparedItem {
  originalSrc: string
  cutoutSrc?: string
  src: string
  width: number
  height: number
}

/** File → sheet-ready object, with the background taken out by default */
export async function prepareItem(
  file: File,
  opts: { removeBg: boolean; threshold: number },
): Promise<PreparedItem> {
  const raw = await fileToDataUrl(file)
  const original = await downscale(raw)

  if (!opts.removeBg) {
    return {
      originalSrc: original.dataUrl,
      src: original.dataUrl,
      width: original.width,
      height: original.height,
    }
  }

  const cutout = await cutoutFromDataUrl(original.dataUrl, opts.threshold)
  return {
    originalSrc: original.dataUrl,
    cutoutSrc: cutout.dataUrl,
    src: cutout.dataUrl,
    width: cutout.width,
    height: cutout.height,
  }
}
