'use client'
import { useState, useCallback } from 'react'
import { useApp } from '@/components/layout/Providers'
import { PdfUploader } from './PdfUploader'
import { rotatePdf, rotateAllPages } from '@/lib/pdf/rotate'
import { getPageCount, downloadPdf } from '@/lib/pdf/pdfUtils'

type RotateMode = 'all' | 'select'
type Angle = 90 | 180 | 270

export function RotatePdf() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [mode, setMode] = useState<RotateMode>('all')
  const [angle, setAngle] = useState<Angle>(90)
  const [pagesInput, setPagesInput] = useState('')
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

  const parsePageIndices = (input: string): number[] => {
    const indices: number[] = []
    const parts = input.split(',').map(s => s.trim()).filter(Boolean)
    for (const part of parts) {
      if (part.includes('-')) {
        const [fromStr, toStr] = part.split('-').map(s => s.trim())
        const from = parseInt(fromStr)
        const to = parseInt(toStr)
        if (!isNaN(from) && !isNaN(to)) {
          for (let i = from; i <= to && i <= pageCount; i++) {
            if (i >= 1) indices.push(i - 1) // convert to 0-based
          }
        }
      } else {
        const num = parseInt(part)
        if (!isNaN(num) && num >= 1 && num <= pageCount) {
          indices.push(num - 1) // convert to 0-based
        }
      }
    }
    return [...new Set(indices)]
  }

  const handleRotate = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      let bytes: Uint8Array
      if (mode === 'all') {
        bytes = await rotateAllPages(file, angle)
      } else {
        const indices = parsePageIndices(pagesInput)
        if (indices.length === 0) {
          setError(L('Бет нөмірлерін дұрыс енгізіңіз', 'Введите корректные номера страниц'))
          setLoading(false)
          return
        }
        bytes = await rotatePdf(file, indices, angle)
      }
      downloadPdf(bytes, `rotated_${file.name}`)
    } catch (e) {
      setError(L('PDF бұру кезінде қате болды', 'Ошибка при повороте PDF'))
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [file, mode, angle, pagesInput, pageCount, lang])

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

          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground">{L('Бұру режимі', 'Режим поворота')}:</p>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('all')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all min-h-[44px] ${
                  mode === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-muted-foreground hover:border-primary'
                }`}
              >
                {L('Барлық беттер', 'Все страницы')}
              </button>
              <button
                onClick={() => setMode('select')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all min-h-[44px] ${
                  mode === 'select'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-muted-foreground hover:border-primary'
                }`}
              >
                {L('Таңдалған беттер', 'Выбранные страницы')}
              </button>
            </div>

            {mode === 'select' && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  {L('Бет нөмірлері (мыс. 1, 3, 5-7)', 'Номера страниц (напр. 1, 3, 5-7)')}
                </label>
                <input
                  type="text"
                  value={pagesInput}
                  onChange={e => setPagesInput(e.target.value)}
                  placeholder="1, 3, 5-7"
                  className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
                />
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">{L('Бұрылыс бұрышы', 'Угол поворота')}:</p>
              <div className="flex gap-2">
                {([90, 180, 270] as Angle[]).map(a => (
                  <button
                    key={a}
                    onClick={() => setAngle(a)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all min-h-[44px] ${
                      angle === a
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border text-muted-foreground hover:border-primary'
                    }`}
                  >
                    {a}°
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
        onClick={handleRotate}
        disabled={loading || !file}
        className="w-full py-3 px-6 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
        {loading
          ? L('Бұрылуда...', 'Поворот...')
          : L('Бұру және жүктеу', 'Повернуть и скачать')}
      </button>
    </div>
  )
}
