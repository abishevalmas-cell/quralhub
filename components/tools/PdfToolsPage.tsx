'use client'
import { useState, useRef, useCallback } from 'react'
import { BackButton } from '@/components/layout/BackButton'
import { Input } from '@/components/ui/input'
import { ShareBar } from '@/components/shared/ShareBar'
import { TipBox } from '@/components/shared/TipBox'
import { InfoChip } from '@/components/shared/InfoChip'
import { useApp } from '@/components/layout/Providers'

type ToolKey = 'merge' | 'split' | 'compress' | 'img2pdf' | 'text2pdf' | 'rotate' | 'watermark' | 'pagenums' | 'removepages'

interface PdfTool {
  key: ToolKey
  icon: string
  title: [string, string]
  desc: [string, string]
  implemented: boolean
}

const TOOLS: PdfTool[] = [
  { key: 'text2pdf', icon: '📝', title: ['Мәтін → PDF', 'Текст → PDF'], desc: ['Мәтінді PDF файлға айналдыру', 'Конвертировать текст в PDF'], implemented: true },
  { key: 'img2pdf', icon: '🖼️', title: ['Сурет → PDF', 'Изображение → PDF'], desc: ['Суреттерді PDF файлға біріктіру', 'Объединить изображения в PDF'], implemented: true },
  { key: 'merge', icon: '📎', title: ['Біріктіру', 'Объединить'], desc: ['Бірнеше PDF файлды біріктіру', 'Объединить несколько PDF файлов'], implemented: false },
  { key: 'split', icon: '✂️', title: ['Бөлу', 'Разделить'], desc: ['PDF файлды бөліктерге бөлу', 'Разделить PDF на части'], implemented: false },
  { key: 'compress', icon: '📦', title: ['Сығу', 'Сжать'], desc: ['PDF файл көлемін кішірейту', 'Уменьшить размер PDF'], implemented: false },
  { key: 'rotate', icon: '🔄', title: ['Бұру', 'Повернуть'], desc: ['PDF беттерін бұру', 'Повернуть страницы PDF'], implemented: false },
  { key: 'watermark', icon: '💧', title: ['Су белгі', 'Водяной знак'], desc: ['PDF файлға watermark қосу', 'Добавить водяной знак в PDF'], implemented: false },
  { key: 'pagenums', icon: '🔢', title: ['Бет нөмірлері', 'Нумерация страниц'], desc: ['Беттерге нөмір қосу', 'Добавить нумерацию страниц'], implemented: false },
  { key: 'removepages', icon: '🗑️', title: ['Беттер өшіру', 'Удалить страницы'], desc: ['Қажетсіз беттерді алып тастау', 'Удалить ненужные страницы'], implemented: false },
]

export function PdfToolsPage() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz
  const isRu = lang === 'ru'

  const [activeTool, setActiveTool] = useState<ToolKey | null>(null)
  const [textTitle, setTextTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [generating, setGenerating] = useState(false)
  const [imgFiles, setImgFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleTextToPdf = useCallback(async () => {
    if (!textContent.trim()) return
    setGenerating(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      // Title
      if (textTitle.trim()) {
        doc.setFontSize(18)
        doc.text(textTitle, 105, 25, { align: 'center' })
      }

      // Body text
      doc.setFontSize(12)
      const lines = doc.splitTextToSize(textContent, 170)
      let y = textTitle.trim() ? 40 : 20
      const pageHeight = 280

      for (const line of lines) {
        if (y > pageHeight) {
          doc.addPage()
          y = 20
        }
        doc.text(line, 20, y)
        y += 7
      }

      doc.save(`${textTitle || 'document'}.pdf`)
    } catch {
      alert(L('PDF жасау кезінде қате болды', 'Ошибка при создании PDF'))
    } finally {
      setGenerating(false)
    }
  }, [textTitle, textContent])

  const handleImgToPdf = useCallback(async () => {
    if (imgFiles.length === 0) return
    setGenerating(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      for (let i = 0; i < imgFiles.length; i++) {
        const file = imgFiles[i]
        const dataUrl = await readFileAsDataURL(file)
        const img = await loadImage(dataUrl)

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

        doc.addImage(dataUrl, 'JPEG', x, y, w, h)
      }

      doc.save('images.pdf')
    } catch {
      alert(L('PDF жасау кезінде қате болды', 'Ошибка при создании PDF'))
    } finally {
      setGenerating(false)
    }
  }, [imgFiles])

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

  const handleImgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setImgFiles(Array.from(files))
    }
  }

  const tool = TOOLS.find(t => t.key === activeTool)

  return (
    <div className="max-w-[680px] mx-auto px-5 py-6">
      <BackButton />
      <h2 className="text-2xl font-extrabold tracking-tight mb-1.5">{L('📕 PDF құралдар', '📕 PDF инструменты')}</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <InfoChip>{L('9 құрал', '9 инструментов')}</InfoChip>
        <InfoChip>{L('Тегін', 'Бесплатно')}</InfoChip>
        <InfoChip>{L('100% қауіпсіз', '100% безопасно')}</InfoChip>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        {L('PDF файлдармен жұмыс — біріктіру, бөлу, конвертация', 'Работа с PDF — объединение, разделение, конвертация')}
      </p>

      {/* Security badge */}
      <div className="mb-4 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 text-[13px] text-green-800 dark:text-green-200 leading-relaxed border border-green-200/30 dark:border-green-800/30 flex items-center gap-2">
        <span className="text-lg">🔒</span>
        <span>{L('100% қауіпсіз — файлдар серверге жіберілмейді, барлығы браузерде өңделеді', '100% безопасно — файлы не отправляются на сервер, всё обрабатывается в браузере')}</span>
      </div>

      {!activeTool && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TOOLS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTool(t.key)}
              className="p-4 bg-card border border-border rounded-2xl text-center hover:border-primary hover:shadow-md transition-all group"
            >
              <div className="text-2xl mb-2">{t.icon}</div>
              <p className="text-sm font-bold mb-1 group-hover:text-primary transition-colors">{isRu ? t.title[1] : t.title[0]}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{isRu ? t.desc[1] : t.desc[0]}</p>
              {!t.implemented && (
                <span className="inline-block mt-2 text-[9px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-semibold">
                  {L('Жуықта', 'Скоро')}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {activeTool && (
        <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
          <button
            onClick={() => { setActiveTool(null); setImgFiles([]); setTextContent(''); setTextTitle('') }}
            className="mb-4 text-sm text-primary font-semibold hover:underline flex items-center gap-1"
          >
            ← {L('Барлық құралдар', 'Все инструменты')}
          </button>

          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            {tool?.icon} {tool ? (isRu ? tool.title[1] : tool.title[0]) : ''}
          </h3>

          {/* Text to PDF */}
          {activeTool === 'text2pdf' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Тақырып', 'Заголовок')}</label>
                <Input
                  type="text"
                  value={textTitle}
                  onChange={e => setTextTitle(e.target.value)}
                  placeholder={L('Құжат тақырыбы', 'Заголовок документа')}
                  className="text-base"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{L('Мәтін', 'Текст')}</label>
                <textarea
                  className="w-full px-3 py-3 bg-card border border-border rounded-xl text-sm outline-none focus:border-primary min-h-[200px] resize-y"
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                  placeholder={L('Мәтінді осында жазыңыз немесе қойыңыз...', 'Введите или вставьте текст...')}
                />
              </div>
              <button
                onClick={handleTextToPdf}
                disabled={generating || !textContent.trim()}
                className="w-full py-3 px-6 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50"
              >
                {generating ? L('Жасалуда...', 'Создание...') : L('PDF жасау және жүктеу', 'Создать и скачать PDF')}
              </button>
            </div>
          )}

          {/* Image to PDF */}
          {activeTool === 'img2pdf' && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary hover:bg-accent/20 transition-all"
              >
                <div className="text-4xl mb-2">🖼️</div>
                <p className="text-sm font-semibold">{L('Суреттерді таңдаңыз', 'Выберите изображения')}</p>
                <p className="text-xs text-muted-foreground mt-1">{L('JPG, PNG, WebP форматтары', 'Форматы JPG, PNG, WebP')}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImgFileChange}
                  className="hidden"
                />
              </div>

              {imgFiles.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-3">
                  <p className="text-sm font-semibold mb-2">{imgFiles.length} {L('сурет таңдалды', 'изображений выбрано')}:</p>
                  <ul className="space-y-1">
                    {imgFiles.map((f, i) => (
                      <li key={i} className="text-xs text-muted-foreground truncate">
                        {f.name} ({(f.size / 1024).toFixed(0)} KB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={handleImgToPdf}
                disabled={generating || imgFiles.length === 0}
                className="w-full py-3 px-6 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50"
              >
                {generating ? L('Жасалуда...', 'Создание...') : L('PDF жасау және жүктеу', 'Создать и скачать PDF')}
              </button>
            </div>
          )}

          {/* Not implemented tools */}
          {activeTool && !['text2pdf', 'img2pdf'].includes(activeTool) && (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center">
                <div className="text-4xl mb-2">📁</div>
                <p className="text-sm font-semibold">{L('PDF файлды осында тастаңыз', 'Перетащите PDF файл сюда')}</p>
                <p className="text-xs text-muted-foreground mt-1">{L('немесе таңдау үшін басыңыз', 'или нажмите для выбора')}</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-center">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{L('Жуықта қосылады', 'Скоро будет добавлено')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {L('Бұл құрал әзірленуде. Қазірше «Мәтін → PDF» және «Сурет → PDF» құралдарын қолданыңыз.', 'Этот инструмент в разработке. Пока используйте «Текст → PDF» и «Изображение → PDF».')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <TipBox>
        {L('Барлық файлдар тек сіздің браузеріңізде өңделеді. Ешқандай деректер серверге жіберілмейді.', 'Все файлы обрабатываются только в вашем браузере. Никакие данные не отправляются на сервер.')}
      </TipBox>

      <ShareBar tool="pdf" text={L('PDF құралдар — Quralhub', 'PDF инструменты — Quralhub')} />
    </div>
  )
}
