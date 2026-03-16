import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export interface StampPlacement {
  type: 'image' | 'text'
  pageIndex: number     // 0-based
  x: number             // % from left (0-100)
  y: number             // % from bottom (0-100)
  width: number         // % of page width
  height: number        // % of page height
  data: string          // base64 image or text content
  opacity?: number
  fontSize?: number
  color?: { r: number; g: number; b: number }
}

/** Place stamps/signatures/images on PDF pages */
export async function editPdfWithStamps(
  file: File,
  stamps: StampPlacement[],
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer()
  const doc = await PDFDocument.load(buffer)

  for (const stamp of stamps) {
    if (stamp.pageIndex < 0 || stamp.pageIndex >= doc.getPageCount()) continue
    const page = doc.getPage(stamp.pageIndex)
    const { width: pw, height: ph } = page.getSize()

    const x = (stamp.x / 100) * pw
    const y = (stamp.y / 100) * ph
    const w = (stamp.width / 100) * pw
    const h = (stamp.height / 100) * ph

    if (stamp.type === 'image' && stamp.data) {
      try {
        let image
        if (stamp.data.includes('image/png') || stamp.data.endsWith('.png')) {
          const base64 = stamp.data.split(',')[1] || stamp.data
          const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
          image = await doc.embedPng(bytes)
        } else {
          const base64 = stamp.data.split(',')[1] || stamp.data
          const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
          image = await doc.embedJpg(bytes)
        }

        page.drawImage(image, {
          x,
          y,
          width: w,
          height: h,
          opacity: stamp.opacity ?? 1,
        })
      } catch (err) {
        console.warn('Failed to embed image stamp:', err)
      }
    } else if (stamp.type === 'text' && stamp.data) {
      const font = await doc.embedFont(StandardFonts.Helvetica)
      const size = stamp.fontSize || 14
      const color = stamp.color || { r: 0, g: 0, b: 0 }

      page.drawText(stamp.data, {
        x,
        y,
        size,
        font,
        color: rgb(color.r, color.g, color.b),
        opacity: stamp.opacity ?? 1,
      })
    }
  }

  return doc.save()
}
