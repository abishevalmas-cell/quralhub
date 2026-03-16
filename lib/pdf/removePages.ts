import { PDFDocument } from 'pdf-lib'

/** Remove specific pages from PDF (0-based indices) */
export async function removePages(file: File, pageIndicesToRemove: number[]): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer()
  const source = await PDFDocument.load(buffer)
  const newDoc = await PDFDocument.create()

  const keepIndices = source.getPageIndices().filter(i => !pageIndicesToRemove.includes(i))

  if (keepIndices.length === 0) {
    throw new Error('Cannot remove all pages')
  }

  const pages = await newDoc.copyPages(source, keepIndices)
  pages.forEach(p => newDoc.addPage(p))

  return newDoc.save()
}
