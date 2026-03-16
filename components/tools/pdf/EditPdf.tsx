'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useApp } from '@/components/layout/Providers'
import { PdfUploader } from './PdfUploader'
import { editPdfWithStamps, type StampPlacement } from '@/lib/pdf/editPdf'
import { getPageCount, downloadPdf, readFileAsDataURL } from '@/lib/pdf/pdfUtils'
import { PDFDocument } from 'pdf-lib'

interface OverlayItem {
  id: string
  type: 'image' | 'text'
  pageIndex: number
  xPct: number   // % from left
  yPct: number   // % from top (CSS top, will be converted to pdf-lib bottom on save)
  widthPct: number
  heightPct: number
  data: string   // base64 dataURL or text
  fontSize?: number
}

type ToolMode = 'stamp' | 'signature' | 'text' | null

// A4 aspect ratio constants
const PAGE_W = 595
const PAGE_H = 842

export function EditPdf() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [pageDims, setPageDims] = useState<{ w: number; h: number }[]>([])
  const [overlays, setOverlays] = useState<OverlayItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeMode, setActiveMode] = useState<ToolMode>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Text input state
  const [textInput, setTextInput] = useState('')
  const [textFontSize, setTextFontSize] = useState(16)

  // Signature canvas
  const [showSigPad, setShowSigPad] = useState(false)
  const sigCanvasRef = useRef<HTMLCanvasElement>(null)
  const sigDrawingRef = useRef(false)
  const sigLastPosRef = useRef({ x: 0, y: 0 })

  // Stamp image file input
  const stampInputRef = useRef<HTMLInputElement>(null)

  // Check localStorage for saved stamp from RemoveBackgroundTool
  useEffect(() => {
    const saved = localStorage.getItem('quralhub_stamp_image')
    if (saved) {
      localStorage.removeItem('quralhub_stamp_image')
      addOverlay('image', saved)
    }
  }, [])

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setError('')
    setOverlays([])
    setSelectedId(null)
    setCurrentPage(0)
    try {
      const buffer = await f.arrayBuffer()
      const doc = await PDFDocument.load(buffer)
      const count = doc.getPageCount()
      setPageCount(count)
      const dims: { w: number; h: number }[] = []
      for (let i = 0; i < count; i++) {
        const page = doc.getPage(i)
        const { width, height } = page.getSize()
        dims.push({ w: width, h: height })
      }
      setPageDims(dims)
    } catch {
      setError(L('PDF файлды оқу мүмкін болмады', 'Не удалось прочитать PDF файл'))
    }
  }, [lang])

  const genId = () => `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

  const addOverlay = useCallback((type: 'image' | 'text', data: string, fontSize?: number) => {
    const item: OverlayItem = {
      id: genId(),
      type,
      pageIndex: currentPage,
      xPct: 30,
      yPct: 30,
      widthPct: type === 'image' ? 20 : 30,
      heightPct: type === 'image' ? 15 : 5,
      data,
      fontSize: fontSize || 16,
    }
    setOverlays(prev => [...prev, item])
    setSelectedId(item.id)
    setActiveMode(null)
  }, [currentPage])

  // Handle stamp image upload
  const handleStampUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const dataUrl = await readFileAsDataURL(f)
    addOverlay('image', dataUrl)
    if (stampInputRef.current) stampInputRef.current.value = ''
  }, [addOverlay])

  // Handle text add
  const handleAddText = useCallback(() => {
    if (!textInput.trim()) return
    addOverlay('text', textInput.trim(), textFontSize)
    setTextInput('')
    setActiveMode(null)
  }, [textInput, textFontSize, addOverlay])

  // Signature pad handlers
  const initSigCanvas = useCallback(() => {
    const canvas = sigCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  useEffect(() => {
    if (showSigPad) {
      setTimeout(initSigCanvas, 50)
    }
  }, [showSigPad, initSigCanvas])

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = sigCanvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0]
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const sigStartDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    sigDrawingRef.current = true
    const pos = getCanvasPos(e)
    sigLastPosRef.current = pos
    const ctx = sigCanvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }
  }

  const sigDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sigDrawingRef.current) return
    e.preventDefault()
    const pos = getCanvasPos(e)
    const ctx = sigCanvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
    sigLastPosRef.current = pos
  }

  const sigStopDraw = () => {
    sigDrawingRef.current = false
  }

  const clearSigCanvas = () => {
    initSigCanvas()
  }

  const saveSigCanvas = () => {
    const canvas = sigCanvasRef.current
    if (!canvas) return
    // Convert white to transparent
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
      if (brightness > 240) {
        data[i + 3] = 0
      }
    }
    ctx.putImageData(imageData, 0, 0)
    const dataUrl = canvas.toDataURL('image/png')
    addOverlay('image', dataUrl)
    setShowSigPad(false)
  }

  // Drag overlay on page
  const dragRef = useRef<{ id: string; startX: number; startY: number; origXPct: number; origYPct: number } | null>(null)

  const handleOverlayMouseDown = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.stopPropagation()
    e.preventDefault()
    setSelectedId(id)
    const item = overlays.find(o => o.id === id)
    if (!item) return

    let clientX: number, clientY: number
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    dragRef.current = {
      id,
      startX: clientX,
      startY: clientY,
      origXPct: item.xPct,
      origYPct: item.yPct,
    }

    const handleMove = (ev: MouseEvent | TouchEvent) => {
      if (!dragRef.current) return
      let cx: number, cy: number
      if ('touches' in ev) {
        cx = ev.touches[0].clientX
        cy = ev.touches[0].clientY
      } else {
        cx = ev.clientX
        cy = ev.clientY
      }
      // Get page container element dimensions
      const pageEl = document.getElementById(`pdf-page-${currentPage}`)
      if (!pageEl) return
      const rect = pageEl.getBoundingClientRect()
      const dx = ((cx - dragRef.current.startX) / rect.width) * 100
      const dy = ((cy - dragRef.current.startY) / rect.height) * 100
      const newX = Math.max(0, Math.min(100, dragRef.current.origXPct + dx))
      const newY = Math.max(0, Math.min(100, dragRef.current.origYPct + dy))
      setOverlays(prev => prev.map(o => o.id === dragRef.current!.id ? { ...o, xPct: newX, yPct: newY } : o))
    }

    const handleUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleUp)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleUp)
  }

  const deleteSelected = () => {
    if (!selectedId) return
    setOverlays(prev => prev.filter(o => o.id !== selectedId))
    setSelectedId(null)
  }

  // Resize selected item
  const resizeSelected = (delta: number) => {
    if (!selectedId) return
    setOverlays(prev => prev.map(o => {
      if (o.id !== selectedId) return o
      const newW = Math.max(5, Math.min(80, o.widthPct + delta))
      const ratio = newW / o.widthPct
      const newH = o.heightPct * ratio
      return { ...o, widthPct: newW, heightPct: Math.max(3, Math.min(80, newH)) }
    }))
  }

  // Save & download
  const handleSave = useCallback(async () => {
    if (!file || overlays.length === 0) return
    setLoading(true)
    setError('')
    try {
      const stamps: StampPlacement[] = overlays.map(o => {
        const dim = pageDims[o.pageIndex] || { w: PAGE_W, h: PAGE_H }
        // Convert from CSS top-based % to pdf-lib bottom-based %
        const yFromBottom = 100 - o.yPct - o.heightPct
        return {
          type: o.type,
          pageIndex: o.pageIndex,
          x: o.xPct,
          y: yFromBottom,
          width: o.widthPct,
          height: o.heightPct,
          data: o.data,
          fontSize: o.fontSize,
          opacity: 1,
        }
      })
      const bytes = await editPdfWithStamps(file, stamps)
      downloadPdf(bytes, `edited_${file.name}`)
    } catch (e) {
      setError(L('Сақтау кезінде қате болды', 'Ошибка при сохранении'))
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [file, overlays, pageDims, lang])

  const currentDim = pageDims[currentPage] || { w: PAGE_W, h: PAGE_H }
  const aspectRatio = currentDim.w / currentDim.h
  const pageOverlays = overlays.filter(o => o.pageIndex === currentPage)

  return (
    <div className="space-y-4">
      <PdfUploader
        onFiles={handleFiles}
        label={L('PDF файлды таңдаңыз', 'Выберите PDF файл')}
      />

      {file && pageCount > 0 && (
        <>
          {/* File info */}
          <div className="p-3 rounded-xl bg-accent/30 text-sm flex items-center gap-2">
            <span>📄</span>
            <span className="font-semibold">{file.name}</span>
            <span className="text-muted-foreground">— {pageCount} {L('бет', 'стр.')}</span>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setActiveMode('stamp'); stampInputRef.current?.click() }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all min-h-[44px] flex items-center gap-1.5 ${
                activeMode === 'stamp' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border hover:border-primary'
              }`}
            >
              <span>🖼️</span> {L('Печать', 'Печать')}
            </button>
            <button
              onClick={() => { setActiveMode('signature'); setShowSigPad(true) }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all min-h-[44px] flex items-center gap-1.5 ${
                activeMode === 'signature' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border hover:border-primary'
              }`}
            >
              <span>✍️</span> {L('Қолтаңба', 'Подпись')}
            </button>
            <button
              onClick={() => setActiveMode(activeMode === 'text' ? null : 'text')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all min-h-[44px] flex items-center gap-1.5 ${
                activeMode === 'text' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border hover:border-primary'
              }`}
            >
              <span>📝</span> {L('Мәтін', 'Текст')}
            </button>
            {selectedId && (
              <>
                <button
                  onClick={() => resizeSelected(3)}
                  className="px-3 py-2 rounded-full text-sm font-semibold bg-card border border-border hover:border-primary transition-all min-h-[44px]"
                  title={L('Үлкейту', 'Увеличить')}
                >
                  ➕
                </button>
                <button
                  onClick={() => resizeSelected(-3)}
                  className="px-3 py-2 rounded-full text-sm font-semibold bg-card border border-border hover:border-primary transition-all min-h-[44px]"
                  title={L('Кішірейту', 'Уменьшить')}
                >
                  ➖
                </button>
                <button
                  onClick={deleteSelected}
                  className="px-4 py-2 rounded-full text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-all min-h-[44px] flex items-center gap-1.5"
                >
                  <span>🗑️</span> {L('Жою', 'Удалить')}
                </button>
              </>
            )}
          </div>

          {/* Hidden stamp file input */}
          <input
            ref={stampInputRef}
            type="file"
            accept="image/*"
            onChange={handleStampUpload}
            className="hidden"
          />

          {/* Text input panel */}
          {activeMode === 'text' && (
            <div className="p-4 bg-card border border-border rounded-xl space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  {L('Мәтін', 'Текст')}
                </label>
                <input
                  type="text"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder={L('Мәтінді енгізіңіз...', 'Введите текст...')}
                  className="w-full px-3 py-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:border-primary"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddText() }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  {L('Шрифт өлшемі', 'Размер шрифта')}: {textFontSize}px
                </label>
                <input
                  type="range"
                  min={8}
                  max={48}
                  value={textFontSize}
                  onChange={e => setTextFontSize(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <button
                onClick={handleAddText}
                disabled={!textInput.trim()}
                className="px-6 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px]"
              >
                {L('Қосу', 'Добавить')}
              </button>
            </div>
          )}

          {/* Signature pad */}
          {showSigPad && (
            <div className="p-4 bg-card border border-border rounded-xl space-y-3">
              <label className="text-xs font-semibold text-muted-foreground block">
                {L('Қолтаңбаңызды салыңыз', 'Нарисуйте подпись')}
              </label>
              <div className="border border-border rounded-xl overflow-hidden bg-white">
                <canvas
                  ref={sigCanvasRef}
                  width={400}
                  height={150}
                  className="w-full cursor-crosshair touch-none"
                  style={{ maxHeight: 150 }}
                  onMouseDown={sigStartDraw}
                  onMouseMove={sigDraw}
                  onMouseUp={sigStopDraw}
                  onMouseLeave={sigStopDraw}
                  onTouchStart={sigStartDraw}
                  onTouchMove={sigDraw}
                  onTouchEnd={sigStopDraw}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={clearSigCanvas}
                  className="px-4 py-2 rounded-full text-sm font-semibold bg-card border border-border hover:border-primary transition-all min-h-[44px]"
                >
                  {L('Тазалау', 'Очистить')}
                </button>
                <button
                  onClick={saveSigCanvas}
                  className="px-6 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all min-h-[44px]"
                >
                  {L('Қолтаңбаны қосу', 'Добавить подпись')}
                </button>
                <button
                  onClick={() => { setShowSigPad(false); setActiveMode(null) }}
                  className="px-4 py-2 rounded-full text-sm font-semibold bg-card border border-border hover:border-primary transition-all min-h-[44px]"
                >
                  {L('Жабу', 'Закрыть')}
                </button>
              </div>
            </div>
          )}

          {/* Page navigation */}
          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-card border border-border hover:border-primary transition-all disabled:opacity-30 min-h-[44px]"
              >
                ← {L('Алдыңғы', 'Назад')}
              </button>
              <span className="text-sm font-semibold">
                {currentPage + 1} / {pageCount}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(pageCount - 1, p + 1))}
                disabled={currentPage === pageCount - 1}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-card border border-border hover:border-primary transition-all disabled:opacity-30 min-h-[44px]"
              >
                {L('Келесі', 'Далее')} →
              </button>
            </div>
          )}

          {/* Page canvas area */}
          <div
            id={`pdf-page-${currentPage}`}
            className="relative mx-auto border border-border rounded-xl bg-white overflow-hidden select-none"
            style={{
              aspectRatio: `${aspectRatio}`,
              maxWidth: 560,
              width: '100%',
            }}
            onClick={(e) => {
              // Deselect if clicking empty area
              if ((e.target as HTMLElement).id === `pdf-page-${currentPage}`) {
                setSelectedId(null)
              }
            }}
          >
            {/* Page background placeholder */}
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
              <div className="text-center">
                <div className="text-5xl mb-2">📄</div>
                <p className="text-sm font-semibold">{L('Бет', 'Страница')} {currentPage + 1}</p>
                <p className="text-xs">{Math.round(currentDim.w)} x {Math.round(currentDim.h)} pt</p>
              </div>
            </div>

            {/* Overlays */}
            {pageOverlays.map(item => (
              <div
                key={item.id}
                className={`absolute cursor-move group ${
                  selectedId === item.id ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:ring-1 hover:ring-blue-300'
                }`}
                style={{
                  left: `${item.xPct}%`,
                  top: `${item.yPct}%`,
                  width: `${item.widthPct}%`,
                  height: `${item.heightPct}%`,
                }}
                onMouseDown={(e) => handleOverlayMouseDown(e, item.id)}
                onTouchStart={(e) => handleOverlayMouseDown(e, item.id)}
              >
                {item.type === 'image' ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.data}
                    alt="stamp"
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center text-black pointer-events-none overflow-hidden"
                    style={{ fontSize: `${item.fontSize || 14}px`, lineHeight: 1.2 }}
                  >
                    {item.data}
                  </div>
                )}

                {/* Delete button on hover */}
                {selectedId === item.id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSelected() }}
                    className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center hover:bg-red-700 z-10"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Overlay count */}
          {overlays.length > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              {overlays.length} {L('элемент қосылды', 'элемент(ов) добавлено')}
              {pageOverlays.length !== overlays.length && (
                <span> ({pageOverlays.length} {L('осы бетте', 'на этой странице')})</span>
              )}
            </div>
          )}
        </>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={loading || !file || overlays.length === 0}
        className="w-full py-3 px-6 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
        {loading
          ? L('Сақталуда...', 'Сохранение...')
          : L('Сақтау және жүктеу', 'Сохранить и скачать')}
      </button>
    </div>
  )
}
