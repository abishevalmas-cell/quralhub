'use client'
import { useState, useCallback } from 'react'
import { useApp } from '@/components/layout/Providers'
import { PdfUploader } from './PdfUploader'
import { formatFileSize } from '@/lib/pdf/pdfUtils'

export function PdfToWord() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setError('')
    setDone(false)
    setProgress(0)
    setPageCount(0)

    try {
      const { PDFDocument } = await import('pdf-lib')
      const buffer = await f.arrayBuffer()
      const doc = await PDFDocument.load(buffer)
      setPageCount(doc.getPageCount())
    } catch {
      setError(L('PDF файлды оқу мүмкін болмады', 'Не удалось прочитать PDF файл'))
    }
  }, [lang])

  const handleConvert = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setDone(false)
    setProgress(10)

    try {
      // Load pdfjs-dist to extract text
      const pdfjsLib = await import('pdfjs-dist')
      // v4.x worker setup — use legacy .js build for Safari/mobile compatibility
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.js`

      const buffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      setProgress(20)

      const paragraphs: string[] = []

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()

        // Group text items into lines based on Y position
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = textContent.items as any[]
        const lines: { y: number; text: string }[] = []

        for (const item of items) {
          if (!item.str) continue
          const y = Math.round(item.transform[5])
          const existing = lines.find(l => Math.abs(l.y - y) < 3)
          if (existing) {
            existing.text += item.str
          } else {
            lines.push({ y, text: item.str })
          }
        }

        // Sort lines top to bottom (higher Y = higher on page)
        lines.sort((a, b) => b.y - a.y)

        for (const line of lines) {
          const trimmed = line.text.trim()
          if (trimmed) {
            paragraphs.push(trimmed)
          }
        }

        // Add page separator
        if (i < pdf.numPages) {
          paragraphs.push('')
        }

        setProgress(20 + Math.round((i / pdf.numPages) * 50))
      }

      setProgress(75)

      // Generate DOCX using the docx library
      const { Document, Paragraph, TextRun, Packer } = await import('docx')

      const docChildren = paragraphs.map(text => {
        if (!text) {
          return new Paragraph({ children: [] })
        }
        return new Paragraph({
          children: [
            new TextRun({
              text,
              size: 24, // 12pt in half-points
            }),
          ],
          spacing: { after: 120 },
        })
      })

      const doc = new Document({
        sections: [{
          children: docChildren,
        }],
      })

      setProgress(90)

      const blob = await Packer.toBlob(doc)
      const outputName = file.name.replace(/\.pdf$/i, '') + '.docx'

      // Download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = outputName
      a.click()
      URL.revokeObjectURL(url)

      setProgress(100)
      setDone(true)
    } catch (e: any) {
      console.error(e)
      const msg = e?.message || ''
      if (msg.includes('Worker') || msg.includes('worker') || msg.includes('WASM') || msg.includes('import')) {
        setError(L(
          'Сіздің браузер бұл мүмкіндікті қолдамайды. Chrome/Firefox браузерін қолданып көріңіз.',
          'Ваш браузер не поддерживает эту функцию. Попробуйте использовать Chrome/Firefox на компьютере.'
        ))
      } else {
        setError(L('PDF файлды конвертациялау кезінде қате болды', 'Ошибка при конвертации PDF файла'))
      }
    } finally {
      setLoading(false)
    }
  }, [file, lang])

  return (
    <div className="space-y-4">
      <PdfUploader
        onFiles={handleFiles}
        label={L('PDF файлды таңдаңыз', 'Выберите PDF файл')}
      />

      {file && pageCount > 0 && (
        <div className="p-3 rounded-xl bg-accent/30 text-sm flex items-center gap-2 min-w-0">
          <span className="shrink-0">📄</span>
          <span className="font-semibold truncate max-w-[200px]">{file.name}</span>
          <span className="text-muted-foreground shrink-0">
            — {pageCount} {L('бет', 'стр.')} ({formatFileSize(file.size)})
          </span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          <div className="w-full bg-accent/30 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {progress < 70
              ? L('Мәтін оқылуда...', 'Извлечение текста...')
              : L('DOCX жасалуда...', 'Создание DOCX...')}
            {' '}{progress}%
          </p>
        </div>
      )}

      {done && (
        <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 text-sm flex items-center gap-2">
          <span>&#10003;</span>
          {L('Word файл сәтті жасалды және жүктелді!', 'Word файл успешно создан и скачан!')}
        </div>
      )}

      <button
        onClick={handleConvert}
        disabled={loading || !file || pageCount === 0}
        className="w-full py-3 px-6 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
        {loading
          ? L('Конвертациялануда...', 'Конвертация...')
          : L('Word-қа айналдыру (.docx)', 'Конвертировать в Word (.docx)')}
      </button>

      <div className="p-3 rounded-xl bg-accent/20 text-xs text-muted-foreground leading-relaxed">
        {L(
          'PDF файлдан мәтінді шығарып, Word (DOCX) форматына конвертациялайды. Мәтіндік PDF файлдар үшін жақсы жұмыс істейді.',
          'Извлекает текст из PDF и конвертирует в формат Word (DOCX). Лучше всего работает с текстовыми PDF файлами.'
        )}
      </div>
    </div>
  )
}
