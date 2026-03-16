'use client'
import { useState, useCallback } from 'react'
import { useApp } from '@/components/layout/Providers'
import { PdfUploader } from './PdfUploader'
import { mergePdfs } from '@/lib/pdf/merge'
import { downloadPdf, formatFileSize } from '@/lib/pdf/pdfUtils'

export function MergePdf() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFiles = useCallback((newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles])
    setError('')
  }, [])

  const moveUp = (index: number) => {
    if (index === 0) return
    setFiles(prev => {
      const arr = [...prev]
      ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
      return arr
    })
  }

  const moveDown = (index: number) => {
    setFiles(prev => {
      if (index >= prev.length - 1) return prev
      const arr = [...prev]
      ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
      return arr
    })
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleMerge = useCallback(async () => {
    if (files.length < 2) return
    setLoading(true)
    setError('')
    try {
      const bytes = await mergePdfs(files)
      downloadPdf(bytes, 'merged.pdf')
    } catch (e) {
      setError(L('PDF біріктіру кезінде қате болды', 'Ошибка при объединении PDF'))
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [files, lang])

  return (
    <div className="space-y-4">
      <PdfUploader
        multiple
        onFiles={handleFiles}
        label={L('PDF файлдарды таңдаңыз немесе тастаңыз', 'Выберите или перетащите PDF файлы')}
      />

      {files.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold mb-2">
            {L('Файлдар тізімі', 'Список файлов')} ({files.length}):
          </p>
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-accent/30 text-sm">
              <span className="shrink-0">📄</span>
              <span className="truncate flex-1">{f.name}</span>
              <span className="text-[11px] text-muted-foreground shrink-0">({formatFileSize(f.size)})</span>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => moveUp(i)}
                  disabled={i === 0}
                  className="w-7 h-7 rounded-lg bg-card border border-border text-xs hover:border-primary disabled:opacity-30 transition-all min-h-[28px]"
                  title={L('Жоғары', 'Вверх')}
                >
                  ↑
                </button>
                <button
                  onClick={() => moveDown(i)}
                  disabled={i === files.length - 1}
                  className="w-7 h-7 rounded-lg bg-card border border-border text-xs hover:border-primary disabled:opacity-30 transition-all min-h-[28px]"
                  title={L('Төмен', 'Вниз')}
                >
                  ↓
                </button>
                <button
                  onClick={() => removeFile(i)}
                  className="w-7 h-7 rounded-lg bg-card border border-border text-xs hover:border-red-400 hover:text-red-500 transition-all min-h-[28px]"
                  title={L('Жою', 'Удалить')}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleMerge}
        disabled={loading || files.length < 2}
        className="w-full py-3 px-6 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
        {loading
          ? L('Біріктірілуде...', 'Объединение...')
          : L('Біріктіру және жүктеу', 'Объединить и скачать')}
      </button>

      {files.length > 0 && files.length < 2 && (
        <p className="text-xs text-muted-foreground text-center">
          {L('Кемінде 2 файл қажет', 'Нужно минимум 2 файла')}
        </p>
      )}
    </div>
  )
}
