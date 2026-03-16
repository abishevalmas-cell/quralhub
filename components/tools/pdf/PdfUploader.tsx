'use client'
import { useRef, useState, useCallback } from 'react'
import { useApp } from '@/components/layout/Providers'
import { formatFileSize } from '@/lib/pdf/pdfUtils'

interface PdfUploaderProps {
  accept?: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  label?: string
}

export function PdfUploader({ accept = '.pdf', multiple = false, onFiles, label }: PdfUploaderProps) {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const arr = Array.from(files)
    setSelectedFiles(arr)
    onFiles(arr)
  }, [onFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    // Reset input so same file can be selected again
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all min-h-[44px] ${
          dragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary hover:bg-accent/20'
        }`}
      >
        <div className="text-4xl mb-2">{accept?.includes('image') ? '🖼️' : '📁'}</div>
        <p className="text-sm font-semibold">
          {label || (multiple
            ? L('Файлдарды осында тастаңыз немесе таңдаңыз', 'Перетащите файлы сюда или выберите')
            : L('Файлды осында тастаңыз немесе таңдаңыз', 'Перетащите файл сюда или выберите'))}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {accept === '.pdf'
            ? L('PDF формат', 'Формат PDF')
            : accept?.includes('image')
              ? L('JPG, PNG, WebP форматтары', 'Форматы JPG, PNG, WebP')
              : accept || 'PDF'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-3 bg-card border border-border rounded-xl p-3">
          <p className="text-sm font-semibold mb-2">
            {selectedFiles.length} {L('файл таңдалды', 'файл(ов) выбрано')}:
          </p>
          <ul className="space-y-1">
            {selectedFiles.map((f, i) => (
              <li key={i} className="text-xs text-muted-foreground truncate flex items-center gap-2">
                <span className="shrink-0">{accept?.includes('image') ? '🖼️' : '📄'}</span>
                <span className="truncate">{f.name}</span>
                <span className="shrink-0 text-[11px]">({formatFileSize(f.size)})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
