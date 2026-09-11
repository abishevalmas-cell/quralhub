'use client'
import { useCallback, useRef, useState } from 'react'
import type { CollageDoc } from '@/lib/collage/types'

const HISTORY_LIMIT = 60

/**
 * Document state with undo/redo.
 *
 * `commit` records a history entry, `update` mutates without one — drags call
 * `begin` once at gesture start and then stream `update` calls, so a whole
 * drag collapses into a single undo step.
 */
export function useCollageDoc(initial: CollageDoc) {
  const [doc, setDoc] = useState<CollageDoc>(initial)
  const docRef = useRef<CollageDoc>(initial)
  const past = useRef<CollageDoc[]>([])
  const future = useRef<CollageDoc[]>([])
  const [depth, setDepth] = useState({ past: 0, future: 0 })

  const syncDepth = useCallback(() => {
    setDepth({ past: past.current.length, future: future.current.length })
  }, [])

  const write = useCallback((next: CollageDoc) => {
    docRef.current = next
    setDoc(next)
  }, [])

  const begin = useCallback(() => {
    past.current.push(docRef.current)
    if (past.current.length > HISTORY_LIMIT) past.current.shift()
    future.current = []
    syncDepth()
  }, [syncDepth])

  const update = useCallback((updater: (d: CollageDoc) => CollageDoc) => {
    write(updater(docRef.current))
  }, [write])

  const commit = useCallback((updater: (d: CollageDoc) => CollageDoc) => {
    begin()
    write(updater(docRef.current))
  }, [begin, write])

  const undo = useCallback(() => {
    const prev = past.current.pop()
    if (!prev) return
    future.current.push(docRef.current)
    write(prev)
    syncDepth()
  }, [syncDepth, write])

  const redo = useCallback(() => {
    const next = future.current.pop()
    if (!next) return
    past.current.push(docRef.current)
    write(next)
    syncDepth()
  }, [syncDepth, write])

  const replace = useCallback((next: CollageDoc) => {
    past.current = []
    future.current = []
    write(next)
    syncDepth()
  }, [syncDepth, write])

  return {
    doc,
    docRef,
    begin,
    update,
    commit,
    undo,
    redo,
    replace,
    canUndo: depth.past > 0,
    canRedo: depth.future > 0,
  }
}
