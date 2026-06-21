'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { THEMES, type Theme } from '@/lib/themes'

interface Props {
  initialTheme: string
  userId: string
}

export function ThemeSelector({ initialTheme, userId }: Props) {
  const [theme, setTheme] = useState<Theme>((initialTheme as Theme) || 'mexico')
  const [saving, setSaving] = useState(false)

  async function handleThemeChange(newTheme: Theme) {
    setTheme(newTheme)
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ theme: newTheme })
        .eq('id', userId)

      if (error) throw error

      // Forzar reload para aplicar tema
      setTimeout(() => window.location.reload(), 200)
    } catch (err) {
      alert('Error al cambiar tema: ' + (err instanceof Error ? err.message : String(err)))
      setSaving(false)
    }
  }

  const themeOptions: Theme[] = ['mexico', 'usa', 'argentina']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {themeOptions.map(t => (
        <button
          key={t}
          onClick={() => handleThemeChange(t)}
          disabled={saving}
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            border: theme === t ? '2px solid var(--theme-primary)' : '1px solid rgba(255,255,255,0.12)',
            background: theme === t ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)',
            color: 'var(--text-main)',
            fontSize: 14,
            fontWeight: theme === t ? 600 : 500,
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s',
          }}
        >
          <span style={{ fontSize: 18 }}>{THEMES[t].emoji}</span>
          <span style={{ flex: 1, textAlign: 'left' }}>{THEMES[t].name}</span>
          {theme === t && <span style={{ fontSize: 14 }}>✓</span>}
        </button>
      ))}
    </div>
  )
}
