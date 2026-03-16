'use client'
import { useState, useCallback } from 'react'
import { useApp } from '@/components/layout/Providers'
import { PdfUploader } from './PdfUploader'
import { formatFileSize } from '@/lib/pdf/pdfUtils'

type Quality = 'low' | 'medium' | 'high'

// Quality presets: scale for rendering, JPEG quality for encoding
const QUALITY_CONFIG: Record<Quality, { scale: number; jpegQuality: number }> = {
  low: { scale: 0.75, jpegQuality: 0.5 },
  medium: { scale: 1.0, jpegQuality: 0.7 },
  high: { scale: 1.5, jpegQuality: 0.85 },
}

export function CompressPdf() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [file, setFile] = useState<File | null>(null)
  const [quality, setQuality] = useState<Quality>('medium')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ original: number; compressed: number } | null>(null)

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0] || null)
    setError('')
    setResult(null)
    setProgress('')
  }, [])

  const handleCompress = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    setProgress(L('PDF оқылуда...', 'Чтение PDF...'))

    try {
      const config = QUALITY_CONFIG[quality]
      const buffer = await file.arrayBuffer()

      // Step 1: Render each page to canvas using pdfjs-dist
      setProgress(L('Беттер рендерленуде...', 'Рендеринг страниц...'))

      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      const numPages = pdf.numPages

      // Collect page renders as JPEG data URLs with dimensions
      const pageRenders: { dataUrl: string; width: number; height: number }[] = []

      for (let i = 0; i < numPages; i++) {
        setProgress(L(
          `Бет ${i + 1}/${numPages} рендерленуде...`,
          `Рендеринг страницы ${i + 1}/${numPages}...`
        ))

        const page = await pdf.getPage(i + 1)
        const viewport = page.getViewport({ scale: config.scale })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!

        // White background for JPEG (no transparency)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        await (page.render({ canvasContext: ctx, viewport } as any)).promise
        const dataUrl = canvas.toDataURL('image/jpeg', config.jpegQuality)
        pageRenders.push({
          dataUrl,
          width: viewport.width,
          height: viewport.height,
        })
      }

      // Step 2: Create new PDF with jsPDF, adding each rendered page as JPEG image
      setProgress(L('Жаңа PDF құрылуда...', 'Создание нового PDF...'))

      const { jsPDF } = await import('jspdf')

      // Use first page dimensions (in pt, divide by scale to get original size)
      const firstPage = pageRenders[0]
      const firstW = firstPage.width / config.scale
      const firstH = firstPage.height / config.scale

      const doc = new jsPDF({
        orientation: firstW > firstH ? 'l' : 'p',
        unit: 'pt',
        format: [firstW, firstH],
      })

      for (let i = 0; i < pageRenders.length; i++) {
        const pr = pageRenders[i]
        const pageW = pr.width / config.scale
        const pageH = pr.height / config.scale

        if (i > 0) {
          doc.addPage([pageW, pageH], pageW > pageH ? 'l' : 'p')
        }

        doc.addImage(pr.dataUrl, 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST')
      }

      const pdfOutput = doc.output('arraybuffer')
      const compressed = pdfOutput.byteLength

      setResult({ original: file.size, compressed })

      // Download the compressed PDF
      const blob = new Blob([pdfOutput], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `compressed_${file.name}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(L('PDF сығу кезінде қате болды', 'Ошибка при сжатии PDF'))
      console.error(e)
    } finally {
      setLoading(false)
      setProgress('')
    }
  }, [file, quality, lang])

  const qualityLabels: Record<Quality, [string, string]> = {
    low: ['Төмен (макс. сығу)', 'Низкое (макс. сжатие)'],
    medium: ['Орташа (баланс)', 'Среднее (баланс)'],
    high: ['Жоғары (мин. сығу)', 'Высокое (мин. сжатие)'],
  }

  const savings = result ? Math.round((1 - result.compressed / result.original) * 100) : 0

  return (
    <div className="space-y-4">
      <PdfUploader
        onFiles={handleFiles}
        label={L('PDF файлды таңдаңыз', 'Выберите PDF файл')}
      />

      {file && (
        <div className="p-3 rounded-xl bg-accent/30 text-sm flex items-center gap-2">
          <span>📄</span>
          <span className="font-semibold truncate">{file.name}</span>
          <span className="text-muted-foreground shrink-0">({formatFileSize(file.size)})</span>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">{L('Сығу деңгейі', 'Уровень сжатия')}:</p>
        <div className="flex gap-2 flex-wrap">
          {(['low', 'medium', 'high'] as Quality[]).map(q => (
            <button
              key={q}
              onClick={() => setQuality(q)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all min-h-[44px] ${
                quality === q
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:border-primary'
              }`}
            >
              {L(qualityLabels[q][0], qualityLabels[q][1])}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
          <span className="text-center">{L('Кіші файл', 'Маленький файл')}</span>
          <span className="text-center">{L('Баланс', 'Баланс')}</span>
          <span className="text-center">{L('Жақсы сапа', 'Хорошее качество')}</span>
        </div>
      </div>

      {result && (
        <div className={`p-4 rounded-xl border space-y-2 ${
          savings > 5
            ? 'bg-green-50 dark:bg-green-950/30 border-green-200/30 dark:border-green-800/30'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200/30 dark:border-amber-800/30'
        }`}>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{L('Бастапқы', 'Исходный')}:</span>
            <span className="font-semibold">{formatFileSize(result.original)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{L('Сығылған', 'Сжатый')}:</span>
            <span className="font-semibold text-green-700 dark:text-green-300">{formatFileSize(result.compressed)}</span>
          </div>
          {/* Visual bar */}
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${Math.max(5, 100 - savings)}%` }}
            />
          </div>
          <div className="text-center">
            {savings > 5 ? (
              <span className="text-sm font-bold text-green-700 dark:text-green-300">
                -{savings}% ({formatFileSize(result.original - result.compressed)} {L('үнемделді', 'сэкономлено')})
              </span>
            ) : savings > 0 ? (
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                -{savings}% — {L('аздап сығылды', 'незначительное сжатие')}
              </span>
            ) : (
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                {L('Файл өлшемі ұлғайды. Жоғары сападағы сығуды қолданыңыз.', 'Размер файла увеличился. Попробуйте более сильное сжатие.')}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="p-3 rounded-xl bg-muted/50 text-[12px] text-muted-foreground leading-relaxed">
        {L(
          'Әр бет сурет ретінде қайта кодталады — нақты файл өлшемін кішірейтеді. Суреті көп PDF файлдар 30-70% кішірейеді. Мәтін іздеу мүмкіндігі жоғалуы мүмкін.',
          'Каждая страница перекодируется как изображение — реально уменьшает размер файла. PDF с изображениями уменьшатся на 30-70%. Возможность поиска текста может быть утеряна.'
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">{error}</div>
      )}

      <button
        onClick={handleCompress}
        disabled={loading || !file}
        className="w-full py-3 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
        {loading
          ? progress || L('Сығылуда...', 'Сжатие...')
          : L('Сығу және жүктеу', 'Сжать и скачать')}
      </button>
    </div>
  )
}
