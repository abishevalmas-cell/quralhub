import { PDFDocument, degrees } from 'pdf-lib'

/** Rotate specific pages in a PDF */
export async function rotatePdf(
  file: File,
  pageIndices: number[], // 0-based
  angle: 90 | 180 | 270,
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer()
  const doc = await PDFDocument.load(buffer)

  for (const idx of pageIndices) {
    if (idx >= 0 && idx < doc.getPageCount()) {
      const page = doc.getPage(idx)
      const current = page.getRotation().angle
      page.setRotation(degrees(current + angle))
    }
  }

  return doc.save()
}

/** Rotate ALL pages */
export async function rotateAllPages(file: File, angle: 90 | 180 | 270): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer()
  const doc = await PDFDocument.load(buffer)
  const indices = Array.from({ length: doc.getPageCount() }, (_, i) => i)

  for (const idx of indices) {
    const page = doc.getPage(idx)
    const current = page.getRotation().angle
    page.setRotation(degrees(current + angle))
  }

  return doc.save()
}
