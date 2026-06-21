'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Theme } from '@/lib/themes'

interface Props {
  initialTheme: string
  userId: string
}

type Country = 'mexico' | 'usa' | 'argentina'

const COUNTRIES: { id: Country; emoji: string; name: string }[] = [
  { id: 'mexico',    emoji: '🇲🇽', name: 'México' },
  { id: 'usa',       emoji: '🇺🇸', name: 'USA' },
  { id: 'argentina', emoji: '🇦🇷', name: 'Argentina' },
]

function parseTheme(theme: string): { country: Country; isDia: boolean } {
  const isDia = theme.endsWith('_dia')
  const country = theme.replace('_dia', '') as Country
  return { country: COUNTRIES.find(c => c.id === country) ? country : 'mexico', isDia }
}

function buildTheme(country: Country, isDia: boolean): Theme {
  return (isDia ? `${country}_dia` : country) as Theme
}

export function ThemeSelector({ initialTheme, userId }: Props) {
  const parsed = parseTheme(initialTheme)
  const [country, setCountry] = useState<Country>(parsed.country)
  const [isDia, setIsDia] = useState(parsed.isDia)
  const [saving, setSaving] = useState(false)

  const savedTheme = buildTheme(parsed.country, parsed.isDia)
  const selected = buildTheme(country, isDia)
  const isDirty = selected !== savedTheme

  async function handleApply() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await (supabase as any).from('profiles').update({ theme: selected }).eq('id', userId)
      if (error) throw error
      setTimeout(() => window.location.reload(), 200)
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      alert('Error al cambiar tema: ' + msg)
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Toggle día / noche */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 12, padding: '10px 0',
      }}>
        <span style={{ fontSize: 18 }}>🌙</span>
        <button
          onClick={() => setIsDia(v => !v)}
          aria-label={isDia ? 'Cambiar a noche' : 'Cambiar a día'}
          style={{
            position: 'relative',
            width: 52, height: 28,
            borderRadius: 99,
            border: 'none',
            background: isDia
              ? 'color-mix(in srgb, var(--theme-primary) 60%, #fff)'
              : 'rgba(255,255,255,0.12)',
            cursor: 'pointer',
            transition: 'background 0.3s',
            padding: 0,
          }}
        >
          <span style={{
            position: 'absolute',
            top: 3, left: isDia ? 27 : 3,
            width: 22, height: 22,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.25s cubic-bezier(.4,0,.2,1)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }} />
        </button>
        <span style={{ fontSize: 18 }}>☀️</span>
      </div>

      {/* Selector de país */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {COUNTRIES.map(c => {
          const active = country === c.id
          return (
            <button
              key={c.id}
              onClick={() => setCountry(c.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 6, padding: '14px 8px',
                borderRadius: 12,
                border: active
                  ? '2px solid var(--theme-primary)'
                  : '1px solid var(--glass-border)',
                background: active ? 'var(--glass-bg-hover)' : 'var(--glass-bg)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 32, lineHeight: 1 }}>{c.emoji}</span>
              <span style={{
                fontSize: 12, fontWeight: active ? 700 : 500,
                color: active ? 'var(--theme-primary)' : 'var(--text-muted)',
              }}>
                {c.name}
              </span>
              {active && (
                <span style={{ fontSize: 10, color: 'var(--theme-primary)' }}>✓</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Botón Aplicar */}
      <button
        onClick={handleApply}
        disabled={!isDirty || saving}
        style={{
          padding: '12px',
          borderRadius: 10,
          border: 'none',
          background: isDirty
            ? 'var(--theme-primary)'
            : 'rgba(255,255,255,0.06)',
          color: isDirty ? '#fff' : 'var(--text-dim)',
          fontSize: 14, fontWeight: 600,
          cursor: isDirty && !saving ? 'pointer' : 'default',
          transition: 'all 0.2s',
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Aplicando...' : isDirty ? 'Aplicar tema' : 'Sin cambios'}
      </button>
    </div>
  )
}
