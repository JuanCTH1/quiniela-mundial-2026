'use client'

import { useEffect, useRef } from 'react'

// Mueve patrón a 25% y blobs a 45% de la velocidad del scroll.
// 3 capas de profundidad: patrón (lento) → blobs (medio) → contenido (normal).
// Usa passive scroll + rAF: sin jank en iOS ni Android.
export function ParallaxBackground() {
  const patternRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const patternEl = patternRef.current
    const blobsEl = document.querySelector<HTMLElement>('.g-blob-wrap')
    let frame: number

    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        if (patternEl) patternEl.style.transform = `translateY(${y * 0.25}px)`
        if (blobsEl)   blobsEl.style.transform   = `translateY(${y * 0.45}px)`
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  return <div ref={patternRef} id="parallax-bg" aria-hidden="true" />
}
