/** Render a collage document to a raster image */
import type { CollageDoc, CollageItem } from './types'
import { loadImage } from './background'

export interface RenderOptions {
  /** 1 = sheet pixel size, 2 = retina export */
  scale: number
  format: 'png' | 'jpeg'
  quality: number
}

function drawBackgroundImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  fit: 'cover' | 'contain',
) {
  const ar = img.naturalWidth / img.naturalHeight
  const sheetAr = w / h
  const useWidth = fit === 'cover' ? ar < sheetAr : ar > sheetAr
  const dw = useWidth ? w : h * ar
  const dh = useWidth ? w / ar : h
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  text.split('\n').forEach(paragraph => {
    const words = paragraph.split(' ')
    let line = ''
    words.forEach(word => {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line)
        line = word
      } else {
        line = test
      }
    })
    lines.push(line)
  })
  return lines
}

function drawTextItem(ctx: CanvasRenderingContext2D, item: CollageItem) {
  const size = item.fontSize ?? 32
  const weight = item.fontWeight ?? 600
  ctx.font = `${weight} ${size}px Inter, system-ui, -apple-system, sans-serif`
  ctx.fillStyle = item.color ?? '#111111'
  ctx.textBaseline = 'top'
  const align = item.align ?? 'left'
  ctx.textAlign = align

  const lines = wrapText(ctx, item.text ?? '', item.w)
  const lineHeight = size * 1.25
  const totalH = lines.length * lineHeight
  const startY = -item.h / 2 + Math.max(0, (item.h - totalH) / 2)
  const x = align === 'center' ? 0 : align === 'right' ? item.w / 2 : -item.w / 2

  lines.forEach((line, i) => {
    ctx.fillText(line, x, startY + i * lineHeight)
  })
}

/** Paint the whole document onto a canvas at the requested scale */
export async function renderDoc(doc: CollageDoc, options: RenderOptions): Promise<HTMLCanvasElement> {
  const { sheet, items } = doc
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sheet.w * options.scale)
  canvas.height = Math.round(sheet.h * options.scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(options.scale, options.scale)
  ctx.imageSmoothingQuality = 'high'

  // Background — JPEG has no alpha, so a transparent sheet becomes white
  const bg = sheet.background === 'transparent'
    ? (options.format === 'jpeg' ? '#FFFFFF' : null)
    : sheet.background
  if (bg) {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, sheet.w, sheet.h)
  }
  if (sheet.backgroundImage) {
    try {
      const bgImg = await loadImage(sheet.backgroundImage)
      drawBackgroundImage(ctx, bgImg, sheet.w, sheet.h, sheet.backgroundFit)
    } catch {
      /* a broken background must not block the export */
    }
  }

  const visible = items.filter(i => i.visible)
  const images = await Promise.all(
    visible.map(i => (i.kind === 'image' ? loadImage(i.src).catch(() => null) : Promise.resolve(null))),
  )

  visible.forEach((item, i) => {
    ctx.save()
    ctx.globalAlpha = item.opacity
    ctx.translate(item.x + item.w / 2, item.y + item.h / 2)
    ctx.rotate((item.rotation * Math.PI) / 180)

    if (item.shadow) {
      ctx.shadowColor = 'rgba(15, 23, 42, 0.28)'
      ctx.shadowBlur = Math.max(12, item.h * 0.06)
      ctx.shadowOffsetY = Math.max(6, item.h * 0.03)
    }

    if (item.kind === 'text') {
      drawTextItem(ctx, item)
    } else {
      const img = images[i]
      if (img) {
        if (item.flipX) ctx.scale(-1, 1)
        ctx.drawImage(img, -item.w / 2, -item.h / 2, item.w, item.h)
      }
    }
    ctx.restore()
  })

  return canvas
}

export async function exportDoc(doc: CollageDoc, options: RenderOptions): Promise<Blob> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready
  }
  const canvas = await renderDoc(doc, options)
  const mime = options.format === 'jpeg' ? 'image/jpeg' : 'image/png'
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('Export failed'))),
      mime,
      options.format === 'jpeg' ? options.quality : undefined,
    )
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
