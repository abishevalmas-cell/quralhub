'use client'
import { useState, useCallback } from 'react'
import { useApp } from '@/components/layout/Providers'
import { PdfUploader } from './PdfUploader'
import { formatFileSize } from '@/lib/pdf/pdfUtils'

export function ExcelToPdf() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [file, setFile] = useState<File | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [previewRows, setPreviewRows] = useState<string[][]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [workbook, setWorkbook] = useState<any>(null)

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setError('')
    setDone(false)
    setProgress(0)
    setPreviewRows([])

    try {
      const XLSX = await import('xlsx')
      const buffer = await f.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      setWorkbook(wb)
      setSheetNames(wb.SheetNames)

      // Auto-select first sheet
      const firstSheet = wb.SheetNames[0]
      setSelectedSheet(firstSheet)
      loadSheetPreview(wb, firstSheet)
    } catch (e) {
      setError(L('Excel файлды оқу мүмкін болмады', 'Не удалось прочитать Excel файл'))
      console.error(e)
    }
  }, [lang])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadSheetPreview = async (wb: any, sheetName: string) => {
    try {
      const XLSX = await import('xlsx')
      const ws = wb.Sheets[sheetName]
      const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      // Show first 10 rows as preview
      setPreviewRows(rows.slice(0, 10).map(row =>
        (row as unknown[]).map(cell => String(cell ?? ''))
      ))
    } catch {
      setPreviewRows([])
    }
  }

  const handleSheetChange = useCallback((sheetName: string) => {
    setSelectedSheet(sheetName)
    if (workbook) {
      loadSheetPreview(workbook, sheetName)
    }
  }, [workbook])

  const handleConvert = useCallback(async () => {
    if (!file || !workbook || !selectedSheet) return
    setLoading(true)
    setError('')
    setDone(false)
    setProgress(10)

    try {
      const XLSX = await import('xlsx')
      const ws = workbook.Sheets[selectedSheet]
      const allRows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      const rows = allRows.map(row => (row as unknown[]).map(cell => String(cell ?? '')))
      setProgress(30)

      if (rows.length === 0) {
        setError(L('Бос парақ — деректер табылмады', 'Пустой лист — данные не найдены'))
        setLoading(false)
        return
      }

      const { jsPDF } = await import('jspdf')
      setProgress(40)

      // Determine column count (max across all rows)
      const colCount = Math.max(...rows.map(r => r.length), 1)

      // Calculate column widths based on content
      const colWidths: number[] = new Array(colCount).fill(0)
      for (const row of rows) {
        for (let c = 0; c < colCount; c++) {
          const cellText = row[c] || ''
          colWidths[c] = Math.max(colWidths[c], cellText.length)
        }
      }

      // Fit to page width
      const pageWidth = 277 // A4 landscape usable width
      const marginLeft = 10
      const marginTop = 15
      const totalChars = colWidths.reduce((s, w) => s + Math.max(w, 3), 0)
      const availableWidth = pageWidth - marginLeft * 2

      const scaledWidths = colWidths.map(w => {
        const minWidth = 15
        const proportional = (Math.max(w, 3) / totalChars) * availableWidth
        return Math.max(proportional, minWidth)
      })

      // Clamp total to available width
      const totalScaled = scaledWidths.reduce((s, w) => s + w, 0)
      const scale = totalScaled > availableWidth ? availableWidth / totalScaled : 1
      const finalWidths = scaledWidths.map(w => w * scale)

      const isLandscape = colCount > 4
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const fontSize = 8
      const headerFontSize = 9
      const cellPadding = 2
      const rowHeight = fontSize * 0.5 + cellPadding * 2 + 2
      const maxY = isLandscape ? 190 : 280

      pdf.setFontSize(fontSize)
      let y = marginTop

      for (let r = 0; r < rows.length; r++) {
        const row = rows[r]
        const isHeader = r === 0

        // Check if we need a new page
        if (y + rowHeight > maxY) {
          pdf.addPage()
          y = marginTop
        }

        let x = marginLeft

        for (let c = 0; c < colCount; c++) {
          const cellWidth = finalWidths[c] || 20
          const cellText = row[c] || ''

          // Draw cell border
          pdf.setDrawColor(180, 180, 180)
          pdf.setLineWidth(0.2)
          pdf.rect(x, y, cellWidth, rowHeight)

          // Header background
          if (isHeader) {
            pdf.setFillColor(240, 240, 245)
            pdf.rect(x, y, cellWidth, rowHeight, 'F')
            pdf.rect(x, y, cellWidth, rowHeight, 'S')
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(headerFontSize)
          } else {
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(fontSize)
          }

          // Truncate text to fit cell
          const maxChars = Math.floor(cellWidth / (fontSize * 0.22))
          const displayText = cellText.length > maxChars
            ? cellText.slice(0, maxChars - 1) + '\u2026'
            : cellText

          pdf.text(displayText, x + cellPadding, y + rowHeight / 2 + 1)
          x += cellWidth
        }

        y += rowHeight
        setProgress(40 + Math.round((r / rows.length) * 50))
      }

      setProgress(95)
      const outputName = file.name.replace(/\.(xlsx?|xls|csv)$/i, '') + '.pdf'
      pdf.save(outputName)
      setProgress(100)
      setDone(true)
    } catch (e) {
      setError(L('Excel файлды конвертациялау кезінде қате болды', 'Ошибка при конвертации Excel файла'))
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [file, workbook, selectedSheet, lang])

  return (
    <div className="space-y-4">
      <PdfUploader
        accept=".xlsx,.xls,.csv"
        onFiles={handleFiles}
        label={L('Excel файлды таңдаңыз (.xlsx, .csv)', 'Выберите Excel файл (.xlsx, .csv)')}
      />

      {file && (
        <div className="p-3 rounded-xl bg-accent/30 text-sm flex items-center gap-2">
          <span>📊</span>
          <span className="font-semibold truncate">{file.name}</span>
          <span className="text-muted-foreground shrink-0">({formatFileSize(file.size)})</span>
        </div>
      )}

      {/* Sheet selector */}
      {sheetNames.length > 1 && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            {L('Парақ таңдау', 'Выбор листа')}
          </label>
          <div className="flex flex-wrap gap-2">
            {sheetNames.map(name => (
              <button
                key={name}
                onClick={() => handleSheetChange(name)}
                className={`px-3 py-2 rounded-full text-sm font-semibold transition-all min-h-[44px] ${
                  selectedSheet === name
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-muted-foreground hover:border-primary'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
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
        disabled={loading || !file || !selectedSheet}
        className="w-full py-3 px-6 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
        {loading
          ? L('Конвертациялануда...', 'Конвертация...')
          : L('PDF-ке айналдыру', 'Конвертировать в PDF')}
      </button>

      <div className="p-3 rounded-xl bg-accent/20 text-xs text-muted-foreground leading-relaxed">
        {L(
          'Excel кестесін PDF форматына конвертациялайды. Кесте тақырыптары, жолдар мен бағандар сақталады.',
          'Конвертирует таблицу Excel в формат PDF. Сохраняются заголовки, строки и столбцы.'
        )}
      </div>
    </div>
  )
}
