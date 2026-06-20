'use client'

import Link from 'next/link'
import { Countdown } from './Countdown'
import { getTeamFlag, getLockTime } from '@/lib/utils'
type MatchSlim = Pick<import('@/types/database.types').Tables<'matches'>,
  'id' | 'home_team' | 'away_team' | 'scheduled_time' | 'early_unlock_at' | 'stage' | 'group_name'>

interface Props {
  match: MatchSlim | null
  prediction?: { home_score: number | null; away_score: number | null } | null
  bloqueoMinutos: number
  timezone: string
}

export function NextMatchBanner({ match, prediction, bloqueoMinutos, timezone }: Props) {
  if (!match) return null

  const lockTime = getLockTime(match.scheduled_time, bloqueoMinutos)
  const isLocked = Date.now() >= lockTime.getTime()
  const hasPred = prediction?.home_score != null

  const kickoffStr = new Intl.DateTimeFormat('es-MX', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(match.scheduled_time))

  return (
    <Link href={`/partido/${match.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          background: 'rgba(0,104,71,0.08)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {/* Next match info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Próximo partido</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {getTeamFlag(match.home_team)} {match.home_team} vs {match.away_team} {getTeamFlag(match.away_team)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{kickoffStr}</div>
        </div>

        {/* Prediction + countdown */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {hasPred ? (
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--mx-green)' }}>
              {prediction!.home_score} – {prediction!.away_score}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--warning)' }}>Sin pronóstico</div>
          )}
          {!isLocked ? (
            <Countdown target={lockTime.toISOString()} label="Cierra en" />
          ) : (
            <Countdown target={match.scheduled_time} label="Empieza en" />
          )}
        </div>
      </div>
    </Link>
  )
}
