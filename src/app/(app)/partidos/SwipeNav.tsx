'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface Props {
  children: React.ReactNode
  currentFecha: string
  currentEtapa?: string
  primaryColor?: string
  scrollToNextMatch?: boolean
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

export function SwipeNav({ children, currentFecha, currentEtapa, primaryColor = '#006847', scrollToNextMatch }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!scrollToNextMatch) return
    const t = setTimeout(() => {
      document.getElementById('next-match')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    return () => clearTimeout(t)
  }, [scrollToNextMatch, searchParams])
  const blocked = useRef(false)
  const [swipe, setSwipe] = useState<'left' | 'right' | null>(null)

  function onTouchStart(e: React.TouchEvent) {
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
    setSwipe(dir)
    setTimeout(() => setSwipe(null), 500)

    const d = new Date(currentFecha + 'T12:00:00')
    d.setDate(d.getDate() + (dx < 0 ? 1 : -1))
    router.push(`/partidos?fecha=${d.toISOString().slice(0, 10)}`)
  }

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Overlay de confirmación — borde lateral que entra y desaparece */}
      {swipe && (
        <div
          key={swipe + Date.now()}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99,
            pointerEvents: 'none',
            animation: `swipe-flash-${swipe} 0.5s ease-out forwards`,
          }}
        />
      )}
      {/* Flecha de dirección */}
      {swipe && (
        <div
          key={'arrow' + swipe + Date.now()}
          style={{
            position: 'fixed',
            top: '50%',
            [swipe === 'left' ? 'right' : 'left']: 20,
            transform: 'translateY(-50%)',
            zIndex: 100,
            fontSize: 36,
            color: 'rgba(255,255,255,0.85)',
            pointerEvents: 'none',
            animation: `arrow-${swipe} 0.5s ease-out forwards`,
            textShadow: `0 0 20px ${primaryColor}cc`,
          }}
        >
          {swipe === 'left' ? '→' : '←'}
        </div>
      )}
      <style>{`
        @keyframes swipe-flash-left {
          0%   { background: linear-gradient(to left, ${primaryColor}59 0%, transparent 50%); opacity: 1; }
          100% { background: linear-gradient(to left, ${primaryColor}59 0%, transparent 50%); opacity: 0; }
        }
        @keyframes swipe-flash-right {
          0%   { background: linear-gradient(to right, ${primaryColor}59 0%, transparent 50%); opacity: 1; }
          100% { background: linear-gradient(to right, ${primaryColor}59 0%, transparent 50%); opacity: 0; }
        }
        @keyframes arrow-left {
          0%   { opacity: 0; transform: translateY(-50%) translateX(-10px); }
          20%  { opacity: 1; transform: translateY(-50%) translateX(0); }
          70%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-50%) translateX(10px); }
        }
        @keyframes arrow-right {
          0%   { opacity: 0; transform: translateY(-50%) translateX(10px); }
          20%  { opacity: 1; transform: translateY(-50%) translateX(0); }
          70%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-50%) translateX(-10px); }
        }
      `}</style>
      {children}
    </div>
  )
}
