'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export function NavigationProgress() {
  const pathname = usePathname()
  const [width, setWidth] = useState(0)
  const [opacity, setOpacity] = useState(0)
  const navigating = useRef(false)
  const fakeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    function onLinkClick(e: MouseEvent) {
      const a = (e.target as HTMLElement).closest('a')
      if (!a) return
      const href = a.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return
      if (a.target === '_blank') return

      navigating.current = true
      setOpacity(1)
      setWidth(18)
      clearTimeout(fakeTimer.current)
      fakeTimer.current = setTimeout(() => setWidth(60), 250)
    }

    document.addEventListener('click', onLinkClick)
    return () => document.removeEventListener('click', onLinkClick)
  }, [])

  // pathname change = navigation done
  useEffect(() => {
    if (!navigating.current) return
    navigating.current = false
    clearTimeout(fakeTimer.current)
    setWidth(100)
    const t1 = setTimeout(() => setOpacity(0), 180)
    const t2 = setTimeout(() => setWidth(0), 480)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [pathname])

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0, left: 0,
        height: 2,
        width: `${width}%`,
        background: 'linear-gradient(90deg, var(--mx-green) 0%, var(--gold) 100%)',
        opacity,
        zIndex: 9999,
        pointerEvents: 'none',
        transition: width === 0
          ? 'none'
          : width === 100
          ? 'width 0.12s ease-out, opacity 0.28s ease 0.12s'
          : 'width 0.45s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: opacity > 0 ? '0 0 8px rgba(0,104,71,0.7)' : 'none',
      }}
    />
  )
}
