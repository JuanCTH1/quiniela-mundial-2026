'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'

interface Props {
  children: React.ReactNode
  currentFecha: string
  currentEtapa?: string
}

export function SwipeNav({ children, currentFecha, currentEtapa }: Props) {
  const router = useRouter()
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = Math.abs(e.changedTouches[0].clientY - touchStart.current.y)
    touchStart.current = null

    // Solo navegar si el gesto es más horizontal que vertical y supera 55px
    if (Math.abs(dx) < 55 || dy > Math.abs(dx) * 0.7) return

    // Si hay etapa activa, no navegar por fecha (el swipe es ambiguo ahí)
    if (currentEtapa) return

    const d = new Date(currentFecha + 'T12:00:00')
    d.setDate(d.getDate() + (dx < 0 ? 1 : -1))
    const next = d.toISOString().slice(0, 10)
    router.push(`/partidos?fecha=${next}`)
  }

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {children}
    </div>
  )
}
