import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Avatar } from '@/components/Avatar'
import { getTeamFlag, calcResult, isMatchLocked, STAGE_LABELS } from '@/lib/utils'
import { LiveMatchClient } from './LiveMatchClient'
import Link from 'next/link'

const RESULT_COLORS = {
  EXACTO: { bg: 'rgba(52,168,83,0.15)', border: 'rgba(52,168,83,0.4)', text: '#34A853' },
  DIFERENCIA: { bg: 'rgba(66,133,244,0.15)', border: 'rgba(66,133,244,0.4)', text: '#4285F4' },
  TENDENCIA: { bg: 'rgba(255,167,38,0.15)', border: 'rgba(255,167,38,0.4)', text: '#FFA726' },
  FALLO: { bg: 'rgba(206,17,38,0.15)', border: 'rgba(206,17,38,0.3)', text: 'var(--mx-red)' },
}

export default async function PartidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [matchRes, settingsRes, profileRes] = await Promise.all([
    supabase.from('matches').select('*').eq('id', id).single(),
    supabase.from('settings').select('key, value'),
    supabase.from('profiles').select('timezone').eq('id', user!.id).single(),
  ])

  if (!matchRes.data) notFound()
  const match = matchRes.data
  const settings = settingsRes.data ?? []
  const bloqueoMinutos = parseInt(settings.find(s => s.key === 'bloqueo_minutos')?.value ?? '15')
  const timezone = profileRes.data?.timezone ?? 'America/Mexico_City'
  const locked = isMatchLocked(match.scheduled_time, bloqueoMinutos, match.early_unlock_at)
  const isFinished = match.status === 'FINISHED' && match.home_score_quiniela != null
  const isLive = match.status === 'IN_PROGRESS'

  // Fetch all predictions if locked/finished (two queries — no FK in public schema)
  type PredWithProfile = {
    user_id: string
    home_score: number | null
    away_score: number | null
    profiles: { display_name: string; avatar_url: string | null } | null
  }

  let predictions: PredWithProfile[] = []
  if (locked || isFinished) {
    const [predsRes, profilesRes] = await Promise.all([
      supabase.from('predictions').select('user_id, home_score, away_score').eq('match_id', id),
      supabase.from('profiles').select('id, display_name, avatar_url'),
    ])
    const profileMap = new Map((profilesRes.data ?? []).map(p => [p.id, p]))
    predictions = (predsRes.data ?? []).map(p => ({
      ...p,
      profiles: profileMap.get(p.user_id)
        ? { display_name: profileMap.get(p.user_id)!.display_name, avatar_url: profileMap.get(p.user_id)!.avatar_url }
        : null,
    }))
  }

  // My prediction
  const myPred = predictions.find(p => p.user_id === user!.id)

  const matchTime = new Intl.DateTimeFormat('es-MX', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(match.scheduled_time))

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <Link href="/partidos" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14 }}>
        ← Partidos
      </Link>

      {/* Match header */}
      <div className="glass-card" style={{ padding: '20px 16px', marginBottom: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {STAGE_LABELS[match.stage] ?? match.stage}
          {match.group_name ? ` · Grupo ${match.group_name}` : ''}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 36 }}>{getTeamFlag(match.home_team)}</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{match.home_team}</div>
          </div>

          <div style={{ minWidth: 80, textAlign: 'center' }}>
            {isFinished || isLive ? (
              <LiveMatchClient
                matchId={id}
                initialHomeScore={isFinished ? match.home_score_quiniela : match.home_score_fulltime}
                initialAwayScore={isFinished ? match.away_score_quiniela : match.away_score_fulltime}
                isLive={isLive}
                isFinished={isFinished}
                predictions={predictions}
              />
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>vs</div>
            )}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{matchTime}</div>
          </div>

          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 36 }}>{getTeamFlag(match.away_team)}</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{match.away_team}</div>
          </div>
        </div>
      </div>

      {/* Predictions */}
      {(locked || isFinished) && predictions && predictions.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Pronósticos
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {predictions.map(pred => {
              const isMe = pred.user_id === user!.id
              const profile = Array.isArray(pred.profiles) ? pred.profiles[0] : pred.profiles
              const name = profile?.display_name ?? '?'
              const result = (isFinished && match.home_score_quiniela != null && pred.home_score != null)
                ? calcResult(pred.home_score, pred.away_score!, match.home_score_quiniela, match.away_score_quiniela!)
                : null
              const colors = result ? RESULT_COLORS[result.type] : null

              return (
                <div
                  key={pred.user_id}
                  className="glass-card"
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: isMe ? 'rgba(0,104,71,0.12)' : colors?.bg ?? undefined,
                    borderColor: isMe ? 'rgba(0,104,71,0.3)' : colors?.border ?? undefined,
                  }}
                >
                  <Avatar name={name} avatarUrl={profile?.avatar_url} size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: isMe ? 700 : 500 }}>{name}{isMe ? ' (tú)' : ''}</div>
                    {result && (
                      <div style={{ fontSize: 11, color: colors?.text, fontWeight: 600 }}>
                        {result.type} · {result.pts} pts
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: colors?.text ?? 'var(--text-main)' }}>
                    {pred.home_score != null ? `${pred.home_score} – ${pred.away_score}` : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!locked && (
        <div className="glass-card" style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Los pronósticos se revelan cuando el partido se bloquee
        </div>
      )}
    </div>
  )
}
