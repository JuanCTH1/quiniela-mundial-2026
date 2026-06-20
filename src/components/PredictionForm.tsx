'use client'

import { useActionState, useOptimistic, useTransition } from 'react'
import { savePrediction } from '@/app/actions/predictions'

interface Props {
  matchId: string
  currentPrediction?: { home_score: number | null; away_score: number | null } | null
  disabled?: boolean
}

export function PredictionForm({ matchId, currentPrediction, disabled }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useOptimistic<string | null>(null)

  const hasPred = currentPrediction?.home_score != null

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (disabled) return
    const fd = new FormData(e.currentTarget)
    const home = parseInt(fd.get('home') as string)
    const away = parseInt(fd.get('away') as string)
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) return
    startTransition(async () => {
      try {
        await savePrediction(matchId, home, away)
      } catch {
        setError('Error al guardar, intenta de nuevo.')
      }
    })
  }

  if (disabled) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
        🔒 Cerrado para pronósticos
      </div>
    )
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          name="home"
          type="number"
          min={0}
          max={20}
          defaultValue={currentPrediction?.home_score ?? ''}
          placeholder="0"
          required
          style={{
            width: 52,
            textAlign: 'center',
            fontSize: 20,
            fontWeight: 600,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            color: 'var(--text-main)',
            padding: '6px 0',
          }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>–</span>
        <input
          name="away"
          type="number"
          min={0}
          max={20}
          defaultValue={currentPrediction?.away_score ?? ''}
          placeholder="0"
          required
          style={{
            width: 52,
            textAlign: 'center',
            fontSize: 20,
            fontWeight: 600,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            color: 'var(--text-main)',
            padding: '6px 0',
          }}
        />
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: '7px 16px',
            fontSize: 13,
            background: hasPred ? 'transparent' : 'var(--mx-green)',
            border: '1px solid var(--mx-green)',
            borderRadius: 8,
            color: hasPred ? 'var(--mx-green)' : '#fff',
            cursor: 'pointer',
            opacity: pending ? 0.6 : 1,
            fontWeight: 500,
          }}
        >
          {pending ? '...' : hasPred ? 'Editar' : 'Guardar'}
        </button>
      </div>
      {error && <p style={{ fontSize: 11, color: 'var(--mx-red)', marginTop: 4 }}>{error}</p>}
    </form>
  )
}
