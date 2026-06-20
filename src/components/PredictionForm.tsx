'use client'

import { useState, useRef, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  matchId: string
  scheduledTime: string
  bloqueoMinutos: number
  currentPrediction?: { home_score: number | null; away_score: number | null } | null
  disabled?: boolean
}

export function PredictionForm({ matchId, scheduledTime, bloqueoMinutos, currentPrediction, disabled }: Props) {
  const [saved, setSaved] = useState<{ home: number; away: number } | null>(
    currentPrediction?.home_score != null
      ? { home: currentPrediction.home_score, away: currentPrediction.away_score! }
      : null
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const homeRef = useRef<HTMLInputElement>(null)
  const awayRef = useRef<HTMLInputElement>(null)

  if (disabled) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
        🔒 Cerrado
      </div>
    )
  }

  function isNowLocked() {
    const lockMs = new Date(scheduledTime).getTime() - bloqueoMinutos * 60 * 1000
    return Date.now() >= lockMs
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // Verificación de tiempo en cliente — evita el submit silencioso post-bloqueo
    if (isNowLocked()) {
      setError('🔒 Ups, muy tarde — los pronósticos ya cerraron.')
      return
    }

    const home = parseInt(homeRef.current?.value ?? '')
    const away = parseInt(awayRef.current?.value ?? '')
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) return

    setError(null)
    startTransition(async () => {
      // Segunda verificación antes del network round-trip
      if (isNowLocked()) {
        setError('🔒 Ups, muy tarde — los pronósticos ya cerraron.')
        return
      }

      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setError('No autenticado'); return }

      const { error: err } = await sb.from('predictions').upsert(
        { match_id: matchId, user_id: user.id, home_score: home, away_score: away },
        { onConflict: 'match_id,user_id' }
      )

      if (err) {
        // RLS rechazó en el servidor (doble seguro)
        setError('🔒 Ups, muy tarde — los pronósticos ya cerraron.')
        return
      }

      setSaved({ home, away })
    })
  }

  const hasPred = saved !== null

  return (
    <form onSubmit={submit} style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          ref={homeRef}
          name="home"
          type="number" min={0} max={20}
          defaultValue={saved?.home ?? ''}
          placeholder="0"
          required
          style={{
            width: 52, textAlign: 'center', fontSize: 20, fontWeight: 600,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8, color: 'var(--text-main)', padding: '6px 0',
          }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>–</span>
        <input
          ref={awayRef}
          name="away"
          type="number" min={0} max={20}
          defaultValue={saved?.away ?? ''}
          placeholder="0"
          required
          style={{
            width: 52, textAlign: 'center', fontSize: 20, fontWeight: 600,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8, color: 'var(--text-main)', padding: '6px 0',
          }}
        />
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: '7px 16px', fontSize: 13,
            background: hasPred ? 'transparent' : 'var(--mx-green)',
            border: '1px solid var(--mx-green)',
            borderRadius: 8,
            color: hasPred ? 'var(--mx-green)' : '#fff',
            cursor: pending ? 'not-allowed' : 'pointer',
            opacity: pending ? 0.6 : 1,
            fontWeight: 500,
          }}
        >
          {pending ? '...' : hasPred ? 'Editar' : 'Guardar'}
        </button>
        {hasPred && !pending && !error && (
          <span style={{ fontSize: 12, color: 'var(--mx-green)' }}>✓</span>
        )}
      </div>
      {error && (
        <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 6, fontWeight: 500 }}>
          {error}
        </p>
      )}
    </form>
  )
}
