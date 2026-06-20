'use client'

import { useState, useTransition } from 'react'
import { updateProfile } from '@/app/actions/predictions'
import { TIMEZONES } from '@/lib/utils'

interface Props {
  initialName: string
  initialTimezone: string
}

export function ProfileForm({ initialName, initialTimezone }: Props) {
  const [name, setName] = useState(initialName)
  const [timezone, setTimezone] = useState(initialTimezone)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await updateProfile(name, timezone)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    color: 'var(--text-main)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
          Nombre para mostrar
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Tu nombre"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
          Zona horaria
        </label>
        <select
          value={timezone}
          onChange={e => setTimezone(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          {TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value} style={{ background: '#111' }}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        style={{
          padding: '11px',
          background: saved ? 'rgba(52,168,83,0.3)' : 'var(--mx-green)',
          border: 'none',
          borderRadius: 10,
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          opacity: isPending ? 0.7 : 1,
          transition: 'all 0.2s',
        }}
      >
        {isPending ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar'}
      </button>
    </form>
  )
}
