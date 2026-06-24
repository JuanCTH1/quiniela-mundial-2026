'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Countdown } from './Countdown'
import { getTeamFlag, getTeamAbbr, getLockTime, formatLivePeriod } from '@/lib/utils'
import { getTheme, type Theme } from '@/lib/themes'
import type { Tables } from '@/types/database.types'

type MatchSlim = Pick<Tables<'matches'>,
  'id' | 'home_team' | 'away_team' | 'scheduled_time' | 'early_unlock_at' | 'stage' | 'group_name'>

type LiveMatchSlim = MatchSlim & {
  home_score_fulltime: number | null
  away_score_fulltime: number | null
  current_minute: number | null
  current_period: string | null
}

type Pred = { home_score: number | null; away_score: number | null } | null

// Marcador/tiempo mutable de un partido en vivo (se actualiza en tiempo real)
type LiveScore = { home: number | null; away: number | null; minute: number | null; period: string | null }

function initScores(matches: LiveMatchSlim[]): Record<string, LiveScore> {
  return Object.fromEntries(matches.map(m => [m.id, {
    home: m.home_score_fulltime, away: m.away_score_fulltime,
    minute: m.current_minute, period: m.current_period,
  }]))
}

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
  const router = useRouter()
  const t = getTheme(theme)

  // El banner es server-rendered: sin esto el marcador quedaría congelado.
  // Mantenemos los marcadores en vivo al día por realtime + polling.
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const [liveScores, setLiveScores] = useState<Record<string, LiveScore>>(() => initScores(liveMatches))
  const idsKey = liveMatches.map(m => m.id).join(',')

  useEffect(() => {
    setLiveScores(initScores(liveMatches))
    if (pathname.startsWith('/partido/')) return
    const ids = liveMatches.map(m => m.id)
    if (ids.length === 0) return

    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current

    const channel = sb.channel('live-banner')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, payload => {
        const row = payload.new as Tables<'matches'>
        if (!ids.includes(row.id)) return
        // Si el partido dejó de estar en vivo, recargamos la lista del servidor
        if (row.status !== 'IN_PROGRESS') { router.refresh(); return }
        setLiveScores(prev => ({ ...prev, [row.id]: {
          home: row.home_score_fulltime, away: row.away_score_fulltime,
          minute: row.current_minute, period: row.current_period,
        } }))
      })
      .subscribe()

    const poll = setInterval(async () => {
      const { data } = await sb.from('matches')
        .select('id, home_score_fulltime, away_score_fulltime, current_minute, current_period, status')
        .in('id', ids)
      if (!data) return
      if (data.some(m => m.status !== 'IN_PROGRESS')) { router.refresh(); return }
      setLiveScores(prev => {
        const next = { ...prev }
        for (const m of data) next[m.id] = {
          home: m.home_score_fulltime, away: m.away_score_fulltime,
          minute: m.current_minute, period: m.current_period,
        }
        return next
      })
    }, 12_000)

    return () => { sb.removeChannel(channel); clearInterval(poll) }
    // liveMatches/router son estables para un mismo idsKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, pathname])

  const scoreFor = (m: LiveMatchSlim): LiveScore => liveScores[m.id] ?? {
    home: m.home_score_fulltime, away: m.away_score_fulltime,
    minute: m.current_minute, period: m.current_period,
  }

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
          const sc = scoreFor(m)
          const h = sc.home ?? '–'
          const a = sc.away ?? '–'
          const timeLabel = formatLivePeriod(sc.period, sc.minute)

          return (
            <Link key={m.id} href={`/partido/${m.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, marginTop: i > 0 ? 4 : 0 }}>
              {/* Score side */}
              <span style={{ fontSize: 13, color: 'var(--text-main)', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                {homeFlag}
                <span style={{ fontWeight: 600, marginLeft: 3 }}>{homeAbbr}</span>
                <span style={{ fontWeight: 800, color: 'var(--warning)', margin: '0 5px' }}>{h}–{a}</span>
                <span style={{ fontWeight: 600 }}>{awayAbbr}</span>
                {awayFlag}
                {timeLabel && (
                  <span style={{ fontSize: 10, color: 'var(--warning)', marginLeft: 5, opacity: 0.85 }}>{timeLabel}</span>
                )}
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
    const sc = scoreFor(liveMatch)
    const liveLabel = formatLivePeriod(sc.period, sc.minute)
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
                {sc.home ?? '–'} – {sc.away ?? '–'}
              </div>
              {liveLabel && (
                <div style={{ fontSize: 10, color: 'var(--warning)', opacity: 0.85 }}>
                  {liveLabel}
                </div>
              )}
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
