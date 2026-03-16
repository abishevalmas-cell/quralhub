'use client'
import { useState, useCallback } from 'react'
import { useApp } from '@/components/layout/Providers'
import { PdfUploader } from './PdfUploader'
import { splitPdf, splitPdfAllPages, type SplitRange } from '@/lib/pdf/split'
import { getPageCount, downloadPdf } from '@/lib/pdf/pdfUtils'

type SplitMode = 'all' | 'custom'

export function SplitPdf() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [mode, setMode] = useState<SplitMode>('all')
  const [rangeInput, setRangeInput] = useState('')
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

  const parseRanges = (input: string): SplitRange[] => {
    const ranges: SplitRange[] = []
    const parts = input.split(',').map(s => s.trim()).filter(Boolean)
    for (const part of parts) {
      if (part.includes('-')) {
        const [fromStr, toStr] = part.split('-').map(s => s.trim())
        const from = parseInt(fromStr)
        const to = parseInt(toStr)
        if (!isNaN(from) && !isNaN(to) && from >= 1 && to >= from && to <= pageCount) {
          ranges.push({ from, to })
        }
      } else {
        const num = parseInt(part)
        if (!isNaN(num) && num >= 1 && num <= pageCount) {
          ranges.push({ from: num, to: num })
        }
      }
    }
    return ranges
  }

  const handleSplit = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      if (mode === 'all') {
        const results = await splitPdfAllPages(file)
        for (const r of results) {
          downloadPdf(r.bytes, r.name)
          // Small delay between downloads to avoid browser blocking
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      } else {
        const ranges = parseRanges(rangeInput)
        if (ranges.length === 0) {
          setError(L('Дұрыс аралықтарды енгізіңіз (мыс. 1-3, 5-7)', 'Введите корректные диапазоны (напр. 1-3, 5-7)'))
          setLoading(false)
          return
        }
        const results = await splitPdf(file, ranges)
        for (const r of results) {
          downloadPdf(r.bytes, r.name)
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
    } catch (e) {
      setError(L('PDF бөлу кезінде қате болды', 'Ошибка при разделении PDF'))
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [file, mode, rangeInput, pageCount, lang])

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
            <p className="text-xs font-semibold text-muted-foreground">{L('Бөлу режимі', 'Режим разделения')}:</p>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('all')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all min-h-[44px] ${
                  mode === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-muted-foreground hover:border-primary'
                }`}
              >
                {L('Барлық беттерді бөлу', 'Разделить все страницы')}
              </button>
              <button
                onClick={() => setMode('custom')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all min-h-[44px] ${
                  mode === 'custom'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-muted-foreground hover:border-primary'
                }`}
              >
                {L('Аралықтар бойынша', 'По диапазонам')}
              </button>
            </div>

            {mode === 'custom' && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  {L('Аралықтар (мыс. 1-3, 5, 7-10)', 'Диапазоны (напр. 1-3, 5, 7-10)')}
                </label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={e => setRangeInput(e.target.value)}
                  placeholder="1-3, 5, 7-10"
                  className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
                />
              </div>
            )}
          </div>
        </>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleSplit}
        disabled={loading || !file || (mode === 'custom' && !rangeInput.trim())}
        className="w-full py-3 px-6 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
        {loading
          ? L('Бөлінуде...', 'Разделение...')
          : L('Бөлу және жүктеу', 'Разделить и скачать')}
      </button>
    </div>
  )
}
