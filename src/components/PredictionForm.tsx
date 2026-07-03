'use client'

import { useState, useRef, useTransition, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getTheme, type Theme } from '@/lib/themes'

interface Props {
  matchId: string
  scheduledTime: string
  bloqueoMinutos: number
  currentPrediction?: { home_score: number | null; away_score: number | null } | null
  disabled?: boolean
  theme?: Theme
}

// Registra un intento rechazado (bloqueo/RLS) para poder auditarlo después —
// sin esto no queda ningún rastro de que el usuario lo intentó.
async function logRejection(matchId: string, home: number | null, away: number | null, reason: string) {
  try {
    const sb = createClient()
    // El RPC acepta NULL en Postgres aunque los tipos generados los marquen non-null
    await sb.rpc('log_prediction_rejected', {
      p_match_id: matchId,
      p_attempted_home: home as number,
      p_attempted_away: away as number,
      p_reason: reason,
    })
  } catch {
    // El logging nunca debe romper la UX del usuario
  }
}

export function PredictionForm({ matchId, scheduledTime, bloqueoMinutos, currentPrediction, disabled, theme = 'mexico' }: Props) {
  const t = getTheme(theme)
  const [saved, setSaved] = useState<{ home: number; away: number } | null>(
    currentPrediction?.home_score != null
      ? { home: currentPrediction.home_score, away: currentPrediction.away_score! }
      : null
  )
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const homeRef = useRef<HTMLInputElement>(null)
  const awayRef = useRef<HTMLInputElement>(null)

  const isNowLocked = useCallback(() => {
    const lockMs = new Date(scheduledTime).getTime() - bloqueoMinutos * 60 * 1000
    return Date.now() >= lockMs
  }, [scheduledTime, bloqueoMinutos])

  // Re-chequeo proactivo: si la pestaña quedó abierta desde antes del bloqueo,
  // el formulario se oculta solo en vez de esperar a un submit rechazado.
  const [lockedNow, setLockedNow] = useState(isNowLocked)
  useEffect(() => {
    if (lockedNow) return
    const id = setInterval(() => {
      if (isNowLocked()) setLockedNow(true)
    }, 15_000)
    return () => clearInterval(id)
  }, [lockedNow, isNowLocked])

  if (disabled || lockedNow) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
        🔒 Cerrado
      </div>
    )
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const home = parseInt(homeRef.current?.value ?? '')
    const away = parseInt(awayRef.current?.value ?? '')

    // Verificación de tiempo en cliente — evita el submit silencioso post-bloqueo
    if (isNowLocked()) {
      setError('🔒 Ups, muy tarde — los pronósticos ya cerraron.')
      setLockedNow(true)
      void logRejection(matchId, isNaN(home) ? null : home, isNaN(away) ? null : away, 'client_lock_pre_submit')
      return
    }

    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) return

    setError(null)
    startTransition(async () => {
      // Segunda verificación antes del network round-trip
      if (isNowLocked()) {
        setError('🔒 Ups, muy tarde — los pronósticos ya cerraron.')
        setLockedNow(true)
        void logRejection(matchId, home, away, 'client_lock_pre_network')
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
        setLockedNow(true)
        void logRejection(matchId, home, away, 'rls_rejected')
        return
      }

      setSaved({ home, away })
      router.refresh()
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
            background: hasPred ? 'transparent' : 'var(--primary)',
            border: '1px solid var(--primary)',
            borderRadius: 8,
            color: hasPred ? 'var(--primary)' : '#fff',
            cursor: pending ? 'not-allowed' : 'pointer',
            opacity: pending ? 0.6 : 1,
            fontWeight: 500,
          }}
        >
          {pending ? '...' : hasPred ? t.texts.edit : t.texts.save}
        </button>
        {hasPred && !pending && !error && (
          <span style={{ fontSize: 12, color: 'var(--primary)' }}>✓</span>
        )}
      </div>
      {error && (
        <p style={{
          fontSize: 13, color: 'var(--warning)', marginTop: 8, fontWeight: 600,
          background: 'rgba(255,180,0,0.12)', border: '1px solid var(--warning)',
          borderRadius: 8, padding: '6px 10px',
        }}>
          {error}
        </p>
      )}
    </form>
  )
}
