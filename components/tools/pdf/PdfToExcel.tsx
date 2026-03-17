'use client'
import { useState, useCallback } from 'react'
import { useApp } from '@/components/layout/Providers'
import { PdfUploader } from './PdfUploader'
import { formatFileSize } from '@/lib/pdf/pdfUtils'

export function PdfToExcel() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [previewRows, setPreviewRows] = useState<string[][]>([])

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setError('')
    setDone(false)
    setProgress(0)
    setPageCount(0)
    setPreviewRows([])

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
    setPreviewRows([])

    try {
      // Load pdfjs-dist to extract text
      const pdfjsLib = await import('pdfjs-dist')
      // v4.x worker setup — use legacy .js build for Safari/mobile compatibility
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.js`

      const buffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      setProgress(20)

      const allRows: string[][] = []

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = textContent.items as any[]

        // Group text items into lines based on Y position
        const lineMap = new Map<number, { x: number; text: string }[]>()

        for (const item of items) {
          if (!item.str || !item.str.trim()) continue
          const y = Math.round(item.transform[5])
          const x = Math.round(item.transform[4])

          // Find existing line within tolerance
          let matchedY = y
          for (const existingY of lineMap.keys()) {
            if (Math.abs(existingY - y) < 3) {
              matchedY = existingY
              break
            }
          }

          if (!lineMap.has(matchedY)) {
            lineMap.set(matchedY, [])
          }
          lineMap.get(matchedY)!.push({ x, text: item.str })
        }

        // Sort lines top to bottom
        const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a)

        for (const y of sortedYs) {
          const lineItems = lineMap.get(y)!
          // Sort items left to right
          lineItems.sort((a, b) => a.x - b.x)

          // Try to detect columns by large gaps in X position
          const cells: string[] = []
          let currentCell = ''
          let lastX = -1

          for (const item of lineItems) {
            const gap = lastX >= 0 ? item.x - lastX : 0
            // If gap is large enough, treat as column separator
            if (lastX >= 0 && gap > 30) {
              cells.push(currentCell.trim())
              currentCell = item.text
            } else {
              currentCell += (currentCell && gap > 5 ? ' ' : '') + item.text
            }
            lastX = item.x + (item.text.length * 5) // approximate end position
          }

          if (currentCell.trim()) {
            cells.push(currentCell.trim())
          }

          if (cells.length > 0) {
            allRows.push(cells)
          }
        }

        // Add empty row between pages for separation
        if (i < pdf.numPages) {
          allRows.push([])
        }

        setProgress(20 + Math.round((i / pdf.numPages) * 50))
      }

      setProgress(75)

      if (allRows.length === 0) {
        setError(L('Мәтін табылмады — бұл сканерленген PDF болуы мүмкін', 'Текст не найден — возможно, это отсканированный PDF'))
        setLoading(false)
        return
      }

      // Normalize column count (pad shorter rows)
      const maxCols = Math.max(...allRows.map(r => r.length), 1)
      const normalizedRows = allRows.map(row => {
        const padded = [...row]
        while (padded.length < maxCols) padded.push('')
        return padded
      })

      // Set preview (first 10 rows)
      setPreviewRows(normalizedRows.slice(0, 10))

      setProgress(85)

      // Create Excel using xlsx
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(normalizedRows)
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

      setProgress(95)

      const outputName = file.name.replace(/\.pdf$/i, '') + '.xlsx'
      XLSX.writeFile(wb, outputName)

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
              : L('Excel жасалуда...', 'Создание Excel...')}
            {' '}{progress}%
          </p>
        </div>
      )}

      {done && (
        <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 text-sm flex items-center gap-2">
          <span>&#10003;</span>
          {L('Excel файл сәтті жасалды және жүктелді!', 'Excel файл успешно создан и скачан!')}
        </div>
      )}

      {/* Preview table */}
      {previewRows.length > 0 && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            {L('Алдын ала қарау (алғашқы 10 жол)', 'Предпросмотр (первые 10 строк)')}
          </label>
          <div className="bg-card border border-border rounded-xl overflow-x-auto">
            <table className="text-xs w-full">
              <tbody>
                {previewRows.map((row, ri) => (
                  <tr key={ri} className={ri === 0 ? 'bg-accent/40 font-semibold' : 'border-t border-border'}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2 py-1.5 whitespace-nowrap max-w-[120px] truncate">
                        {cell || '\u00A0'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          : L('Excel-ге айналдыру (.xlsx)', 'Конвертировать в Excel (.xlsx)')}
      </button>

      <div className="p-3 rounded-xl bg-accent/20 text-xs text-muted-foreground leading-relaxed">
        {L(
          'PDF файлдан мәтін мен кестелерді шығарып, Excel (XLSX) форматына конвертациялайды. Кесте құрылымы автоматты анықталады.',
          'Извлекает текст и таблицы из PDF и конвертирует в формат Excel (XLSX). Структура таблицы определяется автоматически.'
        )}
      </div>
    </div>
  )
}
