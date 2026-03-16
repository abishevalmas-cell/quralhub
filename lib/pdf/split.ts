import { PDFDocument } from 'pdf-lib'

export interface SplitRange {
  from: number  // 1-based
  to: number    // 1-based, inclusive
}

/** Split PDF into separate documents by ranges */
export async function splitPdf(file: File, ranges: SplitRange[]): Promise<{ name: string; bytes: Uint8Array }[]> {
  const buffer = await file.arrayBuffer()
  const source = await PDFDocument.load(buffer)
  const results: { name: string; bytes: Uint8Array }[] = []
  const baseName = file.name.replace(/\.pdf$/i, '')

  for (const range of ranges) {
    const newDoc = await PDFDocument.create()
    const indices = []
    for (let i = range.from - 1; i < range.to && i < source.getPageCount(); i++) {
      indices.push(i)
    }
    const pages = await newDoc.copyPages(source, indices)
    pages.forEach(p => newDoc.addPage(p))
    const bytes = await newDoc.save()
    results.push({
      name: `${baseName}_pages_${range.from}-${range.to}.pdf`,
      bytes,
    })
  }

  return results
}

/** Split PDF into individual pages */
export async function splitPdfAllPages(file: File): Promise<{ name: string; bytes: Uint8Array }[]> {
  const buffer = await file.arrayBuffer()
  const source = await PDFDocument.load(buffer)
  const count = source.getPageCount()
  const baseName = file.name.replace(/\.pdf$/i, '')
  const results: { name: string; bytes: Uint8Array }[] = []

  for (let i = 0; i < count; i++) {
    const newDoc = await PDFDocument.create()
    const [page] = await newDoc.copyPages(source, [i])
    newDoc.addPage(page)
    const bytes = await newDoc.save()
    results.push({ name: `${baseName}_page_${i + 1}.pdf`, bytes })
  }

  return results
}
