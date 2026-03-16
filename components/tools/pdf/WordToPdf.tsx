'use client'
import { useState, useCallback } from 'react'
import { useApp } from '@/components/layout/Providers'
import { PdfUploader } from './PdfUploader'
import { formatFileSize } from '@/lib/pdf/pdfUtils'

export function WordToPdf() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleFiles = useCallback((files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setError('')
    setDone(false)
    setProgress(0)
  }, [])

  const handleConvert = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setDone(false)
    setProgress(10)

    try {
      const mammoth = await import('mammoth')
      const buffer = await file.arrayBuffer()
      setProgress(30)

      const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
      const html = result.value
      setProgress(50)

      // Parse HTML to extract text blocks
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const elements = doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, tr, blockquote, pre')

      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      setProgress(60)

      const pageWidth = 210
      const pageHeight = 297
      const marginLeft = 20
      const marginRight = 20
      const marginTop = 20
      const marginBottom = 20
      const maxWidth = pageWidth - marginLeft - marginRight
      const maxY = pageHeight - marginBottom
      let y = marginTop

      const addTextBlock = (text: string, fontSize: number, isBold: boolean) => {
        if (!text.trim()) return
        pdf.setFontSize(fontSize)
        if (isBold) {
          pdf.setFont('helvetica', 'bold')
        } else {
          pdf.setFont('helvetica', 'normal')
        }
        const lines = pdf.splitTextToSize(text, maxWidth)
        const lineHeight = fontSize * 0.4 + 1.5

        for (const line of lines) {
          if (y + lineHeight > maxY) {
            pdf.addPage()
            y = marginTop
          }
          pdf.text(line, marginLeft, y)
          y += lineHeight
        }
        y += 2 // paragraph spacing
      }

      if (elements.length > 0) {
        let processed = 0
        for (const el of elements) {
          const tag = el.tagName.toLowerCase()
          const text = el.textContent?.trim() || ''
          if (!text) { processed++; continue }

          if (tag === 'h1') {
            addTextBlock(text, 20, true)
            y += 3
          } else if (tag === 'h2') {
            addTextBlock(text, 16, true)
            y += 2
          } else if (tag === 'h3' || tag === 'h4') {
            addTextBlock(text, 14, true)
            y += 1
          } else if (tag === 'h5' || tag === 'h6') {
            addTextBlock(text, 12, true)
          } else if (tag === 'li') {
            addTextBlock(`  \u2022  ${text}`, 11, false)
          } else if (tag === 'blockquote' || tag === 'pre') {
            addTextBlock(`  ${text}`, 10, false)
          } else {
            addTextBlock(text, 11, false)
          }

          processed++
          setProgress(60 + Math.round((processed / elements.length) * 30))
        }
      } else {
        // Fallback: use raw text content
        const fullText = doc.body.textContent || ''
        if (fullText.trim()) {
          addTextBlock(fullText, 11, false)
        }
      }

      setProgress(95)

      const outputName = file.name.replace(/\.(docx?|doc)$/i, '') + '.pdf'
      pdf.save(outputName)
      setProgress(100)
      setDone(true)
    } catch (e) {
      setError(L('Word файлды конвертациялау кезінде қате болды', 'Ошибка при конвертации Word файла'))
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [file, lang])

  return (
    <div className="space-y-4">
      <PdfUploader
        accept=".docx,.doc"
        onFiles={handleFiles}
        label={L('Word файлды таңдаңыз (.docx)', 'Выберите Word файл (.docx)')}
      />

      {file && (
        <div className="p-3 rounded-xl bg-accent/30 text-sm flex items-center gap-2">
          <span>📄</span>
          <span className="font-semibold truncate">{file.name}</span>
          <span className="text-muted-foreground shrink-0">({formatFileSize(file.size)})</span>
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
          <p className="text-xs text-muted-foreground text-center">{progress}%</p>
        </div>
      )}

      {done && (
        <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 text-sm flex items-center gap-2">
          <span>&#10003;</span>
          {L('PDF файл сәтті жасалды және жүктелді!', 'PDF файл успешно создан и скачан!')}
        </div>
      )}

      <button
        onClick={handleConvert}
        disabled={loading || !file}
        className="w-full py-3 px-6 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
        {loading
          ? L('Конвертациялануда...', 'Конвертация...')
          : L('PDF-ке айналдыру', 'Конвертировать в PDF')}
      </button>

      <div className="p-3 rounded-xl bg-accent/20 text-xs text-muted-foreground leading-relaxed">
        {L(
          'DOCX форматындағы файлды PDF-ке конвертациялайды. Мәтін, тақырыптар, тізімдер сақталады.',
          'Конвертирует файл формата DOCX в PDF. Сохраняются текст, заголовки, списки.'
        )}
      </div>
    </div>
  )
}
