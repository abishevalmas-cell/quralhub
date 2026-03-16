'use client'
import { useState, useCallback } from 'react'
import { useApp } from '@/components/layout/Providers'
import { PdfUploader } from './PdfUploader'
import { loadPdf, downloadBlob, formatFileSize } from '@/lib/pdf/pdfUtils'
import { PDFDocument } from 'pdf-lib'

type Quality = 'low' | 'medium' | 'high'
type Format = 'jpg' | 'png'

interface PageInfo {
  index: number
  width: number
  height: number
}

const QUALITY_SCALE: Record<Quality, number> = {
  low: 1,
  medium: 2,
  high: 3,
}

const QUALITY_JPEG: Record<Quality, number> = {
  low: 0.6,
  medium: 0.85,
  high: 0.95,
}

export function PdfToImage() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState<PageInfo[]>([])
  const [quality, setQuality] = useState<Quality>('medium')
  const [format, setFormat] = useState<Format>('jpg')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [convertedImages, setConvertedImages] = useState<{ pageNum: number; dataUrl: string; blob: Blob }[]>([])
  const [error, setError] = useState('')

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setError('')
    setConvertedImages([])
    setProgress(0)
    try {
      const buffer = await f.arrayBuffer()
      const doc = await PDFDocument.load(buffer)
      const count = doc.getPageCount()
      const pageInfos: PageInfo[] = []
      for (let i = 0; i < count; i++) {
        const page = doc.getPage(i)
        const { width, height } = page.getSize()
        pageInfos.push({ index: i, width, height })
      }
      setPages(pageInfos)
    } catch {
      setError(L('PDF файлды оқу мүмкін болмады', 'Не удалось прочитать PDF файл'))
    }
  }, [lang])

  const handleConvert = useCallback(async () => {
    if (!file || pages.length === 0) return
    setLoading(true)
    setError('')
    setConvertedImages([])
    setProgress(0)

    try {
      // Try to use pdf.js for actual rendering
      const pdfjsLib = await import('pdfjs-dist')
      // Set worker source
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

      const buffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      const results: { pageNum: number; dataUrl: string; blob: Blob }[] = []
      const scale = QUALITY_SCALE[quality]

      for (let i = 0; i < pdf.numPages; i++) {
        const page = await pdf.getPage(i + 1)
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!

        // White background for JPG
        if (format === 'jpg') {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }

        await page.render({ canvasContext: ctx, viewport } as any).promise

        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
        const jpegQuality = format === 'jpg' ? QUALITY_JPEG[quality] : undefined
        const dataUrl = canvas.toDataURL(mimeType, jpegQuality)

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob(b => resolve(b!), mimeType, jpegQuality)
        })

        results.push({ pageNum: i + 1, dataUrl, blob })
        setProgress(Math.round(((i + 1) / pdf.numPages) * 100))
      }

      setConvertedImages(results)
    } catch (pdfJsError) {
      // Fallback: split into individual single-page PDFs for download
      console.warn('pdf.js not available, falling back to PDF split:', pdfJsError)
      try {
        const buffer = await file.arrayBuffer()
        const srcDoc = await PDFDocument.load(buffer)
        const results: { pageNum: number; dataUrl: string; blob: Blob }[] = []

        for (let i = 0; i < srcDoc.getPageCount(); i++) {
          const newDoc = await PDFDocument.create()
          const [copiedPage] = await newDoc.copyPages(srcDoc, [i])
          newDoc.addPage(copiedPage)
          const pdfBytes = await newDoc.save()
          const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' })
          const dataUrl = URL.createObjectURL(blob)
          results.push({ pageNum: i + 1, dataUrl, blob })
          setProgress(Math.round(((i + 1) / srcDoc.getPageCount()) * 100))
        }

        setConvertedImages(results)
        setError(L(
          'PDF.js қолжетімді емес — әр бет жеке PDF ретінде жүктеледі. Толық сурет конвертациясы үшін "pdfjs-dist" пакетін орнатыңыз.',
          'PDF.js недоступен — каждая страница будет скачана как отдельный PDF. Для полной конвертации в изображения установите пакет "pdfjs-dist".'
        ))
      } catch (e) {
        setError(L('Конвертация кезінде қате болды', 'Ошибка при конвертации'))
        console.error(e)
      }
    } finally {
      setLoading(false)
    }
  }, [file, pages, quality, format, lang])

  const handleDownloadOne = useCallback((item: { pageNum: number; blob: Blob }) => {
    const ext = item.blob.type === 'application/pdf' ? 'pdf' : format
    const name = file ? file.name.replace(/\.pdf$/i, '') : 'page'
    downloadBlob(item.blob, `${name}_page${item.pageNum}.${ext}`)
  }, [file, format])

  const handleDownloadAll = useCallback(async () => {
    // Download each image individually (simple approach without zip)
    for (const item of convertedImages) {
      handleDownloadOne(item)
      // Small delay to not overwhelm browser
      await new Promise(r => setTimeout(r, 200))
    }
  }, [convertedImages, handleDownloadOne])

  const qualityOptions: { key: Quality; label: [string, string] }[] = [
    { key: 'low', label: ['Төмен (жылдам)', 'Низкое (быстро)'] },
    { key: 'medium', label: ['Орташа', 'Среднее'] },
    { key: 'high', label: ['Жоғары', 'Высокое'] },
  ]

  return (
    <div className="space-y-4">
      <PdfUploader
        onFiles={handleFiles}
        label={L('PDF файлды таңдаңыз', 'Выберите PDF файл')}
      />

      {file && pages.length > 0 && (
        <>
          {/* File info */}
          <div className="p-3 rounded-xl bg-accent/30 text-sm flex items-center gap-2">
            <span>📄</span>
            <span className="font-semibold">{file.name}</span>
            <span className="text-muted-foreground">
              — {pages.length} {L('бет', 'стр.')} ({formatFileSize(file.size)})
            </span>
          </div>

          {/* Options */}
          <div className="space-y-4">
            {/* Quality */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                {L('Сапа', 'Качество')}
              </label>
              <div className="flex gap-2">
                {qualityOptions.map(q => (
                  <button
                    key={q.key}
                    onClick={() => setQuality(q.key)}
                    className={`flex-1 px-3 py-2 rounded-full text-sm font-semibold transition-all min-h-[44px] ${
                      quality === q.key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border text-muted-foreground hover:border-primary'
                    }`}
                  >
                    {L(q.label[0], q.label[1])}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                {L('Формат', 'Формат')}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFormat('jpg')}
                  className={`flex-1 px-4 py-2 rounded-full text-sm font-semibold transition-all min-h-[44px] ${
                    format === 'jpg'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-muted-foreground hover:border-primary'
                  }`}
                >
                  JPG
                </button>
                <button
                  onClick={() => setFormat('png')}
                  className={`flex-1 px-4 py-2 rounded-full text-sm font-semibold transition-all min-h-[44px] ${
                    format === 'png'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-muted-foreground hover:border-primary'
                  }`}
                >
                  PNG
                </button>
              </div>
            </div>

            {/* Page dimensions info */}
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                {L('Беттер ақпараты', 'Информация о страницах')}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-[120px] overflow-y-auto">
                {pages.map(p => (
                  <div key={p.index} className="text-[10px] text-muted-foreground bg-accent/20 rounded-lg px-2 py-1 text-center">
                    <span className="font-semibold">{p.index + 1}</span>
                    <span className="mx-1">—</span>
                    <span>{Math.round(p.width)}x{Math.round(p.height)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Progress */}
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

      {/* Convert button */}
      <button
        onClick={handleConvert}
        disabled={loading || !file || pages.length === 0}
        className="w-full py-3 px-6 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
        {loading
          ? L('Конвертациялануда...', 'Конвертация...')
          : L(`${format.toUpperCase()} суреттерге айналдыру`, `Конвертировать в ${format.toUpperCase()}`)}
      </button>

      {/* Results */}
      {convertedImages.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {convertedImages.length} {L('сурет дайын', 'изображений готово')}
            </p>
            {convertedImages.length > 1 && (
              <button
                onClick={handleDownloadAll}
                className="px-4 py-2 rounded-full text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-all min-h-[44px] flex items-center gap-1.5"
              >
                <span>⬇️</span> {L('Барлығын жүктеу', 'Скачать все')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {convertedImages.map(item => (
              <div key={item.pageNum} className="relative group">
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-accent/30 border border-border flex items-center justify-center">
                  {item.blob.type === 'application/pdf' ? (
                    <div className="text-center p-2">
                      <div className="text-3xl mb-1">📄</div>
                      <p className="text-[10px] text-muted-foreground">{L('Бет', 'Стр.')} {item.pageNum}</p>
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.dataUrl}
                      alt={`Page ${item.pageNum}`}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-muted-foreground">
                    {L('Бет', 'Стр.')} {item.pageNum} ({formatFileSize(item.blob.size)})
                  </p>
                  <button
                    onClick={() => handleDownloadOne(item)}
                    className="text-[10px] text-primary font-semibold hover:underline"
                  >
                    ⬇️ {L('Жүктеу', 'Скачать')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
