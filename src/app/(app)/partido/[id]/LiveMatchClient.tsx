'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'
import { calcResult } from '@/lib/utils'

interface Prediction {
  user_id: string
  home_score: number | null
  away_score: number | null
  profiles: { display_name: string; avatar_url: string | null } | null
}

interface Props {
  matchId: string
  initialHomeScore: number | null | undefined
  initialAwayScore: number | null | undefined
  isLive: boolean
  isFinished: boolean
  predictions: Prediction[]
}

export function LiveMatchClient({ matchId, initialHomeScore, initialAwayScore, isLive, isFinished, predictions }: Props) {
  const [home, setHome] = useState(initialHomeScore ?? null)
  const [away, setAway] = useState(initialAwayScore ?? null)

  useEffect(() => {
    if (!isLive) return

    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel = supabase
      .channel(`match-${matchId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${matchId}`,
      }, payload => {
        const row = payload.new as Database['public']['Tables']['matches']['Row']
        setHome(row.home_score_fulltime)
        setAway(row.away_score_fulltime)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId, isLive])

  // Tentative ranking with current score
  const tentative = predictions
    .filter(p => p.home_score != null)
    .map(p => ({
      name: (p.profiles?.display_name ?? '?').split(' ')[0],
      result: (home != null && away != null)
        ? calcResult(p.home_score!, p.away_score!, home, away)
        : null,
    }))
    .sort((a, b) => (b.result?.pts ?? 0) - (a.result?.pts ?? 0))

  return (
    <div>
      <div style={{
        fontSize: 32,
        fontWeight: 800,
        color: isLive ? 'var(--warning)' : 'var(--text-main)',
        letterSpacing: 2,
      }}>
        {home ?? '–'} – {away ?? '–'}
      </div>
      {isLive && (
        <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 2 }}>● En juego</div>
      )}

      {/* Tentative mini ranking */}
      {tentative.length > 0 && home != null && (
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
          {tentative.map((t, i) => (
            <span
              key={t.name}
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 10,
                background: i === 0 ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.07)',
                color: i === 0 ? 'var(--gold)' : 'var(--text-muted)',
                border: `1px solid ${i === 0 ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {i + 1}. {t.name} {t.result ? `${t.result.pts}p` : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
