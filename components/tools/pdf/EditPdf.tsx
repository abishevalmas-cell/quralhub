'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useApp } from '@/components/layout/Providers'
import { PdfUploader } from './PdfUploader'
import { editPdfWithStamps, type StampPlacement } from '@/lib/pdf/editPdf'
import { downloadPdf, readFileAsDataURL } from '@/lib/pdf/pdfUtils'
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
  color?: { r: number; g: number; b: number }
}

type ToolMode = 'stamp' | 'signature' | 'text' | 'pencil' | 'highlighter' | 'shapes' | null
type ShapeType = 'rect' | 'circle' | 'line' | 'arrow'

const PENCIL_COLORS = [
  { label: 'Black', value: '#000000' },
  { label: 'Red', value: '#EF4444' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Green', value: '#22C55E' },
]

const HIGHLIGHTER_COLORS = [
  { label: 'Yellow', value: '#FACC15' },
  { label: 'Green', value: '#4ADE80' },
  { label: 'Pink', value: '#F472B6' },
  { label: 'Blue', value: '#60A5FA' },
]

const TEXT_COLORS = [
  { label: 'Black', rgb: { r: 0, g: 0, b: 0 }, hex: '#000000' },
  { label: 'Red', rgb: { r: 0.93, g: 0.27, b: 0.27 }, hex: '#EF4444' },
  { label: 'Blue', rgb: { r: 0.23, g: 0.51, b: 0.96 }, hex: '#3B82F6' },
  { label: 'Green', rgb: { r: 0.13, g: 0.77, b: 0.37 }, hex: '#22C55E' },
]

const SHAPE_COLORS = [
  { label: 'Black', value: '#000000' },
  { label: 'Red', value: '#EF4444' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Green', value: '#22C55E' },
]

// A4 aspect ratio constants
const PAGE_W = 595
const PAGE_H = 842

function drawShapeOnCtx(
  ctx: CanvasRenderingContext2D,
  shape: ShapeType,
  x1: number, y1: number, x2: number, y2: number,
  fill: boolean,
) {
  ctx.beginPath()
  switch (shape) {
    case 'rect': {
      const rx = Math.min(x1, x2)
      const ry = Math.min(y1, y2)
      const rw = Math.abs(x2 - x1)
      const rh = Math.abs(y2 - y1)
      if (fill) {
        ctx.globalAlpha = 0.3
        ctx.fillRect(rx, ry, rw, rh)
        ctx.globalAlpha = 1
      }
      ctx.strokeRect(rx, ry, rw, rh)
      break
    }
    case 'circle': {
      const cx = (x1 + x2) / 2
      const cy = (y1 + y2) / 2
      const rx = Math.abs(x2 - x1) / 2
      const ry = Math.abs(y2 - y1) / 2
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      if (fill) {
        ctx.globalAlpha = 0.3
        ctx.fill()
        ctx.globalAlpha = 1
      }
      ctx.stroke()
      break
    }
    case 'line': {
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      break
    }
    case 'arrow': {
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      // Arrowhead
      const angle = Math.atan2(y2 - y1, x2 - x1)
      const headLen = 12
      ctx.beginPath()
      ctx.moveTo(x2, y2)
      ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6))
      ctx.moveTo(x2, y2)
      ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6))
      ctx.stroke()
      break
    }
  }
}

export function EditPdf() {
  const { lang } = useApp()
  const L = (kz: string, ru: string) => lang === 'ru' ? ru : kz

  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [pageDims, setPageDims] = useState<{ w: number; h: number }[]>([])
  const [pageImages, setPageImages] = useState<string[]>([])
  const [overlays, setOverlays] = useState<OverlayItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeMode, setActiveMode] = useState<ToolMode>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [renderingPages, setRenderingPages] = useState(false)
  const [error, setError] = useState('')

  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<OverlayItem[][]>([])
  const [redoStack, setRedoStack] = useState<OverlayItem[][]>([])

  // Pencil/Highlighter state
  const [pencilColor, setPencilColor] = useState('#000000')
  const [pencilThickness, setPencilThickness] = useState(4)
  const [highlighterColor, setHighlighterColor] = useState('#FACC15')
  const drawCanvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const drawPointsRef = useRef<{ x: number; y: number }[]>([])

  // Shape state
  const [shapeType, setShapeType] = useState<ShapeType>('rect')
  const [shapeColor, setShapeColor] = useState('#000000')
  const [shapeFill, setShapeFill] = useState(false)
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null)
  const shapePreviewRef = useRef<HTMLCanvasElement>(null)

  // Text input state
  const [textInput, setTextInput] = useState('')
  const [textFontSize, setTextFontSize] = useState(16)
  const [textColor, setTextColor] = useState(TEXT_COLORS[0])

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

  // Store pdf document reference for lazy rendering
  const pdfDocRef = useRef<any>(null)

  /** Load PDF and render only current page (lazy) */
  const loadPdfDoc = useCallback(async (buffer: ArrayBuffer) => {
    setRenderingPages(true)
    try {
      const pdfjsLib = await import('pdfjs-dist')
      // v4.x worker setup — use legacy .js build for Safari/mobile compatibility
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.js`

      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
      pdfDocRef.current = pdf

      // Render only first page immediately
      await renderSinglePage(pdf, 0)
    } catch (err) {
      console.error('Failed to load PDF:', err)
      setError(lang === 'ru'
        ? 'Не удалось отрендерить PDF. Попробуйте Chrome/Firefox на компьютере.'
        : 'PDF рендерлеу мүмкін болмады. Chrome/Firefox браузерін қолданып көріңіз.')
    } finally {
      setRenderingPages(false)
    }
  }, [])

  /** Render a single page by index */
  const renderSinglePage = useCallback(async (pdf: any, pageIdx: number) => {
    try {
      const page = await pdf.getPage(pageIdx + 1)
      // Lower scale on mobile for performance
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
      const scale = isMobile ? 1.2 : 1.8
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await (page.render({ canvasContext: ctx, viewport } as any)).promise
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75)

      setPageImages(prev => {
        const arr = [...prev]
        arr[pageIdx] = dataUrl
        return arr
      })
    } catch (err) {
      console.error(`Failed to render page ${pageIdx + 1}:`, err)
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
    setPageImages([])
    setUndoStack([])
    setRedoStack([])
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

      // Render pages with pdfjs-dist
      const buffer2 = await f.arrayBuffer()
      loadPdfDoc(buffer2)
    } catch {
      setError(L('PDF файлды оқу мүмкін болмады', 'Не удалось прочитать PDF файл'))
    }
  }, [lang, loadPdfDoc])

  // Lazy render: when page changes, render if not already rendered
  useEffect(() => {
    if (pdfDocRef.current && !pageImages[currentPage]) {
      renderSinglePage(pdfDocRef.current, currentPage)
    }
  }, [currentPage, pageImages, renderSinglePage])

  const genId = () => `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

  const pushUndo = useCallback((currentOverlays: OverlayItem[]) => {
    setUndoStack(prev => [...prev, currentOverlays])
    setRedoStack([]) // clear redo on new action
  }, [])

  const handleUndo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev
      const newStack = [...prev]
      const last = newStack.pop()!
      setRedoStack(r => [...r, overlays])
      setOverlays(last)
      setSelectedId(null)
      return newStack
    })
  }, [overlays])

  const handleRedo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev
      const newStack = [...prev]
      const last = newStack.pop()!
      setUndoStack(u => [...u, overlays])
      setOverlays(last)
      setSelectedId(null)
      return newStack
    })
  }, [overlays])

  const addOverlay = useCallback((type: 'image' | 'text', data: string, fontSize?: number, color?: { r: number; g: number; b: number }) => {
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
      color,
    }
    setOverlays(prev => {
      pushUndo(prev)
      return [...prev, item]
    })
    setSelectedId(item.id)
    setActiveMode(null)
  }, [currentPage, pushUndo])

  /** Add overlay without resetting activeMode (for drawing tools) */
  const addDrawingOverlay = useCallback((data: string, xPct: number, yPct: number, widthPct: number, heightPct: number) => {
    const item: OverlayItem = {
      id: genId(),
      type: 'image',
      pageIndex: currentPage,
      xPct,
      yPct,
      widthPct,
      heightPct,
      data,
    }
    setOverlays(prev => {
      pushUndo(prev)
      return [...prev, item]
    })
  }, [currentPage, pushUndo])

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
    addOverlay('text', textInput.trim(), textFontSize, textColor.rgb)
    setTextInput('')
    setActiveMode(null)
  }, [textInput, textFontSize, textColor, addOverlay])

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
    pushUndo(overlays)
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

  // ===== Drawing (Pencil / Highlighter) handlers =====
  const getDrawCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = drawCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0]
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const drawStartHandler = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeMode !== 'pencil' && activeMode !== 'highlighter') return
    e.preventDefault()
    e.stopPropagation()
    isDrawingRef.current = true
    const pos = getDrawCanvasPos(e)
    drawPointsRef.current = [pos]
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    if (activeMode === 'pencil') {
      ctx.strokeStyle = pencilColor
      ctx.lineWidth = pencilThickness
      ctx.globalAlpha = 1
    } else {
      ctx.strokeStyle = highlighterColor
      ctx.lineWidth = 20
      ctx.globalAlpha = 0.5
    }
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  const drawMoveHandler = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return
    e.preventDefault()
    e.stopPropagation()
    const pos = getDrawCanvasPos(e)
    drawPointsRef.current.push(pos)
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const drawEndHandler = () => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const points = drawPointsRef.current
    if (points.length < 2) {
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }
    // Compute bounding box of the stroke
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of points) {
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
      if (p.x > maxX) maxX = p.x
      if (p.y > maxY) maxY = p.y
    }
    const pad = activeMode === 'highlighter' ? 14 : pencilThickness + 2
    minX = Math.max(0, minX - pad)
    minY = Math.max(0, minY - pad)
    maxX = Math.min(canvas.width, maxX + pad)
    maxY = Math.min(canvas.height, maxY + pad)
    const bw = maxX - minX
    const bh = maxY - minY
    if (bw < 2 || bh < 2) return

    // Draw stroke on a temp canvas with precise bounds
    const tmpCanvas = document.createElement('canvas')
    tmpCanvas.width = bw * 2
    tmpCanvas.height = bh * 2
    const tctx = tmpCanvas.getContext('2d')!
    tctx.scale(2, 2)
    tctx.lineCap = 'round'
    tctx.lineJoin = 'round'
    if (activeMode === 'pencil') {
      tctx.strokeStyle = pencilColor
      tctx.lineWidth = pencilThickness
      tctx.globalAlpha = 1
    } else {
      tctx.strokeStyle = highlighterColor
      tctx.lineWidth = 20
      tctx.globalAlpha = 0.5
    }
    tctx.beginPath()
    tctx.moveTo(points[0].x - minX, points[0].y - minY)
    for (let i = 1; i < points.length; i++) {
      tctx.lineTo(points[i].x - minX, points[i].y - minY)
    }
    tctx.stroke()

    const dataUrl = tmpCanvas.toDataURL('image/png')
    // Convert pixel coords to percentage of page
    const xPct = (minX / canvas.width) * 100
    const yPct = (minY / canvas.height) * 100
    const wPct = (bw / canvas.width) * 100
    const hPct = (bh / canvas.height) * 100
    addDrawingOverlay(dataUrl, xPct, yPct, wPct, hPct)

    // Clear the drawing canvas
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  // ===== Shape drawing handlers =====
  const getShapeCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const pageEl = document.getElementById(`pdf-page-${currentPage}`)
    if (!pageEl) return { x: 0, y: 0 }
    const rect = pageEl.getBoundingClientRect()
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0]
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const shapeStartHandler = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeMode !== 'shapes') return
    e.preventDefault()
    e.stopPropagation()
    const pos = getShapeCanvasPos(e)
    shapeStartRef.current = pos

    const handleMove = (ev: MouseEvent | TouchEvent) => {
      if (!shapeStartRef.current) return
      ev.preventDefault()
      const canvas = shapePreviewRef.current
      if (!canvas) return
      const pageEl = document.getElementById(`pdf-page-${currentPage}`)
      if (!pageEl) return
      const rect = pageEl.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      let cx: number, cy: number
      if ('touches' in ev) {
        const t = (ev as TouchEvent).touches[0]
        cx = t.clientX - rect.left
        cy = t.clientY - rect.top
      } else {
        cx = (ev as MouseEvent).clientX - rect.left
        cy = (ev as MouseEvent).clientY - rect.top
      }
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = shapeColor
      ctx.fillStyle = shapeColor
      ctx.lineWidth = 2
      ctx.globalAlpha = 1
      const sx = shapeStartRef.current.x
      const sy = shapeStartRef.current.y
      drawShapeOnCtx(ctx, shapeType, sx, sy, cx, cy, shapeFill)
    }

    const handleUp = (ev: MouseEvent | TouchEvent) => {
      if (!shapeStartRef.current) return
      const pageEl = document.getElementById(`pdf-page-${currentPage}`)
      if (!pageEl) return
      const rect = pageEl.getBoundingClientRect()
      let cx: number, cy: number
      if ('touches' in ev) {
        const t = (ev as TouchEvent).changedTouches[0]
        cx = t.clientX - rect.left
        cy = t.clientY - rect.top
      } else {
        cx = (ev as MouseEvent).clientX - rect.left
        cy = (ev as MouseEvent).clientY - rect.top
      }
      const sx = shapeStartRef.current.x
      const sy = shapeStartRef.current.y
      shapeStartRef.current = null

      // Create shape as PNG
      const minX = Math.min(sx, cx)
      const minY = Math.min(sy, cy)
      const maxX = Math.max(sx, cx)
      const maxY = Math.max(sy, cy)
      const pad = 4
      const bw = maxX - minX + pad * 2
      const bh = maxY - minY + pad * 2
      if (bw < 4 || bh < 4) return

      const tmpCanvas = document.createElement('canvas')
      tmpCanvas.width = bw * 2
      tmpCanvas.height = bh * 2
      const tctx = tmpCanvas.getContext('2d')!
      tctx.scale(2, 2)
      tctx.strokeStyle = shapeColor
      tctx.fillStyle = shapeColor
      tctx.lineWidth = 2
      drawShapeOnCtx(tctx, shapeType, sx - minX + pad, sy - minY + pad, cx - minX + pad, cy - minY + pad, shapeFill)

      const dataUrl = tmpCanvas.toDataURL('image/png')
      const xPct = (minX - pad) / rect.width * 100
      const yPct = (minY - pad) / rect.height * 100
      const wPct = bw / rect.width * 100
      const hPct = bh / rect.height * 100
      addDrawingOverlay(dataUrl, Math.max(0, xPct), Math.max(0, yPct), wPct, hPct)

      // Clear preview
      const canvas = shapePreviewRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      }

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
          color: o.color,
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
  const currentPageImage = pageImages[currentPage] || null

  return (
    <div className="space-y-4">
      <PdfUploader
        onFiles={handleFiles}
        label={L('PDF файлды таңдаңыз', 'Выберите PDF файл')}
      />

      {file && pageCount > 0 && (
        <>
          {/* File info */}
          <div className="p-3 rounded-xl bg-accent/30 text-sm flex items-center gap-2 min-w-0">
            <span className="shrink-0">📄</span>
            <span className="font-semibold truncate max-w-[200px]">{file.name}</span>
            <span className="text-muted-foreground shrink-0">— {pageCount} {L('бет', 'стр.')}</span>
            {renderingPages && (
              <span className="text-muted-foreground flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                {L('Беттер жүктелуде...', 'Загрузка страниц...')}
              </span>
            )}
          </div>

          {/* Toolbar — Row 1 */}
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
            <button
              onClick={() => setActiveMode(activeMode === 'pencil' ? null : 'pencil')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all min-h-[44px] flex items-center gap-1.5 ${
                activeMode === 'pencil' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border hover:border-primary'
              }`}
            >
              <span>✏️</span> {L('Карандаш', 'Карандаш')}
            </button>
            <button
              onClick={() => setActiveMode(activeMode === 'highlighter' ? null : 'highlighter')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all min-h-[44px] flex items-center gap-1.5 ${
                activeMode === 'highlighter' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border hover:border-primary'
              }`}
            >
              <span>🖍️</span> {L('Маркер', 'Маркер')}
            </button>
          </div>

          {/* Toolbar — Row 2 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveMode(activeMode === 'shapes' ? null : 'shapes')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all min-h-[44px] flex items-center gap-1.5 ${
                activeMode === 'shapes' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border hover:border-primary'
              }`}
            >
              <span>⬜</span> {L('Фигура', 'Фигура')}
            </button>
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="px-3 py-2 rounded-full text-sm font-semibold bg-card border border-border hover:border-primary transition-all disabled:opacity-30 min-h-[44px] flex items-center gap-1"
              title={L('Болдырмау', 'Отменить')}
            >
              <span>↩️</span> {L('Болдырмау', 'Отменить')}
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="px-3 py-2 rounded-full text-sm font-semibold bg-card border border-border hover:border-primary transition-all disabled:opacity-30 min-h-[44px] flex items-center gap-1"
              title={L('Қайтару', 'Повторить')}
            >
              <span>↪️</span> {L('Қайтару', 'Повторить')}
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
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  {L('Түсі', 'Цвет')}
                </label>
                <div className="flex gap-2">
                  {TEXT_COLORS.map(c => (
                    <button
                      key={c.hex}
                      onClick={() => setTextColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
                        textColor.hex === c.hex ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                </div>
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

          {/* Pencil options panel */}
          {activeMode === 'pencil' && (
            <div className="p-4 bg-card border border-border rounded-xl space-y-3">
              <label className="text-xs font-semibold text-muted-foreground block">
                {L('Карандаш — беттегі суретті салыңыз', 'Карандаш — рисуйте на странице')}
              </label>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  {L('Түсі', 'Цвет')}
                </label>
                <div className="flex gap-2">
                  {PENCIL_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setPencilColor(c.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-all min-h-[44px] min-w-[44px] ${
                        pencilColor === c.value ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  {L('Жуандығы', 'Толщина')}: {pencilThickness}px
                </label>
                <div className="flex gap-2">
                  {[{ label: L('Жіңішке', 'Тонкая'), val: 2 }, { label: L('Орташа', 'Средняя'), val: 4 }, { label: L('Қалың', 'Толстая'), val: 6 }].map(t => (
                    <button
                      key={t.val}
                      onClick={() => setPencilThickness(t.val)}
                      className={`px-3 py-2 rounded-full text-xs font-semibold transition-all min-h-[44px] ${
                        pencilThickness === t.val ? 'bg-primary text-primary-foreground' : 'bg-card border border-border hover:border-primary'
                      }`}
                    >
                      {t.label} ({t.val}px)
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Highlighter options panel */}
          {activeMode === 'highlighter' && (
            <div className="p-4 bg-card border border-border rounded-xl space-y-3">
              <label className="text-xs font-semibold text-muted-foreground block">
                {L('Маркер — беттегі мәтінді белгілеңіз', 'Маркер — выделяйте текст на странице')}
              </label>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  {L('Түсі', 'Цвет')}
                </label>
                <div className="flex gap-2">
                  {HIGHLIGHTER_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setHighlighterColor(c.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-all min-h-[44px] min-w-[44px] ${
                        highlighterColor === c.value ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
                      }`}
                      style={{ backgroundColor: c.value, opacity: 0.6 }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Shapes options panel */}
          {activeMode === 'shapes' && (
            <div className="p-4 bg-card border border-border rounded-xl space-y-3">
              <label className="text-xs font-semibold text-muted-foreground block">
                {L('Фигура — беттегі фигураны салыңыз', 'Фигура — нарисуйте фигуру на странице')}
              </label>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  {L('Фигура түрі', 'Тип фигуры')}
                </label>
                <div className="flex gap-2">
                  {([
                    { type: 'rect' as ShapeType, label: L('Тіктөртбұрыш', 'Прямоугольник'), icon: '⬜' },
                    { type: 'circle' as ShapeType, label: L('Шеңбер', 'Круг'), icon: '⭕' },
                    { type: 'line' as ShapeType, label: L('Сызық', 'Линия'), icon: '➖' },
                    { type: 'arrow' as ShapeType, label: L('Бағдарша', 'Стрелка'), icon: '➡️' },
                  ]).map(s => (
                    <button
                      key={s.type}
                      onClick={() => setShapeType(s.type)}
                      className={`px-3 py-2 rounded-full text-xs font-semibold transition-all min-h-[44px] flex items-center gap-1 ${
                        shapeType === s.type ? 'bg-primary text-primary-foreground' : 'bg-card border border-border hover:border-primary'
                      }`}
                    >
                      <span>{s.icon}</span> {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  {L('Түсі', 'Цвет')}
                </label>
                <div className="flex gap-2">
                  {SHAPE_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setShapeColor(c.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-all min-h-[44px] min-w-[44px] ${
                        shapeColor === c.value ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShapeFill(!shapeFill)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all min-h-[44px] ${
                    shapeFill ? 'bg-primary text-primary-foreground' : 'bg-card border border-border hover:border-primary'
                  }`}
                >
                  {shapeFill ? L('Толтырылған', 'С заливкой') : L('Бос', 'Без заливки')}
                </button>
              </div>
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

          {/* Main area: sidebar + page */}
          <div className="flex gap-3">
            {/* Left sidebar — page thumbnails */}
            {pageCount > 1 && (
              <div className="hidden sm:flex flex-col gap-2 w-20 shrink-0 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
                {pageImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                      currentPage === idx
                        ? 'border-primary ring-1 ring-primary/30'
                        : 'border-border hover:border-primary/50'
                    }`}
                    style={{ aspectRatio: `${(pageDims[idx]?.w || PAGE_W) / (pageDims[idx]?.h || PAGE_H)}` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`${idx + 1}`}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-0.5 font-semibold">
                      {idx + 1}
                    </span>
                    {/* Overlay indicator dot */}
                    {overlays.some(o => o.pageIndex === idx) && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
                {/* Show placeholder thumbnails while rendering */}
                {pageImages.length === 0 && renderingPages && Array.from({ length: pageCount }).map((_, idx) => (
                  <div
                    key={`ph-${idx}`}
                    className="rounded-lg border-2 border-border bg-muted/30 flex items-center justify-center shrink-0"
                    style={{ aspectRatio: `${(pageDims[idx]?.w || PAGE_W) / (pageDims[idx]?.h || PAGE_H)}` }}
                  >
                    <span className="text-[9px] text-muted-foreground">{idx + 1}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Page canvas area */}
            <div
              id={`pdf-page-${currentPage}`}
              className="relative mx-auto border border-border rounded-xl overflow-hidden select-none flex-1 touch-none"
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
              {/* Rendered page image background */}
              {currentPageImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={currentPageImage}
                  alt={`${L('Бет', 'Страница')} ${currentPage + 1}`}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  draggable={false}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-white text-muted-foreground/30">
                  {renderingPages ? (
                    <div className="text-center">
                      <span className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin inline-block mb-2" />
                      <p className="text-xs font-semibold">{L('Бет жүктелуде...', 'Загрузка страницы...')}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-5xl mb-2">📄</div>
                      <p className="text-sm font-semibold">{L('Бет', 'Страница')} {currentPage + 1}</p>
                      <p className="text-xs">{Math.round(currentDim.w)} x {Math.round(currentDim.h)} pt</p>
                    </div>
                  )}
                </div>
              )}

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
                      className="w-full h-full flex items-center pointer-events-none overflow-hidden"
                      style={{
                        fontSize: `${item.fontSize || 14}px`,
                        lineHeight: 1.2,
                        color: item.color
                          ? `rgb(${Math.round(item.color.r * 255)}, ${Math.round(item.color.g * 255)}, ${Math.round(item.color.b * 255)})`
                          : '#000000',
                      }}
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

              {/* Drawing canvas for pencil / highlighter */}
              {(activeMode === 'pencil' || activeMode === 'highlighter') && (
                <canvas
                  ref={drawCanvasRef}
                  width={1120}
                  height={Math.round(1120 / aspectRatio)}
                  className="absolute inset-0 w-full h-full z-20"
                  style={{ cursor: 'crosshair' }}
                  onMouseDown={drawStartHandler}
                  onMouseMove={drawMoveHandler}
                  onMouseUp={drawEndHandler}
                  onMouseLeave={drawEndHandler}
                  onTouchStart={drawStartHandler}
                  onTouchMove={drawMoveHandler}
                  onTouchEnd={drawEndHandler}
                />
              )}

              {/* Shape preview canvas */}
              {activeMode === 'shapes' && (
                <canvas
                  ref={shapePreviewRef}
                  width={560}
                  height={Math.round(560 / aspectRatio)}
                  className="absolute inset-0 w-full h-full z-20"
                  style={{ cursor: 'crosshair' }}
                  onMouseDown={shapeStartHandler}
                  onTouchStart={shapeStartHandler}
                />
              )}
            </div>
          </div>

          {/* Mobile page thumbnails (horizontal scroll) */}
          {pageCount > 1 && pageImages.length > 0 && (
            <div className="sm:hidden flex gap-2 overflow-x-auto pb-2">
              {pageImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all shrink-0 w-14 ${
                    currentPage === idx
                      ? 'border-primary ring-1 ring-primary/30'
                      : 'border-border hover:border-primary/50'
                  }`}
                  style={{ aspectRatio: `${(pageDims[idx]?.w || PAGE_W) / (pageDims[idx]?.h || PAGE_H)}` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={`${idx + 1}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-0.5 font-semibold">
                    {idx + 1}
                  </span>
                </button>
              ))}
            </div>
          )}

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
