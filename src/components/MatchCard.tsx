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
  EXACTO:     { bg: 'rgba(52,168,83,0.18)',  border: 'rgba(52,168,83,0.5)',  text: '#34A853' },
  DIFERENCIA: { bg: 'rgba(66,133,244,0.18)', border: 'rgba(66,133,244,0.5)', text: '#4285F4' },
  TENDENCIA:  { bg: 'rgba(255,167,38,0.18)', border: 'rgba(255,167,38,0.5)', text: '#FFA726' },
  FALLO:      { bg: 'rgba(206,17,38,0.18)',  border: 'rgba(206,17,38,0.4)',  text: 'var(--mx-red)' },
}

export function MatchCard({
  match, myPrediction, allPredictions, isLocked, bloqueoMinutos, timezone, currentUserId,
}: Props) {
  // FINISHED pero quiniela aún null (cron no corrió): usar fulltime como fallback visual
  const finalHome = match.home_score_quiniela ?? match.home_score_fulltime
  const finalAway = match.away_score_quiniela ?? match.away_score_fulltime
  const isFinished = match.status === 'FINISHED' && finalHome != null
  const isLive = match.status === 'IN_PROGRESS'
  const hasLiveScore = isLive && match.home_score_fulltime != null
  const isOpen = !isLocked && match.status === 'SCHEDULED'

  const lockTime = getLockTime(match.scheduled_time, bloqueoMinutos)

  const matchTime = new Intl.DateTimeFormat('es-MX', {
    timeZone: timezone,
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(match.scheduled_time))

  const stateColor =
    isFinished ? 'rgba(255,255,255,0.2)' :
    isLive     ? 'var(--warning)' :
    isLocked   ? 'var(--warning)' : 'var(--success)'

  const stateLabel =
    isFinished ? 'Finalizado' :
    isLive     ? '● En juego' :
    isLocked   ? 'Bloqueado'  : 'Abierto'

  // Mi resultado (solo cuando hay resultado final quiniela confirmado)
  const myResult = (isFinished && match.home_score_quiniela != null && myPrediction?.home_score != null)
    ? calcResult(myPrediction.home_score, myPrediction.away_score!, match.home_score_quiniela, match.away_score_quiniela!)
    : null
  const myColors = myResult ? RESULT_COLORS[myResult.type] : null

  return (
    <div
      className="glass-card"
      style={{
        padding: '10px 14px', marginBottom: 8,
        borderLeft: `3px solid ${stateColor}`,
        ...(isLive && {
          background: 'rgba(245,158,11,0.07)',
          boxShadow: '0 0 0 1px rgba(245,158,11,0.2), 0 4px 20px rgba(245,158,11,0.08)',
          animation: 'live-pulse 2.5s ease-in-out infinite',
        }),
      }}
    >
      {/* Top section — clickable al detalle */}
      <Link href={`/partido/${match.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {STAGE_LABELS[match.stage] ?? match.stage}
            {match.group_name ? ` · G${match.group_name.replace('GROUP_', '')}` : ''}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: stateColor }}>{stateLabel}</span>
        </div>

        {/* Teams + score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Home */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{match.home_team}</span>
            <span style={{ fontSize: 22 }}>{getTeamFlag(match.home_team)}</span>
          </div>

          {/* Score / time */}
          <div style={{ textAlign: 'center', minWidth: 76 }}>
            {isFinished ? (
              <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: 2, color: 'var(--text-main)' }}>
                {finalHome} – {finalAway}
              </span>
            ) : hasLiveScore ? (
              <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: 2, color: 'var(--warning)' }}>
                {match.home_score_fulltime} – {match.away_score_fulltime}
              </span>
            ) : isLive ? (
              // En vivo pero sin score aún (0-0 o aún sin datos del API)
              <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: 2, color: 'var(--warning)' }}>
                – – –
              </span>
            ) : (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>vs</span>
            )}
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{matchTime}</div>
          </div>

          {/* Away */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 22 }}>{getTeamFlag(match.away_team)}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{match.away_team}</span>
          </div>
        </div>

        {/* Mi pronóstico — debajo del marcador, prominente pero secundario */}
        {myPrediction?.home_score != null && !isOpen && (
          <div style={{
            marginTop: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 10,
              background: myColors?.bg ?? 'rgba(255,255,255,0.05)',
              border: `1px solid ${myColors?.border ?? 'rgba(255,255,255,0.12)'}`,
            }}>
              <span style={{ fontSize: 10, color: myColors?.text ?? 'var(--text-muted)' }}>
                {myResult ? myResult.type : 'Tú'}
              </span>
              <span style={{ fontSize: 17, fontWeight: 700, color: myColors?.text ?? 'var(--text-main)', letterSpacing: 1 }}>
                {myPrediction.home_score}–{myPrediction.away_score}
              </span>
              {myResult && (
                <span style={{ fontSize: 10, color: myColors?.text, fontWeight: 600 }}>
                  {myResult.pts}pts
                </span>
              )}
            </div>
          </div>
        )}
      </Link>

      {/* Countdown + form (OPEN) */}
      {isOpen && (
        <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
          {/* Mi pronóstico cuando está abierto — arriba del form */}
          {myPrediction?.home_score != null && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
              Tu pronóstico actual: <span style={{ fontWeight: 700, color: 'var(--mx-green)', fontSize: 14 }}>
                {myPrediction.home_score}–{myPrediction.away_score}
              </span>
            </div>
          )}
          <Countdown target={lockTime.toISOString()} label="Cierra en" />
          <PredictionForm
            matchId={match.id}
            scheduledTime={match.scheduled_time}
            bloqueoMinutos={bloqueoMinutos}
            currentPrediction={myPrediction}
            disabled={false}
          />
        </div>
      )}

      {/* Predictions grid (LOCKED / FINISHED / LIVE) */}
      {(isLocked || isFinished || isLive) && allPredictions && allPredictions.length > 0 && (
        <div style={{
          marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8,
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4,
        }}>
          {allPredictions.map(pred => {
            const isMe = pred.user_id === currentUserId
            const name = (pred.profiles?.display_name ?? '?').split(' ')[0]
            const result = (isFinished && match.home_score_quiniela != null && pred.home_score != null)
              ? calcResult(pred.home_score, pred.away_score!, match.home_score_quiniela, match.away_score_quiniela!)
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
