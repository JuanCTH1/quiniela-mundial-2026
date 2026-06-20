import { createClient } from '@/lib/supabase/server'
import { MatchCard } from '@/components/MatchCard'
import { isMatchLocked, STAGE_LABELS } from '@/lib/utils'
import { DateNav } from './DateNav'

const STAGES = ['GROUP', 'LAST_32', 'ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL']

export default async function PartidosPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; etapa?: string }>
}) {
  const { fecha, etapa } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user!.id)
    .single()

  const { data: settings } = await supabase.from('settings').select('key, value')
  const bloqueoMinutos = parseInt(settings?.find(s => s.key === 'bloqueo_minutos')?.value ?? '15')
  const timezone = profile?.timezone ?? 'America/Mexico_City'

  // Build query
  let query = supabase.from('matches').select('*').order('scheduled_time')

  if (etapa) {
    query = query.eq('stage', etapa)
  } else if (fecha) {
    const start = new Date(fecha)
    start.setHours(0, 0, 0, 0)
    const end = new Date(fecha)
    end.setHours(23, 59, 59, 999)
    query = query.gte('scheduled_time', start.toISOString()).lte('scheduled_time', end.toISOString())
  } else {
    // Default: today ± 1 day in user's timezone
    const now = new Date()
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const end = new Date(now)
    end.setDate(end.getDate() + 1)
    end.setHours(23, 59, 59, 999)
    query = query.gte('scheduled_time', start.toISOString()).lte('scheduled_time', end.toISOString())
  }

  const { data: matches } = await query

  // My predictions for these matches
  const matchIds = matches?.map(m => m.id) ?? []
  const { data: myPreds } = matchIds.length
    ? await supabase.from('predictions').select('match_id, home_score, away_score').eq('user_id', user!.id).in('match_id', matchIds)
    : { data: [] }

  // All predictions for locked/finished matches
  const lockedIds = (matches ?? [])
    .filter(m => isMatchLocked(m.scheduled_time, bloqueoMinutos, m.early_unlock_at) || m.status === 'FINISHED')
    .map(m => m.id)

  // Two separate queries: predictions + profiles joined in JS (no FK declared in public schema)
  const [allPredsRes, allProfilesRes] = lockedIds.length
    ? await Promise.all([
        supabase.from('predictions').select('match_id, user_id, home_score, away_score').in('match_id', lockedIds),
        supabase.from('profiles').select('id, display_name, avatar_url'),
      ])
    : [{ data: [] }, { data: [] }]

  const profileMap = new Map((allProfilesRes.data ?? []).map(p => [p.id, p]))

  type PredWithProfile = {
    match_id: string
    user_id: string
    home_score: number
    away_score: number
    profiles: { display_name: string; avatar_url: string | null } | null
  }

  const allPreds: PredWithProfile[] = (allPredsRes.data ?? []).map(p => ({
    ...p,
    profiles: profileMap.get(p.user_id) ? {
      display_name: profileMap.get(p.user_id)!.display_name,
      avatar_url: profileMap.get(p.user_id)!.avatar_url,
    } : null,
  }))

  const myPredMap = new Map(myPreds?.map(p => [p.match_id, p]) ?? [])
  const allPredMap = new Map<string, PredWithProfile[]>()
  for (const p of allPreds) {
    const arr = allPredMap.get(p.match_id) ?? []
    arr.push(p)
    allPredMap.set(p.match_id, arr)
  }

  // Active stage for tabs
  const activeStages = [...new Set(matches?.map(m => m.stage) ?? [])]

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 14px', color: 'var(--text-main)' }}>
        Partidos
      </h1>

      {/* Navigation: stage tabs (elimination) or date scroll (groups) */}
      <DateNav currentFecha={fecha} currentEtapa={etapa} timezone={timezone} />

      {/* Match list */}
      {!matches?.length ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', marginTop: 40 }}>
          No hay partidos para esta fecha
        </p>
      ) : (
        matches.map(match => {
          const locked = isMatchLocked(match.scheduled_time, bloqueoMinutos, match.early_unlock_at)
          return (
            <MatchCard
              key={match.id}
              match={match}
              myPrediction={myPredMap.get(match.id)}
              allPredictions={locked || match.status === 'FINISHED' ? (allPredMap.get(match.id) ?? []) : undefined}
              isLocked={locked}
              bloqueoMinutos={bloqueoMinutos}
              timezone={timezone}
              currentUserId={user!.id}
            />
          )
        })
      )}
    </div>
  )
}
