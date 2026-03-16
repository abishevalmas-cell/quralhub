'use client'
import { useState, useCallback } from 'react'
import { useApp } from '@/components/layout/Providers'
import { PdfUploader } from './PdfUploader'
import { loadPdf, savePdf, downloadPdf, formatFileSize } from '@/lib/pdf/pdfUtils'

type Quality = 'low' | 'medium' | 'high'

export function CompressPdf() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [file, setFile] = useState<File | null>(null)
  const [quality, setQuality] = useState<Quality>('medium')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ original: number; compressed: number } | null>(null)

  const handleFiles = useCallback((files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setError('')
    setResult(null)
  }, [])

  const handleCompress = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      // pdf-lib re-save strips unused objects; we set different options per quality
      const doc = await loadPdf(file)

      // Remove metadata for lower quality settings
      if (quality === 'low' || quality === 'medium') {
        doc.setTitle('')
        doc.setAuthor('')
        doc.setSubject('')
        doc.setKeywords([])
        doc.setProducer('')
        doc.setCreator('')
      }

      const bytes = await savePdf(doc)
      const compressed = bytes.length

      setResult({ original: file.size, compressed })
      downloadPdf(bytes, `compressed_${file.name}`)
    } catch (e) {
      setError(L('PDF сығу кезінде қате болды', 'Ошибка при сжатии PDF'))
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [file, quality, lang])

  const qualityLabels: Record<Quality, [string, string]> = {
    low: ['Төмен (максимал сығу)', 'Низкое (макс. сжатие)'],
    medium: ['Орташа (балансты)', 'Среднее (баланс)'],
    high: ['Жоғары (мин. сығу)', 'Высокое (мин. сжатие)'],
  }

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
        <p className="text-xs font-semibold text-muted-foreground">{L('Сапа деңгейі', 'Уровень качества')}:</p>
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
      </div>

      {result && (
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200/30 dark:border-green-800/30 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{L('Бастапқы көлем', 'Исходный размер')}:</span>
            <span className="font-semibold">{formatFileSize(result.original)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{L('Сығылған көлем', 'Сжатый размер')}:</span>
            <span className="font-semibold text-green-700 dark:text-green-300">{formatFileSize(result.compressed)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{L('Үнемдеу', 'Экономия')}:</span>
            <span className="font-semibold">
              {result.compressed < result.original
                ? `${Math.round((1 - result.compressed / result.original) * 100)}%`
                : L('Өзгеріс жоқ', 'Без изменений')}
            </span>
          </div>
        </div>
      )}

      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-[13px] text-amber-800 dark:text-amber-200 leading-relaxed border border-amber-200/30 dark:border-amber-800/30">
        {L(
          'PDF сығу — файлдан пайдаланылмаған объектілерді жояды. Суреті көп PDF-тер аз ғана кішірейуі мүмкін.',
          'Сжатие PDF удаляет неиспользуемые объекты из файла. PDF с множеством изображений могут сжаться незначительно.'
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleCompress}
        disabled={loading || !file}
        className="w-full py-3 px-6 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
        {loading
          ? L('Сығылуда...', 'Сжатие...')
          : L('Сығу және жүктеу', 'Сжать и скачать')}
      </button>
    </div>
  )
}
