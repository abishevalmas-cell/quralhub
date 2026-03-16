'use client'
import { useState, useCallback } from 'react'
import { useApp } from '@/components/layout/Providers'
import { PdfUploader } from './PdfUploader'
import { addPageNumbers, type PageNumberOptions } from '@/lib/pdf/pageNumbers'
import { getPageCount, downloadPdf } from '@/lib/pdf/pdfUtils'

type Position = PageNumberOptions['position']

export function PageNumbersPdf() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [position, setPosition] = useState<Position>('bottom-center')
  const [startFrom, setStartFrom] = useState(1)
  const [prefix, setPrefix] = useState('')
  const [fontSize, setFontSize] = useState(12)
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

  const handleAddNumbers = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const bytes = await addPageNumbers(file, {
        position,
        startFrom,
        fontSize,
        prefix: prefix || undefined,
      })
      downloadPdf(bytes, `numbered_${file.name}`)
    } catch (e) {
      setError(L('Бет нөмірлерін қосу кезінде қате болды', 'Ошибка при добавлении нумерации'))
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [file, position, startFrom, fontSize, prefix, lang])

  const positionLabels: Record<Position, [string, string]> = {
    'bottom-center': ['Төменгі ортасы', 'Внизу по центру'],
    'bottom-right': ['Төменгі оң жағы', 'Внизу справа'],
    'bottom-left': ['Төменгі сол жағы', 'Внизу слева'],
    'top-center': ['Жоғарғы ортасы', 'Вверху по центру'],
    'top-right': ['Жоғарғы оң жағы', 'Вверху справа'],
  }

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
            {/* Position */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                {L('Орналасуы', 'Расположение')}
              </label>
              <select
                value={position}
                onChange={e => setPosition(e.target.value as Position)}
                className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
              >
                {(Object.keys(positionLabels) as Position[]).map(pos => (
                  <option key={pos} value={pos}>
                    {L(positionLabels[pos][0], positionLabels[pos][1])}
                  </option>
                ))}
              </select>
            </div>

            {/* Start number */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                {L('Бастапқы нөмір', 'Начальный номер')}
              </label>
              <input
                type="number"
                min={1}
                value={startFrom}
                onChange={e => setStartFrom(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
              />
            </div>

            {/* Prefix */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                {L('Префикс (міндетті емес)', 'Префикс (необязательно)')}
              </label>
              <input
                type="text"
                value={prefix}
                onChange={e => setPrefix(e.target.value)}
                placeholder={L('мыс. "Бет " немесе "- "', 'напр. "Стр. " или "- "')}
                className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
              />
            </div>

            {/* Font size */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                {L('Шрифт өлшемі', 'Размер шрифта')}: {fontSize}px
              </label>
              <input
                type="range"
                min={8}
                max={24}
                value={fontSize}
                onChange={e => setFontSize(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>8px</span>
                <span>24px</span>
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
        onClick={handleAddNumbers}
        disabled={loading || !file}
        className="w-full py-3 px-6 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
        {loading
          ? L('Қосылуда...', 'Добавление...')
          : L('Нөмірлеу және жүктеу', 'Пронумеровать и скачать')}
      </button>
    </div>
  )
}
