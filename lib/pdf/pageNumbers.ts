import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export interface PageNumberOptions {
  position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right'
  startFrom: number
  fontSize: number
  prefix?: string // e.g. "Page " or "Бет "
}

/** Add page numbers to PDF */
export async function addPageNumbers(file: File, options: PageNumberOptions): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer()
  const doc = await PDFDocument.load(buffer)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const count = doc.getPageCount()

  for (let i = 0; i < count; i++) {
    const page = doc.getPage(i)
    const { width, height } = page.getSize()
    const num = i + options.startFrom
    const text = `${options.prefix || ''}${num}`
    const textWidth = font.widthOfTextAtSize(text, options.fontSize)

    let x: number, y: number
    switch (options.position) {
      case 'bottom-center': x = (width - textWidth) / 2; y = 30; break
      case 'bottom-right': x = width - textWidth - 40; y = 30; break
      case 'bottom-left': x = 40; y = 30; break
      case 'top-center': x = (width - textWidth) / 2; y = height - 30; break
      case 'top-right': x = width - textWidth - 40; y = height - 30; break
      default: x = (width - textWidth) / 2; y = 30
    }

    page.drawText(text, { x, y, size: options.fontSize, font, color: rgb(0.3, 0.3, 0.3) })
  }

  return doc.save()
}
