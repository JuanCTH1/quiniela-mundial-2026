import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Avatar } from '@/components/Avatar'
import { PredictionForm } from '@/components/PredictionForm'
import { RankingPreview } from '@/components/RankingPreview'
import { isMatchLocked, STAGE_LABELS } from '@/lib/utils'
import { TeamFlag } from '@/components/TeamFlag'
import { GoalList } from '@/components/GoalList'
import { getTheme, type Theme } from '@/lib/themes'
import { LiveMatchClient } from './LiveMatchClient'
import type { GoalEntry } from '@/lib/football-data'
import { MatchContext } from '@/components/MatchContext'
import { getMatchContext } from '@/lib/match-context'
import Link from 'next/link'

export default async function PartidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Admin client para ver quién ya metió pronóstico (RLS solo deja ver los propios)
  const admin = createAdminClient()

  const [matchRes, settingsRes, profileRes, allProfilesRes, submittedIdsRes, myPredRes] = await Promise.all([
    supabase.from('matches').select('*').eq('id', id).single(),
    supabase.from('settings').select('key, value'),
    supabase.from('profiles').select('timezone, theme').eq('id', user!.id).single(),
    (() => {
      const q = supabase.from('profiles').select('id, display_name, avatar_url')
      return process.env.NEXT_PUBLIC_APP_ENV === 'production' ? q.eq('is_test', false) : q
    })(),
    admin.from('predictions').select('user_id').eq('match_id', id),
    supabase.from('predictions').select('home_score, away_score').eq('match_id', id).eq('user_id', user!.id).maybeSingle(),
  ])

  if (!matchRes.data) notFound()
  const match = matchRes.data
  const settings = settingsRes.data ?? []
  const bloqueoMinutos = parseInt(settings.find(s => s.key === 'bloqueo_minutos')?.value ?? '15')
  const timezone = profileRes.data?.timezone ?? 'America/Mexico_City'
  const theme = (profileRes.data?.theme as Theme) ?? 'mexico'
  const t = getTheme(theme)
  const locked = isMatchLocked(match.scheduled_time, bloqueoMinutos, match.early_unlock_at)
  const isFinished = match.status === 'FINISHED' && match.home_score_quiniela != null
  const isLive = match.status === 'IN_PROGRESS'

  const allProfiles = allProfilesRes.data ?? []
  const submittedIds = new Set((submittedIdsRes.data ?? []).map(p => p.user_id))
  const missingProfiles = allProfiles.filter(p => !submittedIds.has(p.id))

  // Full predictions with scores (only when revealed)
  type PredWithProfile = {
    user_id: string
    home_score: number | null
    away_score: number | null
    profiles: { display_name: string; avatar_url: string | null } | null
  }

  let predictions: PredWithProfile[] = []
  if (locked || isFinished || isLive) {
    const predsRes = await supabase.from('predictions').select('user_id, home_score, away_score').eq('match_id', id)
    const profileMap = new Map(allProfiles.map(p => [p.id, p]))
    predictions = (predsRes.data ?? [])
      .filter(p => profileMap.has(p.user_id))
      .map(p => ({
        ...p,
        profiles: { display_name: profileMap.get(p.user_id)!.display_name, avatar_url: profileMap.get(p.user_id)!.avatar_url },
      }))
  }

  const myPred = predictions.find(p => p.user_id === user!.id)

  const matchTime = new Intl.DateTimeFormat(t.locale, {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(match.scheduled_time))

  // Contexto del partido (sede, momios, forma, H2H, DTs, facts…). Resiliente:
  // cada bloque faltante se omite; si no hay nada, el componente no renderiza.
  const matchContext = await getMatchContext(id, match.home_team, match.away_team)

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <Link href="/partidos" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14 }}>
        {t.texts.back}
      </Link>

      {/* Editor de pronóstico (OPEN) */}
      {!locked && !isFinished && !isLive && (
        <div className="glass-card" style={{ padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase' }}>
            {t.texts.yourPredLabel}
          </div>
          <PredictionForm
            matchId={id}
            scheduledTime={match.scheduled_time}
            bloqueoMinutos={bloqueoMinutos}
            currentPrediction={myPredRes.data}
            disabled={false}
            theme={theme}
          />
        </div>
      )}

      {/* Match header */}
      <div className="glass-card" style={{ padding: '20px 16px', marginBottom: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {STAGE_LABELS[match.stage] ?? match.stage}
          {match.group_name ? ` · ${t.texts.group} ${match.group_name.replace('GROUP_', '')}` : ''}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <TeamFlag name={match.home_team} size={36} />
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{match.home_team}</div>
            {(isLive || isFinished) && (
              <GoalList goals={(match.goals as GoalEntry[] | null) ?? []} side="home" align="right" />
            )}
          </div>

          <div style={{ minWidth: 80, textAlign: 'center' }}>
            {isFinished || isLive ? (
              <LiveMatchClient
                matchId={id}
                initialHomeScore={isFinished ? match.home_score_quiniela : match.home_score_fulltime}
                initialAwayScore={isFinished ? match.away_score_quiniela : match.away_score_fulltime}
                initialMinute={isLive ? match.current_minute : null}
                initialPeriod={isLive ? match.current_period : null}
                initialActualStartTime={isLive ? match.actual_start_time : null}
                initialSecondHalfStartTime={isLive ? match.second_half_start_time : null}
                initialExtraTimeStartTime={isLive ? match.extra_time_start_time : null}
                isLive={isLive}
                isFinished={isFinished}
                predictions={predictions}
              />
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>vs</div>
            )}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{matchTime}</div>
            {matchContext?.venue?.name && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{matchContext.venue.name}</div>
            )}
          </div>

          <div style={{ flex: 1, textAlign: 'center' }}>
            <TeamFlag name={match.away_team} size={36} />
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{match.away_team}</div>
            {(isLive || isFinished) && (
              <GoalList goals={(match.goals as GoalEntry[] | null) ?? []} side="away" align="left" />
            )}
          </div>
        </div>
      </div>

      {/* Contexto del partido */}
      <MatchContext data={matchContext} />

      {/* Quiénes faltan */}
      {missingProfiles.length > 0 && (
        <div
          className="glass-card"
          style={{
            padding: '10px 14px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: locked ? 'rgba(139,0,0,0.10)' : 'color-mix(in srgb, var(--warning) 8%, transparent)',
            borderColor: locked ? 'rgba(139,0,0,0.3)' : 'color-mix(in srgb, var(--warning) 25%, transparent)',
          }}
        >
          <div style={{ fontSize: 16 }}>{locked ? '🤐' : '⏳'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: locked ? 'var(--shame-red)' : 'var(--warning)', marginBottom: 6 }}>
              {locked ? t.texts.noPlayed : t.texts.missingPred}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {missingProfiles.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Avatar name={p.display_name} avatarUrl={p.avatar_url} size={24} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.display_name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ranking con coronas y puntos */}
      {(locked || isFinished || isLive) && predictions.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t.texts.rankingTitle}
          </h2>
          <RankingPreview
            matchId={id}
            match={match}
            allPredictions={predictions}
            currentUserId={user!.id}
            isFinished={isFinished}
            isLive={isLive}
            theme={theme}
          />
        </div>
      )}

      {!locked && !isLive && !isFinished && (
        <div className="glass-card" style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          {t.texts.revealWhenLocked}
        </div>
      )}
    </div>
  )
}
