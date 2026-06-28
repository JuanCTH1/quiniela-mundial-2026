import { createClient } from '@/lib/supabase/server'
import { getUser, getProfile, getBloqueoMinutos } from '@/lib/data'
import { MatchCard } from '@/components/MatchCard'
import { LiveRefresher } from '@/components/LiveRefresher'
import { isMatchLocked, localTodayStr, dayBoundsUTC } from '@/lib/utils'
import { DateNav } from './DateNav'
import { SwipeNav } from './SwipeNav'
import { NextMatchButton } from './NextMatchButton'
import { getTheme, type Theme } from '@/lib/themes'

export default async function PartidosPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; etapa?: string }>
}) {
  const { fecha, etapa } = await searchParams

  // Cached — layout already fetched these, no extra DB round-trip
  const [user, bloqueoMinutos] = await Promise.all([getUser(), getBloqueoMinutos()])
  const profile = user ? await getProfile(user.id) : null
  const timezone = profile?.timezone ?? 'America/Mexico_City'
  const theme = (profile?.theme as Theme) ?? 'mexico'

  const supabase = await createClient()

  // Build main matches query
  let query = supabase.from('matches').select('*').order('scheduled_time')

  if (etapa && fecha) {
    // Stage + specific date
    const start = new Date(fecha + 'T00:00:00')
    const end = new Date(fecha + 'T23:59:59')
    query = query.eq('stage', etapa).gte('scheduled_time', start.toISOString()).lte('scheduled_time', end.toISOString())
  } else if (etapa) {
    query = query.eq('stage', etapa)
  } else if (fecha) {
    const start = new Date(fecha + 'T00:00:00')
    const end = new Date(fecha + 'T23:59:59')
    query = query.gte('scheduled_time', start.toISOString()).lte('scheduled_time', end.toISOString())
  } else {
    const todayInTz = localTodayStr(timezone)
    const { start } = dayBoundsUTC(todayInTz, timezone)
    // También incluye mañana para mostrar partidos cercanos
    const tomorrowInTz = new Intl.DateTimeFormat('sv', { timeZone: timezone }).format(new Date(Date.now() + 86400000))
    const { end } = dayBoundsUTC(tomorrowInTz, timezone)
    query = query.gte('scheduled_time', start.toISOString()).lte('scheduled_time', end.toISOString())
  }

  // Fetch matches + available dates for stage in parallel
  const [{ data: matches }, stageDatesRes] = await Promise.all([
    query,
    // When a stage is selected, get all unique dates for that stage to show in DateNav
    etapa
      ? supabase.from('matches').select('scheduled_time').eq('stage', etapa).order('scheduled_time')
      : Promise.resolve({ data: null }),
  ])

  // Dedupe available dates for the selected stage
  const availableDates = stageDatesRes.data
    ? [...new Set(stageDatesRes.data.map(m => m.scheduled_time.slice(0, 10)))]
    : undefined

  const matchIds = matches?.map(m => m.id) ?? []

  // Parallel: my predictions + locked/finished predictions + profiles
  const lockedIds = (matches ?? [])
    .filter(m => isMatchLocked(m.scheduled_time, bloqueoMinutos, m.early_unlock_at) || m.status === 'FINISHED' || m.status === 'IN_PROGRESS')
    .map(m => m.id)

  const [myPredsRes, allPredsRes, allProfilesRes] = await Promise.all([
    matchIds.length
      ? supabase.from('predictions').select('match_id, home_score, away_score').eq('user_id', user!.id!).in('match_id', matchIds)
      : Promise.resolve({ data: [] }),
    lockedIds.length
      ? supabase.from('predictions').select('match_id, user_id, home_score, away_score').in('match_id', lockedIds)
      : Promise.resolve({ data: [] }),
    lockedIds.length
      ? (() => {
          const q = supabase.from('profiles').select('id, display_name, avatar_url')
          return process.env.NEXT_PUBLIC_APP_ENV === 'production' ? q.eq('is_test', false) : q
        })()
      : Promise.resolve({ data: [] }),
  ])

  const profileMap = new Map((allProfilesRes.data ?? []).map(p => [p.id, p]))

  type PredWithProfile = {
    match_id: string; user_id: string; home_score: number; away_score: number
    profiles: { display_name: string; avatar_url: string | null } | null
  }

  const allPreds: PredWithProfile[] = (allPredsRes.data ?? [])
    .filter(p => profileMap.has(p.user_id))
    .map(p => ({
      ...p,
      profiles: { display_name: profileMap.get(p.user_id)!.display_name, avatar_url: profileMap.get(p.user_id)!.avatar_url },
    }))

  // Venues para mostrar estadio en cada tarjeta
  const venueIds = [...new Set((matches ?? []).map(m => m.venue_id).filter(Boolean))] as string[]
  const venuesRes = venueIds.length
    ? await supabase.from('venues').select('id, name').in('id', venueIds)
    : { data: [] as { id: string; name: string }[] }
  const venueMap = new Map((venuesRes.data ?? []).map(v => [v.id, v.name]))

  const myPredMap = new Map(myPredsRes.data?.map(p => [p.match_id, p]) ?? [])
  const allPredMap = new Map<string, PredWithProfile[]>()
  for (const p of allPreds) {
    const arr = allPredMap.get(p.match_id) ?? []; arr.push(p); allPredMap.set(p.match_id, arr)
  }

  const todayStr = localTodayStr(timezone)
  const activeFecha = fecha ?? todayStr
  const isToday = !etapa && activeFecha === todayStr

  const now = new Date()
  const nextMatch = isToday ? (
    matches?.find(m => m.status === 'IN_PROGRESS') ??
    matches?.find(m => new Date(m.scheduled_time) > now)
  ) : null

  const hasLiveMatches = matches?.some(m => m.status === 'IN_PROGRESS') ?? false

  return (
    <SwipeNav currentFecha={activeFecha} currentEtapa={etapa} primaryColor={getTheme(theme).colors.primary}>
      <LiveRefresher hasLiveMatches={hasLiveMatches} />
      <div style={{ paddingTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
            Partidos
          </h1>
          {nextMatch && <NextMatchButton />}
        </div>

        <DateNav currentFecha={fecha} currentEtapa={etapa} timezone={timezone} availableDates={availableDates} />

        {!matches?.length ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', marginTop: 40 }}>
            No hay partidos para esta fecha
          </p>
        ) : (
          matches.map(match => {
            const locked = isMatchLocked(match.scheduled_time, bloqueoMinutos, match.early_unlock_at)
            const isNext = match.id === nextMatch?.id
            return (
              <div key={match.id} id={isNext ? 'next-match' : undefined}>
                <MatchCard
                  match={match}
                  myPrediction={myPredMap.get(match.id)}
                  allPredictions={locked || match.status === 'FINISHED' || match.status === 'IN_PROGRESS' ? (allPredMap.get(match.id) ?? []) : undefined}
                  isLocked={locked}
                  bloqueoMinutos={bloqueoMinutos}
                  timezone={timezone}
                  currentUserId={user!.id}
                  theme={theme}
                  venueName={match.venue_id ? venueMap.get(match.venue_id) : undefined}
                />
              </div>
            )
          })
        )}
      </div>
    </SwipeNav>
  )
}
