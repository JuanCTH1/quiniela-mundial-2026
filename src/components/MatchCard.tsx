import { PredictionForm } from './PredictionForm'
import { Countdown } from './Countdown'
import { Avatar } from './Avatar'
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

  const lockTime = getLockTime(match.scheduled_time, bloqueoMinutos)

  const matchTime = new Intl.DateTimeFormat('es-MX', {
    timeZone: timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(match.scheduled_time))

  const stateColor =
    isFinished ? 'rgba(255,255,255,0.2)' :
    isLocked ? 'var(--warning)' :
    'var(--success)'

  const stateLabel =
    isFinished ? 'Finalizado' :
    match.status === 'IN_PROGRESS' ? 'En juego' :
    isLocked ? 'Bloqueado' : 'Abierto'

  return (
    <div
      className="glass-card"
      style={{
        padding: '14px 16px',
        marginBottom: 10,
        borderLeft: `3px solid ${stateColor}`,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {STAGE_LABELS[match.stage] ?? match.stage}
          {match.group_name ? ` · Grupo ${match.group_name}` : ''}
        </span>
        <span style={{ fontSize: 11, fontWeight: 500, color: stateColor }}>{stateLabel}</span>
      </div>

      {/* Teams + score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontSize: 20, lineHeight: 1 }}>{getTeamFlag(match.home_team)}</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{match.home_team}</div>
        </div>

        <div style={{ textAlign: 'center', minWidth: 64 }}>
          {isFinished && hasResult ? (
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-main)', letterSpacing: 2 }}>
              {match.home_score_quiniela} – {match.away_score_quiniela}
            </div>
          ) : match.status === 'IN_PROGRESS' && match.home_score_fulltime != null ? (
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--warning)' }}>
              {match.home_score_fulltime} – {match.away_score_fulltime}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>vs</div>
          )}
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{matchTime}</div>
        </div>

        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 20, lineHeight: 1 }}>{getTeamFlag(match.away_team)}</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{match.away_team}</div>
        </div>
      </div>

      {/* Countdown + prediction form (OPEN state) */}
      {!isLocked && match.status === 'SCHEDULED' && (
        <>
          <Countdown
            target={lockTime.toISOString()}
            label="Cierra en"
          />
          <PredictionForm
            matchId={match.id}
            currentPrediction={myPrediction}
            disabled={false}
          />
        </>
      )}

      {/* Predictions grid (LOCKED or FINISHED) */}
      {(isLocked || isFinished) && allPredictions && allPredictions.length > 0 && (
        <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {allPredictions.map(pred => {
              const isMe = pred.user_id === currentUserId
              const name = pred.profiles?.display_name ?? '?'

              let result = null
              if (isFinished && hasResult && pred.home_score != null && pred.away_score != null) {
                result = calcResult(
                  pred.home_score, pred.away_score,
                  match.home_score_quiniela!, match.away_score_quiniela!
                )
              }

              const colors = result ? RESULT_COLORS[result.type] : null

              return (
                <div
                  key={pred.user_id}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 8,
                    border: `1px solid ${colors?.border ?? 'rgba(255,255,255,0.08)'}`,
                    background: colors?.bg ?? (isMe ? 'rgba(0,104,71,0.12)' : 'rgba(255,255,255,0.04)'),
                    fontSize: 11,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ color: 'var(--text-muted)', marginBottom: 2, fontWeight: isMe ? 600 : 400 }}>
                    {name.split(' ')[0]}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: colors?.text ?? 'var(--text-main)' }}>
                    {pred.home_score != null ? `${pred.home_score}–${pred.away_score}` : '—'}
                  </div>
                  {result && (
                    <div style={{ fontSize: 10, color: colors?.text, marginTop: 1, fontWeight: 600 }}>
                      {result.pts}pts
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* No prediction yet (open, locked with no prediction) */}
      {isLocked && !isFinished && (!myPrediction || myPrediction.home_score == null) && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
          Sin pronóstico tuyo para este partido
        </div>
      )}
    </div>
  )
}
