'use client'
import { useState, useCallback } from 'react'
import { useApp } from '@/components/layout/Providers'
import { PdfUploader } from './PdfUploader'
import { addWatermark } from '@/lib/pdf/watermark'
import { getPageCount, downloadPdf } from '@/lib/pdf/pdfUtils'

interface ColorOption {
  label: [string, string]
  value: { r: number; g: number; b: number }
  preview: string
}

const COLORS: ColorOption[] = [
  { label: ['Сұр', 'Серый'], value: { r: 0.5, g: 0.5, b: 0.5 }, preview: 'bg-gray-400' },
  { label: ['Қызыл', 'Красный'], value: { r: 0.8, g: 0.1, b: 0.1 }, preview: 'bg-red-500' },
  { label: ['Көк', 'Синий'], value: { r: 0.1, g: 0.2, b: 0.8 }, preview: 'bg-blue-600' },
]

export function WatermarkPdf() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [text, setText] = useState('')
  const [opacity, setOpacity] = useState(0.2)
  const [rotation, setRotation] = useState(-45)
  const [fontSize, setFontSize] = useState(50)
  const [colorIdx, setColorIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setError('')
    try {
      const count = await getPageCount(f)
      setPageCount(count)
    } catch {
      setError(L('PDF файлды оқу мүмкін болмады', 'Не удалось прочитать PDF файл'))
    }
  }, [lang])

  const handleWatermark = useCallback(async () => {
    if (!file || !text.trim()) return
    setLoading(true)
    setError('')
    try {
      const bytes = await addWatermark(file, {
        text: text.trim(),
        fontSize,
        opacity,
        rotation,
        color: COLORS[colorIdx].value,
      })
      downloadPdf(bytes, `watermarked_${file.name}`)
    } catch (e) {
      setError(L('Су белгі қосу кезінде қате болды', 'Ошибка при добавлении водяного знака'))
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [file, text, fontSize, opacity, rotation, colorIdx, lang])

  return (
    <div className="space-y-4">
      <PdfUploader
        onFiles={handleFiles}
        label={L('PDF файлды таңдаңыз', 'Выберите PDF файл')}
      />

      {file && pageCount > 0 && (
        <>
          <div className="p-3 rounded-xl bg-accent/30 text-sm flex items-center gap-2">
            <span>📄</span>
            <span className="font-semibold">{file.name}</span>
            <span className="text-muted-foreground">— {pageCount} {L('бет', 'стр.')}</span>
          </div>

          <div className="space-y-4">
            {/* Watermark text */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                {L('Су белгі мәтіні', 'Текст водяного знака')}
              </label>
              <input
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={L('мыс. ҚҰПИЯ', 'напр. КОНФИДЕНЦИАЛЬНО')}
                className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
              />
            </div>

            {/* Opacity slider */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                {L('Мөлдірлік', 'Прозрачность')}: {Math.round(opacity * 100)}%
              </label>
              <input
                type="range"
                min={10}
                max={50}
                value={opacity * 100}
                onChange={e => setOpacity(parseInt(e.target.value) / 100)}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>10%</span>
                <span>50%</span>
              </div>
            </div>

            {/* Rotation */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                {L('Бұрылыс бұрышы', 'Угол поворота')}: {rotation}°
              </label>
              <input
                type="range"
                min={-90}
                max={90}
                value={rotation}
                onChange={e => setRotation(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>-90°</span>
                <span>0°</span>
                <span>90°</span>
              </div>
            </div>

            {/* Font size */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                {L('Шрифт өлшемі', 'Размер шрифта')}: {fontSize}px
              </label>
              <input
                type="range"
                min={20}
                max={100}
                value={fontSize}
                onChange={e => setFontSize(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>20px</span>
                <span>100px</span>
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                {L('Түсі', 'Цвет')}
              </label>
              <div className="flex gap-2">
                {COLORS.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setColorIdx(i)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all min-h-[44px] ${
                      colorIdx === i
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border text-muted-foreground hover:border-primary'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${c.preview}`} />
                    {L(c.label[0], c.label[1])}
                  </button>
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

      <button
        onClick={handleWatermark}
        disabled={loading || !file || !text.trim()}
        className="w-full py-3 px-6 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
        {loading
          ? L('Қосылуда...', 'Добавление...')
          : L('Су белгі қосу және жүктеу', 'Добавить водяной знак и скачать')}
      </button>
    </div>
  )
}
