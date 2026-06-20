'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

interface Props {
  children: React.ReactNode
  currentFecha: string
  currentEtapa?: string
}

function startsInScrollable(target: EventTarget | null): boolean {
  let el = target as HTMLElement | null
  while (el) {
    const style = window.getComputedStyle(el)
    if (style.overflowX === 'auto' || style.overflowX === 'scroll') return true
    if (el.dataset.noSwipe === 'true') return true
    el = el.parentElement
  }
  return false
}

export function SwipeNav({ children, currentFecha, currentEtapa }: Props) {
  const router = useRouter()
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const blocked = useRef(false)
  const [flash, setFlash] = useState<'left' | 'right' | null>(null)

  function onTouchStart(e: React.TouchEvent) {
    // Si el toque empieza en un elemento con scroll horizontal (chips), no swipear
    blocked.current = startsInScrollable(e.target)
    if (blocked.current) return
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (blocked.current || !touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = Math.abs(e.changedTouches[0].clientY - touchStart.current.y)
    touchStart.current = null

    if (Math.abs(dx) < 55 || dy > Math.abs(dx) * 0.7) return
    if (currentEtapa) return

    const dir = dx < 0 ? 'left' : 'right'
    setFlash(dir)
    setTimeout(() => setFlash(null), 300)

    const d = new Date(currentFecha + 'T12:00:00')
    d.setDate(d.getDate() + (dx < 0 ? 1 : -1))
    router.push(`/partidos?fecha=${d.toISOString().slice(0, 10)}`)
  }

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ position: 'relative' }}>
      {/* Flash overlay para confirmar el swipe visualmente */}
      {flash && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99,
          pointerEvents: 'none',
          background: flash === 'left'
            ? 'linear-gradient(to left, rgba(0,104,71,0.15) 0%, transparent 60%)'
            : 'linear-gradient(to right, rgba(0,104,71,0.15) 0%, transparent 60%)',
          animation: 'swipe-flash 0.3s ease-out forwards',
        }} />
      )}
      <style>{`
        @keyframes swipe-flash {
          0% { opacity: 1 }
          100% { opacity: 0 }
        }
      `}</style>
      {children}
    </div>
  )
}
