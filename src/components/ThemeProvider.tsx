'use client'

import { useEffect } from 'react'
import { getTheme, type Theme } from '@/lib/themes'

interface Props {
  theme: Theme
  children: React.ReactNode
}

export function ThemeProvider({ theme, children }: Props) {
  useEffect(() => {
    const t = getTheme(theme)
    const root = document.documentElement

    // Aplicar colores
    Object.entries(t.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value)
    })

    // Aplicar modo (light/dark) — activa overrides CSS en [data-mode="light"]
    root.setAttribute('data-mode', t.mode)

    // Aplicar header si existe
    if (t.header) {
      const headerEl = document.querySelector('[data-theme-header]')
      if (headerEl) {
        headerEl.textContent = t.header
      }
    }
  }, [theme])

  return <>{children}</>
}
