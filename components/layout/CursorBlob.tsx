'use client'
import { useRef, useEffect, useCallback } from 'react'

export function CursorBlob() {
  const blobRef = useRef<HTMLDivElement>(null)
  const trailRef = useRef<HTMLDivElement>(null)
  const target = useRef({ x: -500, y: -500 })
  const current = useRef({ x: -500, y: -500 })
  const trail = useRef({ x: -500, y: -500 })
  const rafId = useRef<number>(0)

  const animate = useCallback(() => {
    current.current.x += (target.current.x - current.current.x) * 0.06
    current.current.y += (target.current.y - current.current.y) * 0.06
    trail.current.x += (target.current.x - trail.current.x) * 0.025
    trail.current.y += (target.current.y - trail.current.y) * 0.025

    if (blobRef.current) {
      blobRef.current.style.transform = `translate(${current.current.x - 175}px, ${current.current.y - 175}px)`
    }
    if (trailRef.current) {
      trailRef.current.style.transform = `translate(${trail.current.x - 120}px, ${trail.current.y - 120}px)`
    }
    rafId.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    rafId.current = requestAnimationFrame(animate)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId.current)
    }
  }, [animate])

  return (
    <>
      <div
        ref={blobRef}
        className="fixed top-0 left-0 pointer-events-none z-[1] will-change-transform"
        style={{ transform: 'translate(-500px, -500px)' }}
      >
        <div className="w-[350px] h-[350px] rounded-full opacity-[0.25] dark:opacity-[0.12] blur-[80px] bg-gradient-to-br from-emerald-400 via-cyan-400 to-purple-500" />
      </div>
      <div
        ref={trailRef}
        className="fixed top-0 left-0 pointer-events-none z-[1] will-change-transform"
        style={{ transform: 'translate(-500px, -500px)' }}
      >
        <div className="w-[240px] h-[240px] rounded-full opacity-[0.18] dark:opacity-[0.08] blur-[80px] bg-gradient-to-br from-amber-400 via-rose-400 to-orange-500" />
      </div>
    </>
  )
}
