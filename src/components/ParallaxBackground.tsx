'use client'

import { useEffect } from 'react'

// Parallax solo en los blobs (.g-blob-wrap) — se mueven a 18% del scroll.
// El patrón NO se parallaxea: vive en el background del body (en-flujo) para
// que las glass-card lo puedan blurear vía backdrop-filter en todos los motores.
// passive scroll + rAF: sin jank en iOS ni Android.
export function ParallaxBackground() {
  useEffect(() => {
    const blobsEl = document.querySelector<HTMLElement>('.g-blob-wrap')
    if (!blobsEl) return
    let frame: number

    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        blobsEl.style.transform = `translateY(${window.scrollY * 0.18}px)`
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  return null
}
