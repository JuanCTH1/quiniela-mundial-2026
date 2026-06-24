'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Countdown } from './Countdown'
import { getTeamFlag, getTeamAbbr, getLockTime } from '@/lib/utils'
import { getTheme, type Theme } from '@/lib/themes'
import type { Tables } from '@/types/database.types'

type MatchSlim = Pick<Tables<'matches'>,
  'id' | 'home_team' | 'away_team' | 'scheduled_time' | 'early_unlock_at' | 'stage' | 'group_name'>

type LiveMatchSlim = MatchSlim & {
  home_score_fulltime: number | null
  away_score_fulltime: number | null
}

type Pred = { home_score: number | null; away_score: number | null } | null

interface Props {
  liveMatches: LiveMatchSlim[]
  liveMatch: LiveMatchSlim | null
  nextMatch: MatchSlim | null
  prediction?: Pred
  livePredictions?: Pred[]
  bloqueoMinutos: number
  timezone: string
  theme?: Theme
}

export function NextMatchBanner({ liveMatches, liveMatch, nextMatch, prediction, livePredictions = [], bloqueoMinutos, timezone, theme = 'mexico' }: Props) {
  const pathname = usePathname()
  const t = getTheme(theme)

  if (pathname.startsWith('/partido/')) return null
  if (liveMatches.length === 0 && !nextMatch) return null

  // ── Dual live match banner (Option 1) ──────────────────────────────────────
  if (liveMatches.length >= 2) {
    return (
      <div style={{
        background: 'color-mix(in srgb, var(--warning) 10%, transparent)',
        padding: '6px 14px 8px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <div style={{ fontSize: 10, color: 'var(--warning)', fontWeight: 700, animation: 'dot-pulse 1.5s ease-in-out infinite' }}>
            ● {liveMatches.length} {t.texts.liveNow.replace(/^●\s*/, '')}
          </div>
          <Link href="/partidos" style={{ fontSize: 10, color: 'var(--text-dim)', textDecoration: 'none' }}>
            ver Hoy →
          </Link>
        </div>

        {/* Rows */}
        {liveMatches.map((m, i) => {
          const pred = livePredictions[i]
          const hasPred = pred?.home_score != null
          const homeAbbr = getTeamAbbr(m.home_team)
          const awayAbbr = getTeamAbbr(m.away_team)
          const homeFlag = getTeamFlag(m.home_team)
          const awayFlag = getTeamFlag(m.away_team)
          const h = m.home_score_fulltime ?? '–'
          const a = m.away_score_fulltime ?? '–'

          return (
            <Link key={m.id} href={`/partido/${m.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, marginTop: i > 0 ? 4 : 0 }}>
              {/* Score side */}
              <span style={{ fontSize: 13, color: 'var(--text-main)', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                {homeFlag}
                <span style={{ fontWeight: 600, marginLeft: 3 }}>{homeAbbr}</span>
                <span style={{ fontWeight: 800, color: 'var(--warning)', margin: '0 5px' }}>{h}–{a}</span>
                <span style={{ fontWeight: 600 }}>{awayAbbr}</span>
                {awayFlag}
              </span>

              {/* Prediction side */}
              {hasPred ? (
                <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {t.texts.you.toLowerCase()} <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{pred!.home_score}–{pred!.away_score}</span>
                </span>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>—</span>
              )}
            </Link>
          )
        })}
      </div>
    )
  }

  // ── Single live match banner ────────────────────────────────────────────────
  if (liveMatch) {
    const hasPred = prediction?.home_score != null
    return (
      <div>
        <Link href={`/partido/${liveMatch.id}`} style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{
            background: 'color-mix(in srgb, var(--warning) 10%, transparent)',
            padding: '8px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ fontSize: 10, color: 'var(--warning)', fontWeight: 700, flexShrink: 0, animation: 'dot-pulse 1.5s ease-in-out infinite' }}>
              {t.texts.liveNow}
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
                  {t.texts.you.toLowerCase()}: {prediction!.home_score}–{prediction!.away_score}
                </div>
              )}
            </div>
          </div>
        </Link>

        {nextMatch && (
          <Link href={`/partido/${nextMatch.id}`} style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{
              background: 'color-mix(in srgb, var(--theme-primary) 5%, transparent)',
              borderTop: '1px solid rgba(255,255,255,0.04)',
              padding: '5px 16px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>{t.texts.nextSmall}</div>
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

  // ── Next match banner ───────────────────────────────────────────────────────
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
        background: 'var(--glass-bg)',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{t.texts.nextMatch}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {getTeamFlag(nextMatch!.home_team)} {nextMatch!.home_team} vs {nextMatch!.away_team} {getTeamFlag(nextMatch!.away_team)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{kickoffStr}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {hasPred ? (
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
              {prediction!.home_score} – {prediction!.away_score}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--warning)' }}>{t.texts.noPrediction}</div>
          )}
          {!isLocked
            ? <Countdown target={lockTime.toISOString()} label={t.texts.closesIn} />
            : <Countdown target={nextMatch!.scheduled_time} label={t.texts.startsIn} />
          }
        </div>
      </div>
    </Link>
  )
}
