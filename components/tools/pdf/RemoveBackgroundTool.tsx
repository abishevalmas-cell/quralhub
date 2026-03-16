'use client'
import { useState, useCallback, useRef } from 'react'
import { useApp } from '@/components/layout/Providers'
import { PdfUploader } from './PdfUploader'
import { removeBackground } from '@/lib/pdf/removeBackground'
import { downloadBlob, formatFileSize } from '@/lib/pdf/pdfUtils'

type ViewMode = 'side-by-side' | 'before' | 'after'

export function RemoveBackgroundTool() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [file, setFile] = useState<File | null>(null)
  const [originalPreview, setOriginalPreview] = useState('')
  const [resultPreview, setResultPreview] = useState('')
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [threshold, setThreshold] = useState(220)
  const [loading, setLoading] = useState(false)
  const [processed, setProcessed] = useState(false)
  const [error, setError] = useState('')
  const [resultSize, setResultSize] = useState({ w: 0, h: 0 })
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side')
  const [autoCrop, setAutoCrop] = useState(false)

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setError('')
    setProcessed(false)
    setResultPreview('')
    setResultBlob(null)

    // Create preview using Promise to ensure image loads
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(f)
    })
    setOriginalPreview(dataUrl)
  }, [])

  const handleRemove = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const result = await removeBackground(file, { threshold })

      if (autoCrop) {
        // Auto-crop transparent edges
        const cropped = await autoCropImage(result.dataUrl)
        setResultPreview(cropped.dataUrl)
        setResultBlob(cropped.blob)
        setResultSize({ w: cropped.width, h: cropped.height })
      } else {
        setResultPreview(result.dataUrl)
        setResultBlob(result.blob)
        setResultSize({ w: result.width, h: result.height })
      }
      setProcessed(true)
    } catch (e) {
      setError(L('Фонды алу кезінде қате болды', 'Ошибка при удалении фона'))
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [file, threshold, autoCrop, lang])

  const handleDownload = useCallback(() => {
    if (!resultBlob || !file) return
    const name = file.name.replace(/\.[^.]+$/, '') + '_nobg.png'
    downloadBlob(resultBlob, name)
  }, [resultBlob, file])

  const handleUseInEditor = useCallback(() => {
    if (!resultPreview) return
    localStorage.setItem('quralhub_stamp_image', resultPreview)
    // Navigate to PDF Editor tool — trigger parent to switch tool
    // First try parent callback, then fallback to scroll + alert
    const event = new CustomEvent('switch-pdf-tool', { detail: 'edit' })
    window.dispatchEvent(event)
    setError('')
    alert(L(
      'Сурет сақталды! PDF Редакторын ашыңыз — автоматты түрде қосылады.',
      'Изображение сохранено! Откройте PDF Редактор — оно будет добавлено автоматически.'
    ))
  }, [resultPreview, lang])

  // Checkered transparency background CSS
  const checkerBg = {
    backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)',
    backgroundSize: '12px 12px',
    backgroundPosition: '0 0, 6px 6px',
    backgroundColor: '#eee',
  }

  return (
    <div className="space-y-4">
      <PdfUploader
        accept="image/*"
        onFiles={handleFiles}
        label={L('Суретті таңдаңыз (печать/қолтаңба фотосы)', 'Выберите изображение (фото печати/подписи)')}
      />

      {file && originalPreview && (
        <>
          {/* View mode toggle */}
          {processed && resultPreview && (
            <div className="flex gap-2 flex-wrap">
              {([
                ['side-by-side', L('Қатар', 'Рядом')],
                ['before', L('Бұрын', 'До')],
                ['after', L('Кейін', 'После')],
              ] as [ViewMode, string][]).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all min-h-[36px] ${
                    viewMode === mode
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-muted-foreground hover:border-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Previews */}
          <div className={`grid gap-3 ${
            viewMode === 'side-by-side' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
          }`}>
            {/* Original */}
            {(viewMode === 'side-by-side' || viewMode === 'before') && (
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
            )}

            {/* Result */}
            {(viewMode === 'side-by-side' || viewMode === 'after') && (
              <div className="bg-card border border-border rounded-xl p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  {L('Нәтиже', 'Результат')}
                </p>
                <div
                  className="aspect-square rounded-lg overflow-hidden flex items-center justify-center"
                  style={checkerBg}
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
            )}
          </div>

          {/* Threshold slider */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              {L('Сезімталдық деңгейі', 'Порог чувствительности')}: {threshold}
            </label>
            <input
              type="range"
              min={180}
              max={255}
              value={threshold}
              onChange={e => { setThreshold(parseInt(e.target.value)); setProcessed(false) }}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>{L('Аз (180)', 'Мало (180)')}</span>
              <span>{L('Көп (255)', 'Много (255)')}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {L(
                'Жоғарырақ мән — көбірек ақ түс алынады. Печать/қолтаңба үшін 210-230 ұсынылады.',
                'Чем выше значение — тем больше белого удаляется. Для печатей/подписей рекомендуется 210-230.'
              )}
            </p>
          </div>

          {/* Auto-crop toggle */}
          <label className="flex items-center gap-3 cursor-pointer p-3 bg-card border border-border rounded-xl">
            <input
              type="checkbox"
              checked={autoCrop}
              onChange={e => { setAutoCrop(e.target.checked); setProcessed(false) }}
              className="w-4 h-4 accent-primary rounded"
            />
            <div>
              <p className="text-sm font-semibold">
                {L('Автоматты қию', 'Автообрезка')}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {L(
                  'Мөлдір шеттерді алып тастау (тек печать/қолтаңба қалады)',
                  'Обрезать прозрачные края (останется только печать/подпись)'
                )}
              </p>
            </div>
          </label>
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
          : processed
            ? L('Қайта өңдеу', 'Обработать снова')
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

/** Auto-crop transparent edges from a data URL image */
async function autoCropImage(dataUrl: string): Promise<{ dataUrl: string; blob: Blob; width: number; height: number }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = reject
    el.src = dataUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { data, width, height } = imageData

  let top = height, bottom = 0, left = width, right = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > 10) {
        if (y < top) top = y
        if (y > bottom) bottom = y
        if (x < left) left = x
        if (x > right) right = x
      }
    }
  }

  // No visible content found — return original
  if (bottom <= top || right <= left) {
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(b => resolve(b!), 'image/png')
    })
    return { dataUrl, blob, width: canvas.width, height: canvas.height }
  }

  const padding = 4
  const cropX = Math.max(0, left - padding)
  const cropY = Math.max(0, top - padding)
  const cropW = Math.min(width - cropX, right - left + 1 + padding * 2)
  const cropH = Math.min(height - cropY, bottom - top + 1 + padding * 2)

  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = cropW
  cropCanvas.height = cropH
  const cropCtx = cropCanvas.getContext('2d')!
  cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

  const croppedDataUrl = cropCanvas.toDataURL('image/png')
  const croppedBlob = await new Promise<Blob>((resolve) => {
    cropCanvas.toBlob(b => resolve(b!), 'image/png')
  })

  return { dataUrl: croppedDataUrl, blob: croppedBlob, width: cropW, height: cropH }
}
