'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'


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

function useElapsed(ts: Date | null) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (!ts) return
    const id = setInterval(() => tick(n => n + 1), 5000)
    return () => clearInterval(id)
  }, [ts])
  if (!ts) return null
  const s = Math.round((Date.now() - ts.getTime()) / 1000)
  if (s < 10) return 'ahora'
  if (s < 60) return `hace ${s}s`
  return `hace ${Math.round(s / 60)}min`
}

export function LiveMatchClient({ matchId, initialHomeScore, initialAwayScore, isLive, isFinished, predictions }: Props) {
  const [home, setHome] = useState(initialHomeScore ?? null)
  const [away, setAway] = useState(initialAwayScore ?? null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(isLive ? new Date() : null)
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient<Database>> | null>(null)

  function getClient() {
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }
    return supabaseRef.current
  }

  useEffect(() => {
    if (!isLive) return
    const sb = getClient()

    // Realtime: actualización inmediata por cambios en DB
    const channel = sb
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
        setLastUpdated(new Date())
      })
      .subscribe()

    // Polling cada 10s como respaldo (el API tiene delay, Realtime lo refleja igual)
    const poll = setInterval(async () => {
      const { data } = await sb
        .from('matches')
        .select('home_score_fulltime, away_score_fulltime, status')
        .eq('id', matchId)
        .single()
      if (data) {
        setHome(data.home_score_fulltime)
        setAway(data.away_score_fulltime)
        setLastUpdated(new Date())
      }
    }, 10_000)

    return () => {
      sb.removeChannel(channel)
      clearInterval(poll)
    }
  }, [matchId, isLive])

  const elapsed = useElapsed(lastUpdated)

  return (
    <div>
      <div style={{
        fontSize: 32, fontWeight: 800,
        color: isLive ? 'var(--warning)' : 'var(--text-main)',
        letterSpacing: 2,
      }}>
        {home ?? '–'} – {away ?? '–'}
      </div>

      {isLive && (
        <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 2 }}>● En juego</div>
      )}

      {isLive && elapsed && (
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>
          Actualizado {elapsed}
        </div>
      )}
    </div>
  )
}
