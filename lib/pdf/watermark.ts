import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'

export interface WatermarkOptions {
  text: string
  fontSize: number
  opacity: number  // 0-1
  rotation: number // degrees
  color: { r: number; g: number; b: number }
}

/** Add text watermark to all pages */
export async function addWatermark(file: File, options: WatermarkOptions): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer()
  const doc = await PDFDocument.load(buffer)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const count = doc.getPageCount()

  for (let i = 0; i < count; i++) {
    const page = doc.getPage(i)
    const { width, height } = page.getSize()
    const textWidth = font.widthOfTextAtSize(options.text, options.fontSize)

    page.drawText(options.text, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size: options.fontSize,
      font,
      color: rgb(options.color.r, options.color.g, options.color.b),
      opacity: options.opacity,
      rotate: degrees(options.rotation),
    })
  }

  return doc.save()
}
