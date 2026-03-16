import { PDFDocument } from 'pdf-lib'

/** Load PDF from File */
export async function loadPdf(file: File): Promise<PDFDocument> {
  const buffer = await file.arrayBuffer()
  return PDFDocument.load(buffer)
}

/** Load PDF from Uint8Array */
export async function loadPdfFromBytes(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes)
}

/** Save PDF to Uint8Array */
export async function savePdf(doc: PDFDocument): Promise<Uint8Array> {
  return doc.save()
}

/** Get page count from File */
export async function getPageCount(file: File): Promise<number> {
  const doc = await loadPdf(file)
  return doc.getPageCount()
}

/** Read file as ArrayBuffer */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

/** Read file as Data URL */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** Download Uint8Array as PDF file */
export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Download Blob as file */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Format file size */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
