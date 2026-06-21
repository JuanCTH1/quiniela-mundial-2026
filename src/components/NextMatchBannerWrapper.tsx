import { createClient } from '@/lib/supabase/server'
import { NextMatchBanner } from './NextMatchBanner'
import type { Tables } from '@/types/database.types'
import type { Theme } from '@/lib/themes'

type MatchSlim = Pick<Tables<'matches'>,
  'id' | 'home_team' | 'away_team' | 'scheduled_time' | 'early_unlock_at' | 'stage' | 'group_name'>

type LiveMatchSlim = MatchSlim & {
  home_score_fulltime: number | null
  away_score_fulltime: number | null
}

interface Props {
  liveMatch: LiveMatchSlim | null
  nextMatch: MatchSlim | null
  userId: string
  bloqueoMinutos: number
  timezone: string
  theme?: Theme
}

export async function NextMatchBannerWrapper({ liveMatch, nextMatch, userId, bloqueoMinutos, timezone, theme }: Props) {
  const supabase = await createClient()

  // Pronóstico del usuario para el partido relevante (en vivo o próximo)
  const targetId = liveMatch?.id ?? nextMatch?.id
  const prediction = targetId
    ? (await supabase.from('predictions')
        .select('home_score, away_score')
        .eq('match_id', targetId)
        .eq('user_id', userId)
        .maybeSingle()).data
    : null

  return (
    <NextMatchBanner
      liveMatch={liveMatch}
      nextMatch={nextMatch}
      prediction={prediction}
      bloqueoMinutos={bloqueoMinutos}
      timezone={timezone}
      theme={theme}
    />
  )
}
