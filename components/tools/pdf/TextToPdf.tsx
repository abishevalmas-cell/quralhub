'use client'
import { useState, useCallback } from 'react'
import { useApp } from '@/components/layout/Providers'

export function TextToPdf() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [fontSize, setFontSize] = useState(12)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = useCallback(async () => {
    if (!content.trim()) return
    setLoading(true)
    setError('')
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      // Title
      if (title.trim()) {
        doc.setFontSize(Math.min(fontSize + 6, 24))
        doc.text(title, 105, 25, { align: 'center' })
      }

      // Body text
      doc.setFontSize(fontSize)
      const lines = doc.splitTextToSize(content, 170)
      const lineHeight = fontSize * 0.5 + 2
      let y = title.trim() ? 40 : 20
      const pageHeight = 280

      for (const line of lines) {
        if (y > pageHeight) {
          doc.addPage()
          y = 20
        }
        doc.text(line, 20, y)
        y += lineHeight
      }

      doc.save(`${title || 'document'}.pdf`)
    } catch (e) {
      setError(L('PDF жасау кезінде қате болды', 'Ошибка при создании PDF'))
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [title, content, fontSize, lang])

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
          {L('Тақырып (міндетті емес)', 'Заголовок (необязательно)')}
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={L('Құжат тақырыбы', 'Заголовок документа')}
          className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
        />
      </div>

      {/* Content */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
          {L('Мәтін', 'Текст')}
        </label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={L('Мәтінді осында жазыңыз немесе қойыңыз...', 'Введите или вставьте текст...')}
          className="w-full px-3 py-3 bg-card border border-border rounded-xl text-sm outline-none focus:border-primary min-h-[200px] resize-y"
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

      {/* Preview info */}
      {content.trim() && (
        <div className="p-3 rounded-xl bg-accent/30 text-sm">
          <span className="text-muted-foreground">{L('Таңбалар саны', 'Символов')}: </span>
          <span className="font-semibold">{content.length}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading || !content.trim()}
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
