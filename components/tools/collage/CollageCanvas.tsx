'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CollageDoc, CollageItem } from '@/lib/collage/types'
import { SNAP_TOLERANCE } from '@/lib/collage/constants'
import {
  boundsOf,
  centerOf,
  angleBetween,
  resizeByHandle,
  sheetToLocal,
  type Point,
  type ResizeHandle,
} from '@/lib/collage/geometry'

export interface CanvasView {
  zoom: number
  panX: number
  panY: number
}

interface Props {
  doc: CollageDoc
  selectedIds: string[]
  view: CanvasView
  spacePan: boolean
  /** Magic-eraser mode: a click wipes the background region under the cursor */
  eraserMode: boolean
  onSelect: (ids: string[]) => void
  onViewChange: (view: CanvasView) => void
  /** Called once when a gesture starts, so history gets a single entry */
  onGestureStart: () => void
  onItemsChange: (items: CollageItem[]) => void
  onDropFiles: (files: File[]) => void
  /** Seed point in the item's own image pixels */
  onEraseAt: (id: string, px: number, py: number) => void
}

type Gesture =
  | { kind: 'none' }
  | { kind: 'move'; start: Point; origin: Map<string, Point>; id: string; additive: boolean; dragged: boolean }
  | { kind: 'resize'; handle: ResizeHandle; id: string; item: CollageItem }
  | { kind: 'rotate'; id: string; center: Point; startAngle: number; startRotation: number }
  | { kind: 'pan'; startClient: Point; startPan: Point }
  | { kind: 'marquee'; start: Point; current: Point }

interface Guide { axis: 'x' | 'y'; at: number }

const HANDLES: ResizeHandle[] = ['nw', 'ne', 'se', 'sw']

export function CollageCanvas({
  doc,
  selectedIds,
  view,
  spacePan,
  eraserMode,
  onSelect,
  onViewChange,
  onGestureStart,
  onItemsChange,
  onDropFiles,
  onEraseAt,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const gestureRef = useRef<Gesture>({ kind: 'none' })
  const [guides, setGuides] = useState<Guide[]>([])
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const toSheet = useCallback((clientX: number, clientY: number): Point => {
    const rect = sheetRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: (clientX - rect.left) / view.zoom, y: (clientY - rect.top) / view.zoom }
  }, [view.zoom])

  /** Align the moving item to sheet centre, sheet edges and its neighbours */
  const snapMove = useCallback(
    (base: CollageItem, dx: number, dy: number, excludeIds: string[]): { dx: number; dy: number; guides: Guide[] } => {
      const item = { ...base, x: base.x + dx, y: base.y + dy }
      const b = boundsOf(item)
      const tol = SNAP_TOLERANCE / view.zoom

      const others = doc.items.filter(i => i.visible && !excludeIds.includes(i.id))
      const xTargets: number[] = [0, doc.sheet.w / 2, doc.sheet.w]
      const yTargets: number[] = [0, doc.sheet.h / 2, doc.sheet.h]
      others.forEach(o => {
        const ob = boundsOf(o)
        xTargets.push(ob.left, ob.left + ob.w / 2, ob.right)
        yTargets.push(ob.top, ob.top + ob.h / 2, ob.bottom)
      })

      let adjX = 0
      let adjY = 0
      let guideX: number | null = null
      let guideY: number | null = null
      let bestX = tol
      let bestY = tol

      const xEdges = [b.left, b.left + b.w / 2, b.right]
      const yEdges = [b.top, b.top + b.h / 2, b.bottom]

      xEdges.forEach(edge => {
        xTargets.forEach(t => {
          const d = t - edge
          if (Math.abs(d) < bestX) {
            bestX = Math.abs(d)
            adjX = d
            guideX = t
          }
        })
      })
      yEdges.forEach(edge => {
        yTargets.forEach(t => {
          const d = t - edge
          if (Math.abs(d) < bestY) {
            bestY = Math.abs(d)
            adjY = d
            guideY = t
          }
        })
      })

      const guidesOut: Guide[] = []
      if (guideX !== null) guidesOut.push({ axis: 'x', at: guideX })
      if (guideY !== null) guidesOut.push({ axis: 'y', at: guideY })

      return { dx: dx + adjX, dy: dy + adjY, guides: guidesOut }
    },
    [doc.items, doc.sheet.w, doc.sheet.h, view.zoom],
  )

  const startMove = useCallback(
    (e: React.PointerEvent, item: CollageItem) => {
      if (item.locked) return
      e.stopPropagation()

      if (eraserMode && item.kind === 'image') {
        const point = toSheet(e.clientX, e.clientY)
        const local = sheetToLocal(item, point.x, point.y)
        const nx = (local.x / item.w) * item.naturalW
        const ny = (local.y / item.h) * item.naturalH
        onSelect([item.id])
        onEraseAt(item.id, item.flipX ? item.naturalW - nx : nx, ny)
        return
      }

      const additive = e.shiftKey
      const ids = additive
        ? selectedIds.includes(item.id)
          ? selectedIds.filter(id => id !== item.id)
          : [...selectedIds, item.id]
        : selectedIds.includes(item.id)
          ? selectedIds
          : [item.id]
      onSelect(ids)

      const origin = new Map<string, Point>()
      doc.items.filter(i => ids.includes(i.id)).forEach(i => origin.set(i.id, { x: i.x, y: i.y }))

      onGestureStart()
      gestureRef.current = {
        kind: 'move',
        start: toSheet(e.clientX, e.clientY),
        origin,
        id: item.id,
        additive,
        dragged: false,
      }
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    [doc.items, eraserMode, onEraseAt, selectedIds, onSelect, onGestureStart, toSheet],
  )

  const startResize = useCallback(
    (e: React.PointerEvent, handle: ResizeHandle, item: CollageItem) => {
      e.stopPropagation()
      onGestureStart()
      gestureRef.current = { kind: 'resize', handle, id: item.id, item }
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    [onGestureStart],
  )

  const startRotate = useCallback(
    (e: React.PointerEvent, item: CollageItem) => {
      e.stopPropagation()
      onGestureStart()
      const center = centerOf(item)
      gestureRef.current = {
        kind: 'rotate',
        id: item.id,
        center,
        startAngle: angleBetween(center, toSheet(e.clientX, e.clientY)),
        startRotation: item.rotation,
      }
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    [onGestureStart, toSheet],
  )

  const onBackgroundPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const panning = spacePan || e.button === 1
      if (panning) {
        gestureRef.current = {
          kind: 'pan',
          startClient: { x: e.clientX, y: e.clientY },
          startPan: { x: view.panX, y: view.panY },
        }
      } else if (e.button === 0) {
        const p = toSheet(e.clientX, e.clientY)
        gestureRef.current = { kind: 'marquee', start: p, current: p }
        if (!e.shiftKey) onSelect([])
      }
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    [spacePan, view.panX, view.panY, toSheet, onSelect],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const g = gestureRef.current
      if (g.kind === 'none') return

      if (g.kind === 'pan') {
        onViewChange({
          ...view,
          panX: g.startPan.x + (e.clientX - g.startClient.x),
          panY: g.startPan.y + (e.clientY - g.startClient.y),
        })
        return
      }

      const p = toSheet(e.clientX, e.clientY)

      if (g.kind === 'move') {
        const ids = Array.from(g.origin.keys())
        const first = doc.items.find(i => ids.includes(i.id) && !i.locked)
        if (!first) return
        const origin0 = g.origin.get(first.id)!
        let dx = p.x - g.start.x
        let dy = p.y - g.start.y
        if (!g.dragged && Math.abs(dx) + Math.abs(dy) > 2 / view.zoom) g.dragged = true
        if (!e.altKey) {
          const snapped = snapMove({ ...first, x: origin0.x, y: origin0.y }, dx, dy, ids)
          dx = snapped.dx
          dy = snapped.dy
          setGuides(snapped.guides)
        } else {
          setGuides([])
        }
        onItemsChange(
          doc.items.map(i => {
            const origin = g.origin.get(i.id)
            if (!origin || i.locked) return i
            return { ...i, x: origin.x + dx, y: origin.y + dy }
          }),
        )
        return
      }

      if (g.kind === 'resize') {
        const next = resizeByHandle(g.item, g.handle, p, g.item.kind === 'image' ? !e.shiftKey : e.shiftKey)
        onItemsChange(doc.items.map(i => (i.id === g.id ? { ...i, ...next } : i)))
        return
      }

      if (g.kind === 'rotate') {
        const angle = angleBetween(g.center, p)
        let rotation = g.startRotation + (angle - g.startAngle)
        if (e.shiftKey) rotation = Math.round(rotation / 15) * 15
        rotation = Math.round(rotation * 10) / 10
        onItemsChange(doc.items.map(i => (i.id === g.id ? { ...i, rotation } : i)))
        return
      }

      if (g.kind === 'marquee') {
        gestureRef.current = { ...g, current: p }
        setMarquee({
          x: Math.min(g.start.x, p.x),
          y: Math.min(g.start.y, p.y),
          w: Math.abs(p.x - g.start.x),
          h: Math.abs(p.y - g.start.y),
        })
      }
    },
    [doc.items, onItemsChange, onViewChange, snapMove, toSheet, view],
  )

  const onPointerUp = useCallback(() => {
    const g = gestureRef.current
    // A plain click inside a multi-selection narrows it down to that one object
    if (g.kind === 'move' && !g.dragged && !g.additive && selectedIds.length > 1) {
      onSelect([g.id])
    }
    if (g.kind === 'marquee' && marquee && marquee.w > 4 && marquee.h > 4) {
      const hit = doc.items
        .filter(i => i.visible && !i.locked)
        .filter(i => {
          const b = boundsOf(i)
          return b.left < marquee.x + marquee.w && b.right > marquee.x && b.top < marquee.y + marquee.h && b.bottom > marquee.y
        })
        .map(i => i.id)
      onSelect(hit)
    }
    gestureRef.current = { kind: 'none' }
    setGuides([])
    setMarquee(null)
  }, [doc.items, marquee, onSelect, selectedIds])

  // Ctrl/⌘ + wheel zooms around the cursor, plain wheel scrolls the board
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const rect = el.getBoundingClientRect()
        const cx = e.clientX - rect.left
        const cy = e.clientY - rect.top
        const factor = Math.exp(-e.deltaY * 0.0015)
        const zoom = Math.min(4, Math.max(0.05, view.zoom * factor))
        const k = zoom / view.zoom
        onViewChange({
          zoom,
          panX: cx - (cx - view.panX) * k,
          panY: cy - (cy - view.panY) * k,
        })
      } else {
        e.preventDefault()
        onViewChange({
          ...view,
          panX: view.panX - (e.shiftKey ? e.deltaY : e.deltaX),
          panY: view.panY - (e.shiftKey ? 0 : e.deltaY),
        })
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [view, onViewChange])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
      if (files.length) onDropFiles(files)
    },
    [onDropFiles],
  )

  const selected = doc.items.filter(i => selectedIds.includes(i.id))
  const single = selected.length === 1 ? selected[0] : null
  const handleSize = 11 / view.zoom

  return (
    <div
      ref={viewportRef}
      className={`relative flex-1 min-h-[380px] overflow-hidden rounded-2xl border bg-muted/40 ${
        dragOver ? 'border-primary ring-2 ring-primary/30' : 'border-border'
      }`}
      style={{ cursor: spacePan ? 'grab' : 'default', touchAction: 'none' }}
      onPointerDown={onBackgroundPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div
        ref={sheetRef}
        className="absolute origin-top-left shadow-2xl"
        style={{
          width: doc.sheet.w,
          height: doc.sheet.h,
          transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`,
          background: doc.sheet.background === 'transparent'
            ? 'repeating-conic-gradient(#d4d4d4 0% 25%, #ffffff 0% 50%) 50% / 24px 24px'
            : doc.sheet.background,
        }}
      >
        {doc.sheet.backgroundImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={doc.sheet.backgroundImage}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ objectFit: doc.sheet.backgroundFit }}
          />
        )}

        {doc.sheet.showGrid && (
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(100,116,139,.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,.35) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }}
          />
        )}

        {doc.items.map(item => {
          if (!item.visible) return null
          const isSelected = selectedIds.includes(item.id)
          return (
            <div
              key={item.id}
              onPointerDown={e => startMove(e, item)}
              className="absolute select-none"
              style={{
                left: item.x,
                top: item.y,
                width: item.w,
                height: item.h,
                transform: `rotate(${item.rotation}deg)`,
                transformOrigin: 'center',
                opacity: item.opacity,
                cursor: item.locked ? 'not-allowed' : eraserMode ? 'crosshair' : spacePan ? 'grab' : 'move',
                outline: isSelected ? `${1.5 / view.zoom}px solid var(--color-primary)` : undefined,
              }}
            >
              {item.kind === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.src}
                  alt={item.name}
                  draggable={false}
                  className="w-full h-full pointer-events-none"
                  style={{
                    objectFit: 'fill',
                    transform: item.flipX ? 'scaleX(-1)' : undefined,
                    filter: item.shadow
                      ? `drop-shadow(0 ${Math.max(6, item.h * 0.03)}px ${Math.max(12, item.h * 0.06)}px rgba(15,23,42,0.28))`
                      : undefined,
                  }}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center pointer-events-none"
                  style={{
                    fontSize: item.fontSize ?? 32,
                    fontWeight: item.fontWeight ?? 600,
                    color: item.color ?? '#111111',
                    lineHeight: 1.25,
                    textAlign: item.align ?? 'left',
                    justifyContent: item.align === 'center' ? 'center' : item.align === 'right' ? 'flex-end' : 'flex-start',
                    whiteSpace: 'pre-wrap',
                    textShadow: item.shadow ? '0 2px 8px rgba(15,23,42,0.3)' : undefined,
                  }}
                >
                  <span className="w-full">{item.text}</span>
                </div>
              )}
            </div>
          )
        })}

        {/* Transform handles for a single selection */}
        {single && !single.locked && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: single.x,
              top: single.y,
              width: single.w,
              height: single.h,
              transform: `rotate(${single.rotation}deg)`,
              transformOrigin: 'center',
            }}
          >
            <div
              onPointerDown={e => startRotate(e, single)}
              className="absolute rounded-full bg-primary pointer-events-auto"
              style={{
                width: handleSize,
                height: handleSize,
                left: single.w / 2 - handleSize / 2,
                top: -28 / view.zoom,
                cursor: 'grab',
              }}
            />
            <div
              className="absolute bg-primary pointer-events-none"
              style={{ width: 1 / view.zoom, height: 28 / view.zoom - handleSize / 2, left: single.w / 2, top: -28 / view.zoom + handleSize }}
            />
            {HANDLES.map(h => {
              const left = h === 'nw' || h === 'sw' ? 0 : single.w
              const top = h === 'nw' || h === 'ne' ? 0 : single.h
              return (
                <div
                  key={h}
                  onPointerDown={e => startResize(e, h, single)}
                  className="absolute bg-card border-2 border-primary pointer-events-auto"
                  style={{
                    width: handleSize,
                    height: handleSize,
                    left: left - handleSize / 2,
                    top: top - handleSize / 2,
                    borderWidth: 1.5 / view.zoom,
                    borderRadius: 2 / view.zoom,
                    cursor: h === 'nw' || h === 'se' ? 'nwse-resize' : 'nesw-resize',
                  }}
                />
              )
            })}
          </div>
        )}

        {/* Outline for every other selected item */}
        {selected.length > 1 &&
          selected.map(item => (
            <div
              key={`sel-${item.id}`}
              className="absolute pointer-events-none border-primary"
              style={{
                left: item.x,
                top: item.y,
                width: item.w,
                height: item.h,
                transform: `rotate(${item.rotation}deg)`,
                borderWidth: 1.5 / view.zoom,
              }}
            />
          ))}

        {guides.map((g, i) => (
          <div
            key={`g-${i}`}
            className="absolute pointer-events-none bg-rose-500"
            style={
              g.axis === 'x'
                ? { left: g.at, top: 0, width: 1 / view.zoom, height: doc.sheet.h }
                : { top: g.at, left: 0, height: 1 / view.zoom, width: doc.sheet.w }
            }
          />
        ))}

        {marquee && (
          <div
            className="absolute pointer-events-none border border-primary bg-primary/10"
            style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }}
          />
        )}
      </div>
    </div>
  )
}
