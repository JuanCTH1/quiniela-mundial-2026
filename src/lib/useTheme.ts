import { useEffect, useState } from 'react'
import { getTheme, type Theme } from './themes'

export function useTheme(initialTheme: Theme = 'mexico') {
  const [theme, setTheme] = useState(initialTheme)

  // Aplicar variables CSS al cambiar tema
  useEffect(() => {
    const t = getTheme(theme)
    const root = document.documentElement

    Object.entries(t.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value)
    })
  }, [theme])

  return { theme, setTheme, data: getTheme(theme) }
}
