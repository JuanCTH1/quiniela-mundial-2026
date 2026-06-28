import Link from 'next/link'
import { PredictionForm } from './PredictionForm'
import { Countdown } from './Countdown'
import { RankingPreview } from './RankingPreview'
import { calcResult, getLockTime, STAGE_LABELS } from '@/lib/utils'
import { LiveTimeLabel } from './LiveTimeLabel'
import { GoalList } from './GoalList'
import { TeamFlag } from './TeamFlag'
import { getTheme, type Theme } from '@/lib/themes'
import { MatchContextButton } from './MatchContextDrawer'
import type { GoalEntry } from '@/lib/football-data'
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
  theme?: Theme
  venueName?: string
}

const RESULT_COLORS = {
  EXACTO:     { bg: 'rgba(52,168,83,0.18)',  border: 'rgba(52,168,83,0.5)',  text: '#34A853' },
  DIFERENCIA: { bg: 'rgba(66,133,244,0.18)', border: 'rgba(66,133,244,0.5)', text: '#4285F4' },
  TENDENCIA:  { bg: 'rgba(255,167,38,0.18)', border: 'rgba(255,167,38,0.5)', text: '#FFA726' },
  FALLO:      { bg: 'rgba(206,17,38,0.18)',  border: 'rgba(206,17,38,0.4)',  text: 'var(--mx-red)' },
}

export function MatchCard({
  match, myPrediction, allPredictions, isLocked, bloqueoMinutos, timezone, currentUserId, theme = 'mexico', venueName,
}: Props) {
  const t = getTheme(theme)

  const resultLabels: Record<string, string> = {
    EXACTO: t.texts.exactLabel,
    DIFERENCIA: t.texts.diffLabel,
    TENDENCIA: t.texts.trendLabel,
    FALLO: t.texts.missLabel,
  }

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

  const stateBorder =
    isFinished ? 'rgba(255,255,255,0.15)' :
    isLive     ? 'var(--warning)' :
    isLocked   ? 'var(--warning)' : 'var(--primary)'

  const stateColor =
    isFinished ? 'var(--text-muted)' :
    isLive     ? 'var(--warning)' :
    isLocked   ? 'var(--warning)' : 'var(--primary)'

  const stateLabel =
    isFinished ? t.texts.finished :
    isLive     ? t.texts.live :
    isLocked   ? t.texts.locked : t.texts.open

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
        borderLeft: `3px solid ${stateBorder}`,
        ...(isLive && {
          background: 'color-mix(in srgb, var(--warning) 7%, transparent)',
          boxShadow: '0 0 0 1px color-mix(in srgb, var(--warning) 20%, transparent), 0 4px 20px color-mix(in srgb, var(--warning) 8%, transparent)',
          animation: 'live-pulse 2.5s ease-in-out infinite',
        }),
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {STAGE_LABELS[match.stage] ?? match.stage}
          {match.group_name ? ` · G${match.group_name.replace('GROUP_', '')}` : ''}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: stateColor }}>{stateLabel}</span>
      </div>

      {/* Body — clickable al detalle */}
      <Link href={`/partido/${match.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        {/* Teams + score */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          {/* Home */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{match.home_team}</span>
              <TeamFlag name={match.home_team} size={22} />
            </div>
            {(isLive || isFinished) && (
              <GoalList goals={(match.goals as GoalEntry[] | null) ?? []} side="home" align="right" />
            )}
          </div>

          {/* Score / time */}
          <div style={{ textAlign: 'center', minWidth: 76 }}>
            {isFinished ? (
              <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: 2, color: 'var(--text-main)' }}>
                {finalHome} – {finalAway}
              </span>
            ) : hasLiveScore ? (
              <>
                <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: 2, color: 'var(--warning)' }}>
                  {match.home_score_fulltime} – {match.away_score_fulltime}
                </span>
                <LiveTimeLabel
                  period={match.current_period}
                  minute={match.current_minute}
                  actualStartTime={match.actual_start_time}
                  secondHalfStartTime={match.second_half_start_time}
                  extraTimeStartTime={match.extra_time_start_time}
                  style={{ display: 'block', fontSize: 10, color: 'var(--warning)', fontWeight: 600, marginTop: 2 }}
                />
              </>
            ) : isLive ? (
              <>
                <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: 2, color: 'var(--warning)' }}>
                  – – –
                </span>
                <LiveTimeLabel
                  period={match.current_period}
                  minute={match.current_minute}
                  actualStartTime={match.actual_start_time}
                  secondHalfStartTime={match.second_half_start_time}
                  extraTimeStartTime={match.extra_time_start_time}
                  style={{ display: 'block', fontSize: 10, color: 'var(--warning)', fontWeight: 600, marginTop: 2 }}
                />
              </>
            ) : (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>vs</span>
            )}
            {!isLive && <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{matchTime}</div>}
            {venueName && <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>{venueName}</div>}
          </div>

          {/* Away */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TeamFlag name={match.away_team} size={22} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{match.away_team}</span>
            </div>
            {(isLive || isFinished) && (
              <GoalList goals={(match.goals as GoalEntry[] | null) ?? []} side="away" align="left" />
            )}
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
                {myResult ? (resultLabels[myResult.type] ?? myResult.type) : t.texts.you}
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

      {/* Botón análisis — centrado, fuera del Link */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10, marginBottom: 2 }}>
        <MatchContextButton matchId={match.id} homeTeam={match.home_team} awayTeam={match.away_team} />
      </div>

      {/* Countdown + form (OPEN) */}
      {isOpen && (
        <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
          {/* Mi pronóstico cuando está abierto — arriba del form */}
          {myPrediction?.home_score != null && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
              {t.texts.yourPrediction}: <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 14 }}>
                {myPrediction.home_score}–{myPrediction.away_score}
              </span>
            </div>
          )}
          <Countdown target={lockTime.toISOString()} label={t.texts.closesIn} />
          <PredictionForm
            matchId={match.id}
            scheduledTime={match.scheduled_time}
            bloqueoMinutos={bloqueoMinutos}
            currentPrediction={myPrediction}
            disabled={false}
            theme={theme}
          />
        </div>
      )}

      {/* Ranking preview (LOCKED / FINISHED / LIVE) */}
      {(isLocked || isFinished || isLive) && allPredictions && allPredictions.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <RankingPreview
            matchId={match.id}
            match={match}
            allPredictions={allPredictions}
            currentUserId={currentUserId ?? ''}
            isFinished={isFinished}
            isLive={isLive}
            theme={theme}
          />
        </div>
      )}
    </div>
  )
}
