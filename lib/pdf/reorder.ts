import { PDFDocument } from 'pdf-lib'

/** Reorder pages in PDF by new order (0-based indices) */
export async function reorderPages(file: File, newOrder: number[]): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer()
  const source = await PDFDocument.load(buffer)
  const newDoc = await PDFDocument.create()

  const pages = await newDoc.copyPages(source, newOrder)
  pages.forEach(p => newDoc.addPage(p))

  return newDoc.save()
}
