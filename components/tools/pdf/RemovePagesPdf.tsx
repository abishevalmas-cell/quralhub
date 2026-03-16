'use client'
import { useState, useCallback } from 'react'
import { useApp } from '@/components/layout/Providers'
import { PdfUploader } from './PdfUploader'
import { removePages } from '@/lib/pdf/removePages'
import { getPageCount, downloadPdf } from '@/lib/pdf/pdfUtils'

export function RemovePagesPdf() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
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
            if (i >= 1) indices.push(i - 1)
          }
        }
      } else {
        const num = parseInt(part)
        if (!isNaN(num) && num >= 1 && num <= pageCount) {
          indices.push(num - 1)
        }
      }
    }
    return [...new Set(indices)]
  }

  const removedCount = pagesInput.trim() ? parsePageIndices(pagesInput).length : 0
  const remainingCount = pageCount - removedCount

  const handleRemove = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const indices = parsePageIndices(pagesInput)
      if (indices.length === 0) {
        setError(L('Өшірілетін бет нөмірлерін енгізіңіз', 'Введите номера страниц для удаления'))
        setLoading(false)
        return
      }
      if (indices.length >= pageCount) {
        setError(L('Барлық беттерді өшіру мүмкін емес', 'Нельзя удалить все страницы'))
        setLoading(false)
        return
      }
      const bytes = await removePages(file, indices)
      downloadPdf(bytes, `trimmed_${file.name}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('Cannot remove all pages')) {
        setError(L('Барлық беттерді өшіру мүмкін емес', 'Нельзя удалить все страницы'))
      } else {
        setError(L('Беттерді өшіру кезінде қате болды', 'Ошибка при удалении страниц'))
      }
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [file, pagesInput, pageCount, lang])

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

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              {L('Өшірілетін беттер (мыс. 1, 3, 5)', 'Страницы для удаления (напр. 1, 3, 5)')}
            </label>
            <input
              type="text"
              value={pagesInput}
              onChange={e => setPagesInput(e.target.value)}
              placeholder="1, 3, 5"
              className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
            />
          </div>

          {pagesInput.trim() && (
            <div className="p-3 rounded-xl bg-accent/30 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{L('Өшірілетін беттер', 'Удаляемые страницы')}:</span>
                <span className="font-semibold text-red-600 dark:text-red-400">{removedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{L('Қалған беттер', 'Оставшиеся страницы')}:</span>
                <span className="font-semibold text-green-700 dark:text-green-300">{Math.max(0, remainingCount)}</span>
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleRemove}
        disabled={loading || !file || !pagesInput.trim() || remainingCount <= 0}
        className="w-full py-3 px-6 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
        {loading
          ? L('Өшірілуде...', 'Удаление...')
          : L('Беттерді өшіру және жүктеу', 'Удалить страницы и скачать')}
      </button>
    </div>
  )
}
