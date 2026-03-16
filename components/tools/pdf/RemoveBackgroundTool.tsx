'use client'
import { useState, useCallback, useRef } from 'react'
import { useApp } from '@/components/layout/Providers'
import { PdfUploader } from './PdfUploader'
import { removeBackground } from '@/lib/pdf/removeBackground'
import { downloadBlob, formatFileSize } from '@/lib/pdf/pdfUtils'

export function RemoveBackgroundTool() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [file, setFile] = useState<File | null>(null)
  const [originalPreview, setOriginalPreview] = useState('')
  const [resultPreview, setResultPreview] = useState('')
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [threshold, setThreshold] = useState(230)
  const [loading, setLoading] = useState(false)
  const [processed, setProcessed] = useState(false)
  const [error, setError] = useState('')
  const [resultSize, setResultSize] = useState({ w: 0, h: 0 })

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setError('')
    setProcessed(false)
    setResultPreview('')
    setResultBlob(null)

    // Create preview
    const reader = new FileReader()
    reader.onload = () => setOriginalPreview(reader.result as string)
    reader.readAsDataURL(f)
  }, [])

  const handleRemove = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const result = await removeBackground(file, { threshold })
      setResultPreview(result.dataUrl)
      setResultBlob(result.blob)
      setResultSize({ w: result.width, h: result.height })
      setProcessed(true)
    } catch (e) {
      setError(L('Фонды алу кезінде қате болды', 'Ошибка при удалении фона'))
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [file, threshold, lang])

  const handleDownload = useCallback(() => {
    if (!resultBlob || !file) return
    const name = file.name.replace(/\.[^.]+$/, '') + '_nobg.png'
    downloadBlob(resultBlob, name)
  }, [resultBlob, file])

  const handleUseInEditor = useCallback(() => {
    if (!resultPreview) return
    localStorage.setItem('quralhub_stamp_image', resultPreview)
    // Show notification
    setError('')
    alert(L(
      'Сурет сақталды! PDF Редакторын ашыңыз — автоматты түрде қосылады.',
      'Изображение сохранено! Откройте PDF Редактор — оно будет добавлено автоматически.'
    ))
  }, [resultPreview, lang])

  return (
    <div className="space-y-4">
      <PdfUploader
        accept="image/*"
        onFiles={handleFiles}
        label={L('Суретті таңдаңыз (печать/қолтаңба фотосы)', 'Выберите изображение (фото печати/подписи)')}
      />

      {file && originalPreview && (
        <>
          {/* Previews: original vs result */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Original */}
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                {L('Түпнұсқа', 'Оригинал')}
              </p>
              <div className="aspect-square rounded-lg overflow-hidden bg-accent/30 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={originalPreview}
                  alt="Original"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 truncate">
                {file.name} ({formatFileSize(file.size)})
              </p>
            </div>

            {/* Result */}
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                {L('Нәтиже', 'Результат')}
              </p>
              <div
                className="aspect-square rounded-lg overflow-hidden flex items-center justify-center"
                style={{
                  backgroundImage: 'linear-gradient(45deg, #e0e0e0 25%, transparent 25%, transparent 75%, #e0e0e0 75%), linear-gradient(45deg, #e0e0e0 25%, transparent 25%, transparent 75%, #e0e0e0 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 8px 8px',
                  backgroundColor: '#f5f5f5',
                }}
              >
                {resultPreview ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={resultPreview}
                    alt="Result"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <p className="text-xs text-muted-foreground text-center px-4">
                    {L('Фонды алу басыңыз', 'Нажмите удалить фон')}
                  </p>
                )}
              </div>
              {processed && resultBlob && (
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  PNG — {resultSize.w}x{resultSize.h}px ({formatFileSize(resultBlob.size)})
                </p>
              )}
            </div>
          </div>

          {/* Threshold slider */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              {L('Сезімталдық деңгейі', 'Порог чувствительности')}: {threshold}
            </label>
            <input
              type="range"
              min={200}
              max={255}
              value={threshold}
              onChange={e => { setThreshold(parseInt(e.target.value)); setProcessed(false) }}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>{L('Аз (200)', 'Мало (200)')}</span>
              <span>{L('Көп (255)', 'Много (255)')}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {L(
                'Жоғарырақ мән — көбірек ақ түс алынады. Печать/қолтаңба үшін 220-240 ұсынылады.',
                'Чем выше значение — тем больше белого удаляется. Для печатей/подписей рекомендуется 220-240.'
              )}
            </p>
          </div>
        </>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Remove BG button */}
      <button
        onClick={handleRemove}
        disabled={loading || !file}
        className="w-full py-3 px-6 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
        {loading
          ? L('Өңделуде...', 'Обработка...')
          : L('Фонды алу', 'Удалить фон')}
      </button>

      {/* Download & Use in Editor buttons */}
      {processed && resultBlob && (
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 py-3 px-6 rounded-full text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-all min-h-[44px] flex items-center justify-center gap-2"
          >
            <span>⬇️</span> {L('PNG жүктеу', 'Скачать PNG')}
          </button>
          <button
            onClick={handleUseInEditor}
            className="flex-1 py-3 px-6 rounded-full text-sm font-semibold bg-card border border-border hover:border-primary transition-all min-h-[44px] flex items-center justify-center gap-2"
          >
            <span>✏️</span> {L('PDF Редакторда қолдану', 'Использовать в PDF Редакторе')}
          </button>
        </div>
      )}
    </div>
  )
}
