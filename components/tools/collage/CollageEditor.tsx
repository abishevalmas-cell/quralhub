'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BackButton } from '@/components/layout/BackButton'
import { useApp } from '@/components/layout/Providers'
import { CollageCanvas, type CanvasView } from './CollageCanvas'
import { ItemInspector } from './ItemInspector'
import { LayersPanel } from './LayersPanel'
import { useCollageDoc } from './useCollageDoc'
import { autoLayout, DEFAULT_LAYOUT_OPTIONS } from '@/lib/collage/layout'
import { exportDoc, downloadBlob } from '@/lib/collage/render'
import { autoCropTransparent, autoCutout, eraseAt, fileToDataUrl, loadImage, prepareItem, downscale } from '@/lib/collage/background'
import { BACKGROUND_SWATCHES, DEFAULT_SHEET, SHEET_PRESETS, STORAGE_KEY } from '@/lib/collage/constants'
import { boundsOf } from '@/lib/collage/geometry'
import type { CollageDoc, CollageItem, LayoutMode } from '@/lib/collage/types'
import { normalizeDoc } from '@/lib/collage/types'

const uid = () => `it_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

const LAYOUT_MODES: { mode: LayoutMode; icon: string; label: [string, string]; hint: [string, string] }[] = [
  { mode: 'shelf', icon: '🛋', label: ['Қатарлар', 'Рядами'], hint: ['Бір деңгейде, масштаб сақталады', 'На одной линии, с сохранением масштаба'] },
  { mode: 'grid', icon: '▦', label: ['Тор', 'Сеткой'], hint: ['Бірдей ұяшықтар', 'Одинаковые ячейки'] },
  { mode: 'hero', icon: '★', label: ['Акцент', 'Акцент'], hint: ['Ірі нысан + қалғаны жанында', 'Крупный объект + остальные рядом'] },
  { mode: 'scatter', icon: '✦', label: ['Еркін', 'Свободно'], hint: ['Шашыраңқы, сәл бұрылған', 'Вразброс, с лёгким наклоном'] },
]

const btn = 'min-h-[38px] px-3 rounded-xl border border-border bg-card text-xs font-semibold hover:border-primary transition-colors disabled:opacity-40 disabled:hover:border-border'
const btnPrimary = 'min-h-[38px] px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40'
const panel = 'bg-card border border-border rounded-2xl'
const sectionTitle = 'text-[11px] font-bold uppercase tracking-wide text-muted-foreground px-3 pt-3'

export function CollageEditor() {
  const { lang } = useApp()
  const L = useCallback((kz: string, ru: string) => (lang === 'ru' ? ru : kz), [lang])

  const { doc, docRef, begin, update, commit, undo, redo, replace, canUndo, canRedo } = useCollageDoc({
    sheet: { ...DEFAULT_SHEET },
    items: [],
  })

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [view, setView] = useState<CanvasView>({ zoom: 0.35, panX: 40, panY: 30 })
  const [spacePan, setSpacePan] = useState(false)
  const [removeBgOnImport, setRemoveBgOnImport] = useState(true)
  const [tolerance, setTolerance] = useState(32)
  const [keepMain, setKeepMain] = useState(true)
  const [eraserMode, setEraserMode] = useState(false)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('shelf')
  const [keepScale, setKeepScale] = useState(true)
  const [density, setDensity] = useState(DEFAULT_LAYOUT_OPTIONS.density)
  const [gap, setGap] = useState(DEFAULT_LAYOUT_OPTIONS.gap)
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('png')
  const [exportScale, setExportScale] = useState(1)
  const [busy, setBusy] = useState('')
  const [processing, setProcessing] = useState(false)
  const [notice, setNotice] = useState('')

  const stageRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bgInputRef = useRef<HTMLInputElement>(null)
  const projectInputRef = useRef<HTMLInputElement>(null)
  const restoredRef = useRef(false)

  const selected = doc.items.filter(i => selectedIds.includes(i.id))
  const single = selected.length === 1 ? selected[0] : null

  /* ---------------------------------------------------------------- view */

  const fitToScreen = useCallback(() => {
    const el = stageRef.current
    if (!el) return
    const { clientWidth: w, clientHeight: h } = el
    const sheet = docRef.current.sheet
    if (!w || !h) return
    const zoom = Math.min(w / sheet.w, h / sheet.h) * 0.92
    setView({
      zoom,
      panX: (w - sheet.w * zoom) / 2,
      panY: (h - sheet.h * zoom) / 2,
    })
  }, [docRef])

  useEffect(() => {
    const t = setTimeout(fitToScreen, 60)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.sheet.w, doc.sheet.h])

  // Re-fit when the stage itself changes size (rotation, window resize)
  useEffect(() => {
    const el = stageRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    let last = `${el.clientWidth}x${el.clientHeight}`
    let timer: ReturnType<typeof setTimeout>
    const ro = new ResizeObserver(() => {
      const size = `${el.clientWidth}x${el.clientHeight}`
      if (size === last) return
      last = size
      clearTimeout(timer)
      timer = setTimeout(fitToScreen, 150)
    })
    ro.observe(el)
    return () => {
      clearTimeout(timer)
      ro.disconnect()
    }
  }, [fitToScreen])

  const zoomBy = useCallback((factor: number) => {
    setView(v => {
      const el = stageRef.current
      const cx = (el?.clientWidth ?? 600) / 2
      const cy = (el?.clientHeight ?? 400) / 2
      const zoom = Math.min(4, Math.max(0.05, v.zoom * factor))
      const k = zoom / v.zoom
      return { zoom, panX: cx - (cx - v.panX) * k, panY: cy - (cy - v.panY) * k }
    })
  }, [])

  /* -------------------------------------------------------------- import */

  const addFiles = useCallback(async (files: File[]) => {
    const images = files.filter(f => f.type.startsWith('image/'))
    if (!images.length) return

    const created: CollageItem[] = []
    let failed = 0
    let weak = 0

    for (let i = 0; i < images.length; i++) {
      setBusy(L(`Өңделуде ${i + 1}/${images.length}`, `Обработка ${i + 1}/${images.length}`))
      try {
        // Give the progress counter a frame before the segmentation blocks
        await new Promise(r => setTimeout(r, 0))
        const prepared = await prepareItem(images[i], {
          removeBg: removeBgOnImport,
          options: { tolerance, keepMain, feather: 1 },
        })
        const sheet = docRef.current.sheet
        const ar = prepared.width / Math.max(prepared.height, 1)
        let w = sheet.w * 0.24
        let h = w / ar
        const maxH = sheet.h * 0.45
        if (h > maxH) {
          h = maxH
          w = h * ar
        }
        if (removeBgOnImport && (prepared.method === 'none' || prepared.confidence === 'low')) weak++
        const n = docRef.current.items.length + created.length
        created.push({
          id: uid(),
          kind: 'image',
          name: images[i].name.replace(/\.[^.]+$/, '').slice(0, 40),
          src: prepared.src,
          originalSrc: prepared.originalSrc,
          cutoutSrc: prepared.cutoutSrc,
          bgRemoved: removeBgOnImport && prepared.method !== 'none',
          cutoutMethod: prepared.method,
          tolerance,
          keepMain,
          naturalW: prepared.width,
          naturalH: prepared.height,
          x: sheet.w / 2 - w / 2 + (n % 6) * 30,
          y: sheet.h / 2 - h / 2 + (n % 6) * 30,
          w,
          h,
          rotation: 0,
          opacity: 1,
          flipX: false,
          shadow: false,
          locked: false,
          visible: true,
        })
      } catch {
        failed++
      }
    }

    setBusy('')
    if (created.length) {
      commit(d => ({ ...d, items: [...d.items, ...created] }))
      setSelectedIds(created.map(c => c.id))
    }
    if (failed) {
      setNotice(L(`${failed} файл өңделмеді`, `Не удалось обработать файлов: ${failed}`))
      setTimeout(() => setNotice(''), 5000)
    } else if (weak) {
      setNotice(L(
        `${weak} суреттің фоны күрделі — «Фонды өшіру» режимін қосып, фонды басыңыз`,
        `У ${weak} фото сложный фон — включите «Стереть фон кликом» в свойствах и щёлкните по фону`,
      ))
      setTimeout(() => setNotice(''), 7000)
    }
  }, [L, commit, docRef, keepMain, removeBgOnImport, tolerance])

  const addText = useCallback(() => {
    const sheet = docRef.current.sheet
    const w = sheet.w * 0.32
    const h = sheet.h * 0.09
    commit(d => ({
      ...d,
      items: [...d.items, {
        id: uid(),
        kind: 'text',
        name: L('Жазу', 'Надпись'),
        text: L('Атауы · баға', 'Название · цена'),
        src: '',
        originalSrc: '',
        bgRemoved: false,
        cutoutMethod: 'none',
        tolerance,
        keepMain,
        naturalW: w,
        naturalH: h,
        fontSize: Math.round(sheet.h * 0.034),
        fontWeight: 600,
        color: '#111111',
        align: 'left',
        x: sheet.w * 0.08,
        y: sheet.h * 0.08,
        w,
        h,
        rotation: 0,
        opacity: 1,
        flipX: false,
        shadow: false,
        locked: false,
        visible: true,
      }],
    }))
  }, [L, commit, docRef, keepMain, tolerance])

  /* ---------------------------------------------------------- item edits */

  const patchItem = useCallback((id: string, patch: Partial<CollageItem>, record = true) => {
    const apply = (d: CollageDoc) => ({
      ...d,
      items: d.items.map(i => (i.id === id ? { ...i, ...patch } : i)),
    })
    if (record) commit(apply)
    else update(apply)
  }, [commit, update])

  /**
   * Inspector edits open a history entry on the first change and close it on
   * blur / pointer-up, so dragging a slider stays one undo step.
   */
  const editingRef = useRef(false)

  const patchSelected = useCallback((patch: Partial<CollageItem>) => {
    if (!single) return
    if (!editingRef.current) {
      begin()
      editingRef.current = true
    }
    patchItem(single.id, patch, false)
  }, [begin, single, patchItem])

  const endEdit = useCallback(() => {
    editingRef.current = false
  }, [])

  useEffect(() => {
    editingRef.current = false
  }, [selectedIds])

  const deleteSelected = useCallback(() => {
    if (!selectedIds.length) return
    commit(d => ({ ...d, items: d.items.filter(i => !selectedIds.includes(i.id) || i.locked) }))
    setSelectedIds([])
  }, [commit, selectedIds])

  const duplicateSelected = useCallback(() => {
    if (!selectedIds.length) return
    const copies: CollageItem[] = []
    commit(d => {
      d.items.filter(i => selectedIds.includes(i.id)).forEach(i => {
        copies.push({ ...i, id: uid(), x: i.x + 30, y: i.y + 30, locked: false })
      })
      return { ...d, items: [...d.items, ...copies] }
    })
    setSelectedIds(copies.map(c => c.id))
  }, [commit, selectedIds])

  const reorder = useCallback((op: 'front' | 'forward' | 'backward' | 'back') => {
    if (!single) return
    commit(d => {
      const items = d.items.slice()
      const idx = items.findIndex(i => i.id === single.id)
      if (idx < 0) return d
      const [it] = items.splice(idx, 1)
      const target =
        op === 'front' ? items.length
          : op === 'back' ? 0
            : op === 'forward' ? Math.min(items.length, idx + 1)
              : Math.max(0, idx - 1)
      items.splice(target, 0, it)
      return { ...d, items }
    })
  }, [commit, single])

  const moveLayer = useCallback((id: string, dir: 'up' | 'down') => {
    commit(d => {
      const items = d.items.slice()
      const idx = items.findIndex(i => i.id === id)
      const target = dir === 'up' ? idx + 1 : idx - 1
      if (idx < 0 || target < 0 || target >= items.length) return d
      ;[items[idx], items[target]] = [items[target], items[idx]]
      return { ...d, items }
    })
  }, [commit])

  const align = useCallback((op: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') => {
    if (!selectedIds.length) return
    commit(d => ({
      ...d,
      items: d.items.map(i => {
        if (!selectedIds.includes(i.id) || i.locked) return i
        const b = boundsOf(i)
        switch (op) {
          case 'left': return { ...i, x: i.x - b.left }
          case 'right': return { ...i, x: i.x + (d.sheet.w - b.right) }
          case 'hcenter': return { ...i, x: i.x + (d.sheet.w / 2 - (b.left + b.w / 2)) }
          case 'top': return { ...i, y: i.y - b.top }
          case 'bottom': return { ...i, y: i.y + (d.sheet.h - b.bottom) }
          case 'vcenter': return { ...i, y: i.y + (d.sheet.h / 2 - (b.top + b.h / 2)) }
          default: return i
        }
      }),
    }))
  }, [commit, selectedIds])

  const fitSelectedToSheet = useCallback(() => {
    if (!single) return
    commit(d => ({
      ...d,
      items: d.items.map(i => {
        if (i.id !== single.id) return i
        const pad = Math.min(d.sheet.w, d.sheet.h) * 0.06
        const availW = d.sheet.w - pad * 2
        const availH = d.sheet.h - pad * 2
        const ar = i.w / i.h
        let w = availW
        let h = w / ar
        if (h > availH) {
          h = availH
          w = h * ar
        }
        return { ...i, w, h, x: (d.sheet.w - w) / 2, y: (d.sheet.h - h) / 2, rotation: 0 }
      }),
    }))
  }, [commit, single])

  const nudge = useCallback((dx: number, dy: number) => {
    if (!selectedIds.length) return
    commit(d => ({
      ...d,
      items: d.items.map(i => (selectedIds.includes(i.id) && !i.locked ? { ...i, x: i.x + dx, y: i.y + dy } : i)),
    }))
  }, [commit, selectedIds])

  /* ------------------------------------------------------- background op */

  /** Swap an item's picture while keeping it centred where it already sits */
  const swapSource = useCallback((
    item: CollageItem,
    src: string,
    width: number,
    height: number,
    extra: Partial<CollageItem> = {},
  ) => {
    const cx = item.x + item.w / 2
    const cy = item.y + item.h / 2
    const w = item.w
    const h = w / (width / Math.max(height, 1))
    patchItem(item.id, {
      src,
      naturalW: width,
      naturalH: height,
      w,
      h,
      x: cx - w / 2,
      y: cy - h / 2,
      ...extra,
    })
  }, [patchItem])

  const warn = useCallback((kz: string, ru: string) => {
    setNotice(L(kz, ru))
    setTimeout(() => setNotice(''), 5000)
  }, [L])

  /** Turn the cutout on or off for the selected object */
  const applyCutout = useCallback(async (enabled: boolean) => {
    if (!single || single.kind !== 'image') return
    setProcessing(true)
    try {
      if (!enabled) {
        const img = await loadImage(single.originalSrc)
        swapSource(single, single.originalSrc, img.naturalWidth, img.naturalHeight, {
          bgRemoved: false,
          cutoutMethod: 'none',
        })
      } else if (single.cutoutSrc) {
        const img = await loadImage(single.cutoutSrc)
        swapSource(single, single.cutoutSrc, img.naturalWidth, img.naturalHeight, { bgRemoved: true })
      } else {
        const cut = await autoCutout(single.originalSrc, {
          tolerance: single.tolerance,
          keepMain: single.keepMain,
          feather: 1,
        })
        if (cut.method === 'none') {
          warn('Фон автоматты анықталмады', 'Фон не определился — попробуйте ползунок точности или ластик')
          return
        }
        swapSource(single, cut.dataUrl, cut.width, cut.height, {
          cutoutSrc: cut.dataUrl,
          bgRemoved: true,
          cutoutMethod: cut.method,
        })
      }
    } catch {
      warn('Фонды өңдеу қатесі', 'Ошибка обработки фона')
    } finally {
      setProcessing(false)
    }
  }, [single, swapSource, warn])

  /** Re-detect the subject with different settings */
  const recutSelected = useCallback(async (patch: { tolerance?: number; keepMain?: boolean }) => {
    if (!single || single.kind !== 'image') return
    const next = {
      tolerance: patch.tolerance ?? single.tolerance,
      keepMain: patch.keepMain ?? single.keepMain,
      feather: 1,
    }
    setProcessing(true)
    try {
      const cut = await autoCutout(single.originalSrc, next)
      if (cut.method === 'none') {
        patchItem(single.id, { tolerance: next.tolerance, keepMain: next.keepMain })
        warn('Фон автоматты анықталмады', 'Фон не определился — попробуйте другое значение точности')
        return
      }
      swapSource(single, cut.dataUrl, cut.width, cut.height, {
        cutoutSrc: cut.dataUrl,
        bgRemoved: true,
        cutoutMethod: cut.method,
        tolerance: next.tolerance,
        keepMain: next.keepMain,
      })
    } catch {
      warn('Фонды өңдеу қатесі', 'Ошибка обработки фона')
    } finally {
      setProcessing(false)
    }
  }, [patchItem, single, swapSource, warn])

  /** Magic eraser — the designer clicks a leftover piece of background */
  const eraseOnItem = useCallback(async (id: string, px: number, py: number) => {
    const item = docRef.current.items.find(i => i.id === id)
    if (!item || item.kind !== 'image') return
    setProcessing(true)
    try {
      const erased = await eraseAt(item.src, px, py, item.tolerance)
      if (erased.removedRatio < 0.0005) {
        warn('Бұл жерде өшіретін ештеңе жоқ', 'Здесь нечего стирать — щёлкните по фону предмета')
        return
      }
      patchItem(id, { src: erased.dataUrl, cutoutSrc: erased.dataUrl, bgRemoved: true })
    } catch {
      warn('Фонды өңдеу қатесі', 'Ошибка обработки фона')
    } finally {
      setProcessing(false)
    }
  }, [docRef, patchItem, warn])

  /** Crop the transparent margin away and keep the object where it is */
  const cropSelected = useCallback(async () => {
    if (!single || single.kind !== 'image') return
    setProcessing(true)
    try {
      const cropped = await autoCropTransparent(single.src)
      if (cropped.width === single.naturalW && cropped.height === single.naturalH) return
      const scale = single.w / single.naturalW
      const box = { w: cropped.width * scale, h: cropped.height * scale }
      const cx = single.x + single.w / 2
      const cy = single.y + single.h / 2
      patchItem(single.id, {
        src: cropped.dataUrl,
        cutoutSrc: cropped.dataUrl,
        naturalW: cropped.width,
        naturalH: cropped.height,
        w: box.w,
        h: box.h,
        x: cx - box.w / 2,
        y: cy - box.h / 2,
      })
    } catch {
      warn('Қию қатесі', 'Не удалось обрезать')
    } finally {
      setProcessing(false)
    }
  }, [patchItem, single, warn])

  /* ------------------------------------------------------------- layouts */

  const runAutoLayout = useCallback((mode: LayoutMode) => {
    setLayoutMode(mode)
    commit(d => {
      const targets = d.items.filter(i => i.visible && !i.locked)
      if (!targets.length) return d
      const laid = autoLayout(targets, d.sheet, mode, { keepScale, density, gap })
      const map = new Map(laid.map(i => [i.id, i]))
      return { ...d, items: d.items.map(i => map.get(i.id) ?? i) }
    })
  }, [commit, density, gap, keepScale])

  /* -------------------------------------------------------------- export */

  const handleExport = useCallback(async () => {
    setBusy(L('Экспорт...', 'Экспорт...'))
    try {
      const blob = await exportDoc(docRef.current, {
        scale: exportScale,
        format: exportFormat,
        quality: 0.92,
      })
      downloadBlob(blob, `myterior-collage-${Date.now()}.${exportFormat === 'jpeg' ? 'jpg' : 'png'}`)
    } catch {
      setNotice(L('Экспорт қатесі', 'Ошибка экспорта'))
      setTimeout(() => setNotice(''), 4000)
    } finally {
      setBusy('')
    }
  }, [L, docRef, exportFormat, exportScale])

  const saveProject = useCallback(() => {
    const blob = new Blob([JSON.stringify(docRef.current)], { type: 'application/json' })
    downloadBlob(blob, `myterior-collage-${Date.now()}.json`)
  }, [docRef])

  const loadProject = useCallback(async (file: File) => {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!parsed?.sheet || !Array.isArray(parsed.items)) throw new Error('bad file')
      replace(normalizeDoc(parsed))
      setSelectedIds([])
      setTimeout(fitToScreen, 60)
    } catch {
      setNotice(L('Жоба файлы оқылмады', 'Не удалось открыть файл проекта'))
      setTimeout(() => setNotice(''), 4000)
    }
  }, [L, fitToScreen, replace])

  const clearSheet = useCallback(() => {
    commit(d => ({ ...d, items: [] }))
    setSelectedIds([])
  }, [commit])

  /* ------------------------------------------------------- sheet options */

  const setSheet = useCallback((patch: Partial<CollageDoc['sheet']>) => {
    commit(d => ({ ...d, sheet: { ...d.sheet, ...patch } }))
  }, [commit])

  const setSheetBgImage = useCallback(async (file: File) => {
    try {
      const raw = await fileToDataUrl(file)
      const scaled = await downscale(raw, 2000)
      setSheet({ backgroundImage: scaled.dataUrl })
    } catch {
      setNotice(L('Сурет жүктелмеді', 'Не удалось загрузить изображение'))
      setTimeout(() => setNotice(''), 4000)
    }
  }, [L, setSheet])

  /* ------------------------------------------------ autosave and restore */

  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (parsed?.sheet && Array.isArray(parsed.items) && parsed.items.length) {
        replace(normalizeDoc(parsed))
        setNotice(L('Соңғы коллаж қалпына келтірілді', 'Восстановлен последний коллаж'))
        setTimeout(() => setNotice(''), 4000)
      }
    } catch {
      /* ignore a corrupted autosave */
    }
  }, [L, replace])

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const json = JSON.stringify(doc)
        // Data URLs get big fast — skip the autosave instead of throwing
        if (json.length < 4_000_000) localStorage.setItem(STORAGE_KEY, json)
      } catch {
        /* quota exceeded — the project can still be saved to a file */
      }
    }, 900)
    return () => clearTimeout(t)
  }, [doc])

  /* ----------------------------------------------------------- shortcuts */

  useEffect(() => {
    const isTyping = (t: EventTarget | null) =>
      t instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping(e.target)) {
        setSpacePan(true)
        e.preventDefault()
        return
      }
      if (isTyping(e.target)) return
      const mod = e.ctrlKey || e.metaKey

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo(); else undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); return }
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setSelectedIds(docRef.current.items.filter(i => i.visible && !i.locked).map(i => i.id))
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); return }
      if (e.key === 'Escape') { setSelectedIds([]); return }
      if (e.key === ']') { reorder('forward'); return }
      if (e.key === '[') { reorder('backward'); return }
      if (e.key.startsWith('Arrow')) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        if (e.key === 'ArrowLeft') nudge(-step, 0)
        if (e.key === 'ArrowRight') nudge(step, 0)
        if (e.key === 'ArrowUp') nudge(0, -step)
        if (e.key === 'ArrowDown') nudge(0, step)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePan(false)
    }
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter(f => f.type.startsWith('image/'))
      if (files.length) {
        e.preventDefault()
        void addFiles(files)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('paste', onPaste)
    }
  }, [addFiles, deleteSelected, docRef, duplicateSelected, nudge, redo, reorder, undo])

  /* ------------------------------------------------------------- render */

  const presetId = SHEET_PRESETS.find(p => p.w === doc.sheet.w && p.h === doc.sheet.h)?.id ?? 'custom'

  return (
    <div className="max-w-[1560px] mx-auto px-4 sm:px-5 pb-16">
      <BackButton />

      <header className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {L('MyTerior — коллаж жинау', 'MyTerior — сборка коллажа')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-[70ch]">
          {L(
            'Кез келген суретті жүктеңіз — зат автоматты түрде танылып, фоны алынады. Содан кейін еркін параққа орналастырыңыз. Барлығы браузерде — файлдар серверге жіберілмейді.',
            'Загрузите любое фото — предмет определяется сам, фон убирается автоматически. Дальше раскладывайте по свободному листу. Всё считается в браузере, файлы никуда не отправляются.',
          )}
        </p>
      </header>

      {notice && (
        <div className="mb-3 p-2.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold">
          {notice}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-3">
        {/* ------------------------------------------------ left controls */}
        <aside className="order-2 lg:order-1 lg:w-[286px] shrink-0 space-y-3">
          <div className={panel}>
            <p className={sectionTitle}>{L('Заттар', 'Предметы')}</p>
            <div className="p-3 space-y-2">
              <button onClick={() => fileInputRef.current?.click()} className={`${btnPrimary} w-full`}>
                {L('Суреттерді жүктеу', 'Загрузить фото предметов')}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => {
                  void addFiles(Array.from(e.target.files ?? []))
                  e.target.value = ''
                }}
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeBgOnImport}
                  onChange={e => setRemoveBgOnImport(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-xs font-semibold">{L('Жүктегенде фонды алу', 'Убирать фон при загрузке')}</span>
              </label>
              {removeBgOnImport && (
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground">
                    {L(
                      'Кез келген сурет: ақ, түрлі-түсті немесе градиент фон — зат автоматты табылады. Мөлдір PNG сол күйінде қалады.',
                      'Любое фото: белый, цветной или градиентный фон — предмет определяется автоматически. Прозрачный PNG берётся как есть.',
                    )}
                  </p>
                  <div>
                    <span className="text-[11px] text-muted-foreground">
                      {L('Дәлдік', 'Точность выделения')}: {tolerance}
                    </span>
                    <input
                      type="range"
                      min={8}
                      max={80}
                      value={tolerance}
                      onChange={e => setTolerance(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{L('Дәл', 'Аккуратно')}</span>
                      <span>{L('Батыл', 'Агрессивно')}</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={keepMain}
                      onChange={e => setKeepMain(e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-xs font-semibold">{L('Тек негізгі зат', 'Только главный предмет')}</span>
                  </label>
                </div>
              )}
              <button onClick={addText} className={`${btn} w-full`}>
                {L('Жазу қосу', 'Добавить надпись')}
              </button>
            </div>
          </div>

          <div className={panel}>
            <p className={sectionTitle}>{L('Автожинау', 'Автосборка')}</p>
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                {LAYOUT_MODES.map(m => (
                  <button
                    key={m.mode}
                    onClick={() => runAutoLayout(m.mode)}
                    title={L(m.hint[0], m.hint[1])}
                    className={`${btn} !px-2 flex flex-col items-center justify-center py-1.5 ${
                      layoutMode === m.mode ? '!border-primary !bg-primary/10' : ''
                    }`}
                  >
                    <span className="text-base leading-none">{m.icon}</span>
                    <span className="mt-0.5">{L(m.label[0], m.label[1])}</span>
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepScale}
                  onChange={e => setKeepScale(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-xs font-semibold">{L('Пропорцияларды сақтау', 'Сохранять пропорции предметов')}</span>
              </label>
              <div>
                <span className="text-[11px] text-muted-foreground">
                  {L('Толтыру', 'Заполнение')}: {Math.round(density * 100)}%
                </span>
                <input
                  type="range" min={0.2} max={0.75} step={0.01}
                  value={density}
                  onChange={e => setDensity(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">{L('Аралық', 'Отступ')}: {gap}px</span>
                <input
                  type="range" min={0} max={140} step={2}
                  value={gap}
                  onChange={e => setGap(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <button onClick={() => runAutoLayout(layoutMode)} className={`${btn} w-full`}>
                {L('Қайта жинау', 'Пересобрать')}
              </button>
            </div>
          </div>

          <div className={panel}>
            <p className={sectionTitle}>{L('Парақ', 'Лист')}</p>
            <div className="p-3 space-y-2">
              <select
                value={presetId}
                onChange={e => {
                  const preset = SHEET_PRESETS.find(p => p.id === e.target.value)
                  if (preset) setSheet({ w: preset.w, h: preset.h })
                }}
                className="w-full h-9 px-2 rounded-lg bg-background border border-border text-xs"
              >
                {presetId === 'custom' && <option value="custom">{L('Өз өлшемі', 'Свой размер')}</option>}
                {SHEET_PRESETS.map(p => (
                  <option key={p.id} value={p.id}>{L(p.name[0], p.name[1])} · {p.w}×{p.h}</option>
                ))}
              </select>

              <div className="flex flex-wrap gap-1.5">
                {BACKGROUND_SWATCHES.map(c => (
                  <button
                    key={c}
                    onClick={() => setSheet({ background: c })}
                    className={`w-7 h-7 rounded-lg border-2 ${doc.sheet.background === c ? 'border-primary' : 'border-border'}`}
                    style={{
                      background: c === 'transparent'
                        ? 'repeating-conic-gradient(#d4d4d4 0% 25%, #fff 0% 50%) 50% / 10px 10px'
                        : c,
                    }}
                    title={c}
                  />
                ))}
                <input
                  type="color"
                  value={doc.sheet.background === 'transparent' ? '#ffffff' : doc.sheet.background}
                  onChange={e => setSheet({ background: e.target.value })}
                  className="w-7 h-7 rounded-lg border border-border bg-background p-0"
                  title={L('Өз түсі', 'Свой цвет')}
                />
              </div>

              <div className="flex gap-1.5">
                <button onClick={() => bgInputRef.current?.click()} className={`${btn} flex-1 !px-2`}>
                  {L('Фон суреті', 'Фон-картинка')}
                </button>
                {doc.sheet.backgroundImage && (
                  <button onClick={() => setSheet({ backgroundImage: undefined })} className={`${btn} !px-2`}>✕</button>
                )}
              </div>
              <input
                ref={bgInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) void setSheetBgImage(f)
                  e.target.value = ''
                }}
              />

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={doc.sheet.showGrid}
                  onChange={e => setSheet({ showGrid: e.target.checked })}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-xs font-semibold">{L('Тор', 'Сетка')}</span>
              </label>
            </div>
          </div>

          <div className={panel}>
            <p className={sectionTitle}>{L('Сақтау', 'Сохранение')}</p>
            <div className="p-3 space-y-2">
              <div className="flex gap-1.5">
                {(['png', 'jpeg'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setExportFormat(f)}
                    className={`${btn} flex-1 !px-2 ${exportFormat === f ? '!border-primary !bg-primary/10' : ''}`}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
                {[1, 2].map(s => (
                  <button
                    key={s}
                    onClick={() => setExportScale(s)}
                    className={`${btn} !px-2 ${exportScale === s ? '!border-primary !bg-primary/10' : ''}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
              <button onClick={handleExport} disabled={!doc.items.length} className={`${btnPrimary} w-full`}>
                {L('Суретті жүктеу', 'Скачать коллаж')}
              </button>
              <div className="flex gap-1.5">
                <button onClick={saveProject} className={`${btn} flex-1 !px-2`}>{L('Жоба', 'Проект')} ↓</button>
                <button onClick={() => projectInputRef.current?.click()} className={`${btn} flex-1 !px-2`}>{L('Жоба', 'Проект')} ↑</button>
              </div>
              <input
                ref={projectInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) void loadProject(f)
                  e.target.value = ''
                }}
              />
              <button onClick={clearSheet} className={`${btn} w-full !text-red-600 dark:!text-red-400`}>
                {L('Парақты тазалау', 'Очистить лист')}
              </button>
            </div>
          </div>
        </aside>

        {/* ------------------------------------------------------- canvas */}
        <section className="order-1 lg:order-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <button onClick={undo} disabled={!canUndo} className={btn} title="Ctrl+Z">↶</button>
            <button onClick={redo} disabled={!canRedo} className={btn} title="Ctrl+Shift+Z">↷</button>
            <span className="w-px h-6 bg-border mx-1" />
            <button onClick={() => zoomBy(1 / 1.2)} className={btn}>−</button>
            <span className="text-xs font-semibold tabular-nums w-12 text-center">{Math.round(view.zoom * 100)}%</span>
            <button onClick={() => zoomBy(1.2)} className={btn}>+</button>
            <button onClick={fitToScreen} className={btn}>{L('Сыйдыру', 'Вписать')}</button>
            <span className="w-px h-6 bg-border mx-1" />
            <button onClick={duplicateSelected} disabled={!selectedIds.length} className={btn} title="Ctrl+D">
              {L('Көшіру', 'Дубль')}
            </button>
            <button onClick={deleteSelected} disabled={!selectedIds.length} className={btn}>
              {L('Жою', 'Удалить')}
            </button>
            <span className="ml-auto text-[11px] text-muted-foreground hidden sm:block">
              {L('Space — жылжыту · Alt — байланусыз · Shift — 15°',
                 'Space — панорама · Alt — без привязки · Shift — шаг 15°')}
            </span>
          </div>

          <div ref={stageRef} className="relative flex h-[56vh] lg:h-[calc(100vh-240px)] min-h-[360px]">
            <CollageCanvas
              doc={doc}
              selectedIds={selectedIds}
              view={view}
              spacePan={spacePan}
              eraserMode={eraserMode}
              onSelect={setSelectedIds}
              onViewChange={setView}
              onGestureStart={begin}
              onItemsChange={items => update(d => ({ ...d, items }))}
              onDropFiles={files => void addFiles(files)}
              onEraseAt={(id, px, py) => void eraseOnItem(id, px, py)}
            />
            {busy && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm rounded-2xl">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  {busy}
                </div>
              </div>
            )}
            {!doc.items.length && !busy && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-xs text-muted-foreground text-center px-6">
                  {L(
                    'Суреттерді осында сүйреңіз немесе «Суреттерді жүктеу» батырмасын басыңыз',
                    'Перетащите фото предметов сюда или нажмите «Загрузить фото предметов»',
                  )}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ------------------------------------------------- right panels */}
        <aside className="order-3 lg:w-[300px] shrink-0 space-y-3">
          <div className={panel}>
            <p className={sectionTitle}>{L('Қабаттар', 'Слои')}</p>
            <LayersPanel
              items={doc.items}
              selectedIds={selectedIds}
              onSelect={setSelectedIds}
              onPatch={(id, patch) => patchItem(id, patch)}
              onMove={moveLayer}
              onDelete={id => {
                commit(d => ({ ...d, items: d.items.filter(i => i.id !== id) }))
                setSelectedIds(ids => ids.filter(x => x !== id))
              }}
            />
          </div>

          <div className={panel}>
            <p className={sectionTitle}>{L('Қасиеттері', 'Свойства')}</p>
            <ItemInspector
              item={single}
              selectedCount={selected.length}
              processing={processing}
              onChange={patchSelected}
              onCommit={endEdit}
              onToggleBg={enabled => void applyCutout(enabled)}
              onRecut={patch => void recutSelected(patch)}
              onErase={() => setEraserMode(v => !v)}
              eraserMode={eraserMode}
              onCrop={() => void cropSelected()}
              onOrder={reorder}
              onAlign={align}
              onDuplicate={duplicateSelected}
              onDelete={deleteSelected}
              onFitToSheet={fitSelectedToSheet}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
