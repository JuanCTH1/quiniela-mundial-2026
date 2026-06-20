'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Countdown } from './Countdown'
import { getTeamFlag, getLockTime } from '@/lib/utils'
import type { Tables } from '@/types/database.types'

type MatchSlim = Pick<Tables<'matches'>,
  'id' | 'home_team' | 'away_team' | 'scheduled_time' | 'early_unlock_at' | 'stage' | 'group_name'>

type LiveMatchSlim = MatchSlim & {
  home_score_fulltime: number | null
  away_score_fulltime: number | null
}

interface Props {
  liveMatch: LiveMatchSlim | null
  nextMatch: MatchSlim | null
  prediction?: { home_score: number | null; away_score: number | null } | null
  bloqueoMinutos: number
  timezone: string
}

export function NextMatchBanner({ liveMatch, nextMatch, prediction, bloqueoMinutos, timezone }: Props) {
  const pathname = usePathname()

  // Ocultar en el detalle de un partido concreto — ya estás adentro
  if (pathname.startsWith('/partido/')) return null
  if (!liveMatch && !nextMatch) return null

  // ── Partido en vivo ────────────────────────────────────────────────────────
  if (liveMatch) {
    const hasPred = prediction?.home_score != null
    return (
      <div>
        <Link href={`/partido/${liveMatch.id}`} style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{
            background: 'rgba(245,158,11,0.10)',
            padding: '8px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ fontSize: 10, color: 'var(--warning)', fontWeight: 700, flexShrink: 0, animation: 'dot-pulse 1.5s ease-in-out infinite' }}>
              ● EN VIVO
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {getTeamFlag(liveMatch.home_team)} {liveMatch.home_team} vs {liveMatch.away_team} {getTeamFlag(liveMatch.away_team)}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--warning)', letterSpacing: 2 }}>
                {liveMatch.home_score_fulltime ?? '–'} – {liveMatch.away_score_fulltime ?? '–'}
              </div>
              {hasPred && (
                <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                  tú: {prediction!.home_score}–{prediction!.away_score}
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* Próximo partido en chiquito si hay uno */}
        {nextMatch && (
          <Link href={`/partido/${nextMatch.id}`} style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{
              background: 'rgba(0,104,71,0.05)',
              borderTop: '1px solid rgba(255,255,255,0.04)',
              padding: '5px 16px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>Próximo</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {getTeamFlag(nextMatch.home_team)} {nextMatch.home_team} vs {nextMatch.away_team} {getTeamFlag(nextMatch.away_team)}
              </div>
              <Countdown target={nextMatch.scheduled_time} label="" small />
            </div>
          </Link>
        )}
      </div>
    )
  }

  // ── Próximo partido (sin en vivo) ──────────────────────────────────────────
  const lockTime = getLockTime(nextMatch!.scheduled_time, bloqueoMinutos)
  const isLocked = Date.now() >= lockTime.getTime()
  const hasPred = prediction?.home_score != null

  const kickoffStr = new Intl.DateTimeFormat('es-MX', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit',
    weekday: 'short', day: 'numeric', month: 'short',
  }).format(new Date(nextMatch!.scheduled_time))

  return (
    <Link href={`/partido/${nextMatch!.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: 'rgba(0,104,71,0.08)',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Próximo partido</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {getTeamFlag(nextMatch!.home_team)} {nextMatch!.home_team} vs {nextMatch!.away_team} {getTeamFlag(nextMatch!.away_team)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{kickoffStr}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {hasPred ? (
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--mx-green)' }}>
              {prediction!.home_score} – {prediction!.away_score}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--warning)' }}>Sin pronóstico</div>
          )}
          {!isLocked
            ? <Countdown target={lockTime.toISOString()} label="Cierra en" />
            : <Countdown target={nextMatch!.scheduled_time} label="Empieza en" />
          }
        </div>
      </div>
    </Link>
  )
}
