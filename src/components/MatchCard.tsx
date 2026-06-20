import Link from 'next/link'
import { PredictionForm } from './PredictionForm'
import { Countdown } from './Countdown'
import { getTeamFlag, calcResult, getLockTime, STAGE_LABELS } from '@/lib/utils'
import type { Tables } from '@/types/database.types'
type Match = Tables<'matches'>

interface Prediction {
  user_id: string
  home_score: number | null
  away_score: number | null
  profiles: { display_name: string; avatar_url: string | null } | null
}

interface Props {
  match: Match
  myPrediction?: { home_score: number | null; away_score: number | null } | null
  allPredictions?: Prediction[]
  isLocked: boolean
  bloqueoMinutos: number
  timezone: string
  currentUserId?: string
}

const RESULT_COLORS = {
  EXACTO: { bg: 'rgba(52,168,83,0.15)', border: 'rgba(52,168,83,0.4)', text: '#34A853' },
  DIFERENCIA: { bg: 'rgba(66,133,244,0.15)', border: 'rgba(66,133,244,0.4)', text: '#4285F4' },
  TENDENCIA: { bg: 'rgba(255,167,38,0.15)', border: 'rgba(255,167,38,0.4)', text: '#FFA726' },
  FALLO: { bg: 'rgba(206,17,38,0.15)', border: 'rgba(206,17,38,0.3)', text: 'var(--mx-red)' },
}

export function MatchCard({
  match, myPrediction, allPredictions, isLocked, bloqueoMinutos, timezone, currentUserId,
}: Props) {
  const isFinished = match.status === 'FINISHED' && match.home_score_quiniela != null
  const hasResult = match.home_score_quiniela != null && match.away_score_quiniela != null
  const isOpen = !isLocked && match.status === 'SCHEDULED'

  const lockTime = getLockTime(match.scheduled_time, bloqueoMinutos)

  const matchTime = new Intl.DateTimeFormat('es-MX', {
    timeZone: timezone,
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(match.scheduled_time))

  const stateColor =
    isFinished ? 'rgba(255,255,255,0.2)' :
    match.status === 'IN_PROGRESS' ? 'var(--warning)' :
    isLocked ? 'var(--warning)' : 'var(--success)'

  const stateLabel =
    isFinished ? 'Finalizado' :
    match.status === 'IN_PROGRESS' ? '● En juego' :
    isLocked ? 'Bloqueado' : 'Abierto'

  const myPredStr = myPrediction?.home_score != null
    ? `${myPrediction.home_score}–${myPrediction.away_score}`
    : null

  // The clickable part (header + teams) links to the detail page
  const inner = (
    <>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {STAGE_LABELS[match.stage] ?? match.stage}
          {match.group_name ? ` · G${match.group_name.replace('GROUP_','')}` : ''}
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, color: stateColor }}>{stateLabel}</span>
      </div>

      {/* Teams row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Home */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{match.home_team}</span>
          <span style={{ fontSize: 22 }}>{getTeamFlag(match.home_team)}</span>
        </div>

        {/* Score / time */}
        <div style={{ textAlign: 'center', minWidth: 72 }}>
          {isFinished && hasResult ? (
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>
              {match.home_score_quiniela} – {match.away_score_quiniela}
            </span>
          ) : match.status === 'IN_PROGRESS' && match.home_score_fulltime != null ? (
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--warning)' }}>
              {match.home_score_fulltime} – {match.away_score_fulltime}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>vs</span>
          )}
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>{matchTime}</div>
        </div>

        {/* Away */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 22 }}>{getTeamFlag(match.away_team)}</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{match.away_team}</span>
        </div>
      </div>
    </>
  )

  return (
    <div
      className="glass-card"
      style={{ padding: '10px 14px', marginBottom: 8, borderLeft: `3px solid ${stateColor}` }}
    >
      {/* Top section — clickable to detail */}
      <Link href={`/partido/${match.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        {inner}
      </Link>

      {/* My prediction mini-badge */}
      {myPredStr && (
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          Tu pronóstico: <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{myPredStr}</span>
        </div>
      )}

      {/* Countdown + form (OPEN) */}
      {isOpen && (
        <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
          <Countdown target={lockTime.toISOString()} label="Cierra en" />
          <PredictionForm matchId={match.id} currentPrediction={myPrediction} disabled={false} />
        </div>
      )}

      {/* Predictions grid (LOCKED / FINISHED) */}
      {(isLocked || isFinished) && allPredictions && allPredictions.length > 0 && (
        <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8,
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
          {allPredictions.map(pred => {
            const isMe = pred.user_id === currentUserId
            const name = (pred.profiles?.display_name ?? '?').split(' ')[0]
            const result = (isFinished && hasResult && pred.home_score != null)
              ? calcResult(pred.home_score, pred.away_score!, match.home_score_quiniela!, match.away_score_quiniela!)
              : null
            const colors = result ? RESULT_COLORS[result.type] : null

            return (
              <div key={pred.user_id} style={{
                padding: '5px 6px', borderRadius: 7,
                border: `1px solid ${colors?.border ?? (isMe ? 'rgba(0,104,71,0.4)' : 'rgba(255,255,255,0.07)')}`,
                background: colors?.bg ?? (isMe ? 'rgba(0,104,71,0.1)' : 'rgba(255,255,255,0.03)'),
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: isMe ? 600 : 400 }}>{name}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: colors?.text ?? 'var(--text-main)' }}>
                  {pred.home_score != null ? `${pred.home_score}–${pred.away_score}` : '—'}
                </div>
                {result && <div style={{ fontSize: 9, color: colors?.text, fontWeight: 600 }}>{result.pts}pts</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
