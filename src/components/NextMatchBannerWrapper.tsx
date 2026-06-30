import { createClient } from '@/lib/supabase/server'
import { NextMatchBanner } from './NextMatchBanner'
import type { Tables } from '@/types/database.types'
import type { Theme } from '@/lib/themes'

type MatchSlim = Pick<Tables<'matches'>,
  'id' | 'home_team' | 'away_team' | 'scheduled_time' | 'early_unlock_at' | 'stage' | 'group_name'>

type LiveMatchSlim = MatchSlim & {
  home_score_fulltime: number | null
  away_score_fulltime: number | null
  home_score_penalties: number | null
  away_score_penalties: number | null
  current_minute: number | null
  current_period: string | null
  actual_start_time: string | null
  second_half_start_time: string | null
  extra_time_start_time: string | null
}

type Pred = { home_score: number | null; away_score: number | null }

interface Props {
  liveMatches: LiveMatchSlim[]
  nextMatch: MatchSlim | null
  userId: string
  bloqueoMinutos: number
  timezone: string
  theme?: Theme
}

export async function NextMatchBannerWrapper({ liveMatches, nextMatch, userId, bloqueoMinutos, timezone, theme }: Props) {
  const supabase = await createClient()

  const liveMatch = liveMatches[0] ?? null

  // Fetch predictions for live matches + nextMatch in one query
  const matchIds = [
    ...liveMatches.map(m => m.id),
    ...(nextMatch && liveMatches.length === 0 ? [nextMatch.id] : []),
  ]

  const predsRes = matchIds.length
    ? await supabase.from('predictions')
        .select('match_id, home_score, away_score')
        .in('match_id', matchIds)
        .eq('user_id', userId)
    : { data: [] }

  const predMap = new Map<string, Pred>(
    (predsRes.data ?? []).map(p => [p.match_id, { home_score: p.home_score, away_score: p.away_score }])
  )

  const livePredictions = liveMatches.map(m => predMap.get(m.id) ?? null)
  const nextPrediction = nextMatch ? (predMap.get(nextMatch.id) ?? null) : null

  return (
    <NextMatchBanner
      liveMatches={liveMatches}
      liveMatch={liveMatch}
      nextMatch={nextMatch}
      prediction={livePredictions[0] ?? nextPrediction}
      livePredictions={livePredictions}
      bloqueoMinutos={bloqueoMinutos}
      timezone={timezone}
      theme={theme}
    />
  )
}
