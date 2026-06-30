'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { LiveTimeLabel } from '@/components/LiveTimeLabel'
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
  initialHomePenalties?: number | null
  initialAwayPenalties?: number | null
  initialMinute?: number | null
  initialPeriod?: string | null
  initialActualStartTime?: string | null
  initialSecondHalfStartTime?: string | null
  initialExtraTimeStartTime?: string | null
  isLive: boolean
  isFinished: boolean
  predictions: Prediction[]
}

export function LiveMatchClient({
  matchId, initialHomeScore, initialAwayScore,
  initialHomePenalties, initialAwayPenalties,
  initialMinute, initialPeriod,
  initialActualStartTime, initialSecondHalfStartTime, initialExtraTimeStartTime,
  isLive, isFinished, predictions,
}: Props) {
  const [home, setHome] = useState(initialHomeScore ?? null)
  const [away, setAway] = useState(initialAwayScore ?? null)
  const [homePen, setHomePen] = useState(initialHomePenalties ?? null)
  const [awayPen, setAwayPen] = useState(initialAwayPenalties ?? null)
  const [minute, setMinute] = useState(initialMinute ?? null)
  const [period, setPeriod] = useState(initialPeriod ?? null)
  const [actualStart, setActualStart] = useState(initialActualStartTime ?? null)
  const [secondHalfStart, setSecondHalfStart] = useState(initialSecondHalfStartTime ?? null)
  const [extraTimeStart, setExtraTimeStart] = useState(initialExtraTimeStartTime ?? null)
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient<Database>> | null>(null)
  const finishedRef = useRef(false)
  const router = useRouter()

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
        setHomePen(row.home_score_penalties ?? null)
        setAwayPen(row.away_score_penalties ?? null)
        setMinute(row.current_minute ?? null)
        setPeriod(row.current_period ?? null)
        if (row.actual_start_time) setActualStart(row.actual_start_time)
        if (row.second_half_start_time) setSecondHalfStart(row.second_half_start_time)
        if (row.extra_time_start_time) setExtraTimeStart(row.extra_time_start_time)
        maybeRefreshOnFinish(row.status)
      })
      .subscribe()

    const poll = setInterval(async () => {
      const { data } = await sb
        .from('matches')
        .select('home_score_fulltime, away_score_fulltime, home_score_penalties, away_score_penalties, current_minute, current_period, status, actual_start_time, second_half_start_time, extra_time_start_time')
        .eq('id', matchId)
        .single()
      if (data) {
        setHome(data.home_score_fulltime)
        setAway(data.away_score_fulltime)
        setHomePen(data.home_score_penalties ?? null)
        setAwayPen(data.away_score_penalties ?? null)
        setMinute(data.current_minute ?? null)
        setPeriod(data.current_period ?? null)
        if (data.actual_start_time) setActualStart(data.actual_start_time)
        if (data.second_half_start_time) setSecondHalfStart(data.second_half_start_time)
        if (data.extra_time_start_time) setExtraTimeStart(data.extra_time_start_time)
        maybeRefreshOnFinish(data.status)
      }
    }, 10_000)

    return () => {
      sb.removeChannel(channel)
      clearInterval(poll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, isLive])

  function maybeRefreshOnFinish(status: string | null) {
    if (status === 'FINISHED' && !finishedRef.current) {
      finishedRef.current = true
      router.refresh()
    }
  }

  const isPenaltyPhase = period === 'PEN' && homePen != null && awayPen != null && home != null && away != null
  const displayHome = isPenaltyPhase ? home! - homePen! : home
  const displayAway = isPenaltyPhase ? away! - awayPen! : away

  return (
    <div>
      <div style={{
        fontSize: 32, fontWeight: 800,
        color: isLive ? 'var(--warning)' : 'var(--text-main)',
        letterSpacing: 2,
        display: 'flex', alignItems: 'baseline', gap: 4,
      }}>
        {isPenaltyPhase && <span style={{ fontSize: 18, fontWeight: 700 }}>({homePen})</span>}
        {displayHome ?? '–'} – {displayAway ?? '–'}
        {isPenaltyPhase && <span style={{ fontSize: 18, fontWeight: 700 }}>({awayPen})</span>}
      </div>

      {isLive && (
        <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 2, fontWeight: 600 }}>
          ●{' '}
          <LiveTimeLabel
            period={period}
            minute={minute}
            actualStartTime={actualStart}
            secondHalfStartTime={secondHalfStart}
            extraTimeStartTime={extraTimeStart}
          />
        </div>
      )}
    </div>
  )
}
