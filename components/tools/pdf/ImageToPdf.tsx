'use client'
import { useState, useCallback } from 'react'
import { useApp } from '@/components/layout/Providers'
import { PdfUploader } from './PdfUploader'
import { formatFileSize } from '@/lib/pdf/pdfUtils'

interface ImageEntry {
  file: File
  preview: string
}

export function ImageToPdf() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [images, setImages] = useState<ImageEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFiles = useCallback(async (files: File[]) => {
    setError('')
    const newEntries: ImageEntry[] = []
    for (const file of files) {
      const preview = await readFileAsDataURL(file)
      newEntries.push({ file, preview })
    }
    setImages(prev => [...prev, ...newEntries])
  }, [])

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    setImages(prev => {
      const arr = [...prev]
      ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
      return arr
    })
  }

  const moveDown = (index: number) => {
    setImages(prev => {
      if (index >= prev.length - 1) return prev
      const arr = [...prev]
      ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
      return arr
    })
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleConvert = useCallback(async () => {
    if (images.length === 0) return
    setLoading(true)
    setError('')
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      for (let i = 0; i < images.length; i++) {
        const entry = images[i]
        const img = await loadImage(entry.preview)

        if (i > 0) doc.addPage()

        const pageW = 210
        const pageH = 297
        const margin = 10
        const maxW = pageW - margin * 2
        const maxH = pageH - margin * 2

        let w = img.width
        let h = img.height
        const ratio = Math.min(maxW / w, maxH / h)
        w *= ratio
        h *= ratio

        const x = (pageW - w) / 2
        const y = (pageH - h) / 2

        doc.addImage(entry.preview, 'JPEG', x, y, w, h)
      }

      doc.save('images.pdf')
    } catch (e) {
      setError(L('PDF жасау кезінде қате болды', 'Ошибка при создании PDF'))
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [images, lang])

  return (
    <div className="space-y-4">
      <PdfUploader
        accept="image/*"
        multiple
        onFiles={handleFiles}
        label={L('Суреттерді таңдаңыз немесе тастаңыз', 'Выберите или перетащите изображения')}
      />

      {images.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold">
            {images.length} {L('сурет', 'изображений')}:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((entry, i) => (
              <div key={`${entry.file.name}-${i}`} className="relative group">
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-accent/30 border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.preview}
                    alt={entry.file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-1">{entry.file.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatFileSize(entry.file.size)}</p>
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    className="w-6 h-6 rounded bg-black/60 text-white text-[10px] hover:bg-black/80 disabled:opacity-30 transition-all"
                    title={L('Жоғары', 'Вверх')}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveDown(i)}
                    disabled={i === images.length - 1}
                    className="w-6 h-6 rounded bg-black/60 text-white text-[10px] hover:bg-black/80 disabled:opacity-30 transition-all"
                    title={L('Төмен', 'Вниз')}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeImage(i)}
                    className="w-6 h-6 rounded bg-red-600/80 text-white text-[10px] hover:bg-red-600 transition-all"
                    title={L('Жою', 'Удалить')}
                  >
                    ✕
                  </button>
                </div>
                <div className="absolute top-1 left-1 w-5 h-5 rounded bg-black/60 text-white text-[10px] flex items-center justify-center font-bold">
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleConvert}
        disabled={loading || images.length === 0}
        className="w-full py-3 px-6 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
        {loading
          ? L('Жасалуда...', 'Создание...')
          : L('PDF жасау және жүктеу', 'Создать и скачать PDF')}
      </button>
    </div>
  )
}
