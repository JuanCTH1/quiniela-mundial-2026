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

    // Override --warning si el tema lo define, si no usa el default ámbar
    root.style.setProperty('--warning', (t.colors as Record<string, string>).warning ?? '#F59E0B')

    // Aplicar patrón de fondo
    root.style.setProperty('--theme-pattern', t.pattern)

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
