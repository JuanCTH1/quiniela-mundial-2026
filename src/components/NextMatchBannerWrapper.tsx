import { createClient } from '@/lib/supabase/server'
import { NextMatchBanner } from './NextMatchBanner'

type MatchSlim = Pick<import('@/types/database.types').Tables<'matches'>,
  'id' | 'home_team' | 'away_team' | 'scheduled_time' | 'early_unlock_at' | 'stage' | 'group_name'>

interface Props {
  match: MatchSlim | null
  userId: string
  bloqueoMinutos: number
  timezone: string
}

// Server component: busca el pronóstico del usuario para el siguiente partido.
// Se envuelve en Suspense en el layout para no bloquear el renderizado del shell.
export async function NextMatchBannerWrapper({ match, userId, bloqueoMinutos, timezone }: Props) {
  const supabase = await createClient()
  const prediction = match
    ? (await supabase.from('predictions')
        .select('home_score, away_score')
        .eq('match_id', match.id)
        .eq('user_id', userId)
        .maybeSingle()).data
    : null

  return (
    <NextMatchBanner
      match={match}
      prediction={prediction}
      bloqueoMinutos={bloqueoMinutos}
      timezone={timezone}
    />
  )
}
