'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcResult } from '@/lib/utils'
import { getTheme, type Theme } from '@/lib/themes'
import type { Tables } from '@/types/database.types'

type Prediction = {
  user_id: string
  home_score: number | null
  away_score: number | null
  profiles: { display_name: string; avatar_url: string | null } | null
}

type Match = Pick<Tables<'matches'>, 'id' | 'status' | 'home_score_quiniela' | 'away_score_quiniela' | 'home_score_fulltime' | 'away_score_fulltime' | 'stage'>

interface Props {
  matchId: string
  match: Match
  allPredictions: Prediction[]
  currentUserId: string
  isFinished: boolean
  isLive?: boolean
  theme?: Theme
}

interface RankedPred {
  pred: Prediction
  rank: number
  pts: number
  resultType?: string
  globalPts?: number
}

const RESULT_COLORS: Record<string, { text: string }> = {
  EXACTO: { text: '#34A853' },
  DIFERENCIA: { text: '#4285F4' },
  TENDENCIA: { text: '#FFA726' },
  FALLO: { text: 'var(--mx-red)' },
}

export function RankingPreview({ matchId, match, allPredictions, currentUserId, isFinished, isLive, theme = 'mexico' }: Props) {
  const t = getTheme(theme)
  const [ranked, setRanked] = useState<RankedPred[]>([])
  const [loading, setLoading] = useState(true)
  const [liveHome, setLiveHome] = useState<number | null>(match.home_score_fulltime ?? null)
  const [liveAway, setLiveAway] = useState<number | null>(match.away_score_fulltime ?? null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  function getClient() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  useEffect(() => {
    if (!isLive) return
    const sb = getClient()

    const channel = sb.channel(`ranking-live-${matchId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'matches',
        filter: `id=eq.${matchId}`,
      }, payload => {
        const row = payload.new as Tables<'matches'>
        setLiveHome(v => row.home_score_fulltime ?? v)
        setLiveAway(v => row.away_score_fulltime ?? v)
      })
      .subscribe()

    const poll = setInterval(async () => {
      const { data } = await sb.from('matches')
        .select('home_score_fulltime, away_score_fulltime')
        .eq('id', matchId).single()
      if (data) {
        setLiveHome(data.home_score_fulltime)
        setLiveAway(data.away_score_fulltime)
      }
    }, 10_000)

    return () => { sb.removeChannel(channel); clearInterval(poll) }
  }, [matchId, isLive])

  useEffect(() => {
    async function calculateRanking() {
      // liveHome puede arrancar null si el cron aún no corrió al cargar la página;
      // fallback al prop para no mostrar ranking sin orden mientras llega el primer poll.
      const scoreH = isFinished ? match.home_score_quiniela : (liveHome ?? match.home_score_fulltime ?? null)
      const scoreA = isFinished ? match.away_score_quiniela : (liveAway ?? match.away_score_fulltime ?? null)
      const hasScore = scoreH != null && scoreA != null

      const withLocalPts = allPredictions
        .map(pred => {
          let pts = 0
          let resultType = 'FALLO'

          if (hasScore && pred.home_score != null) {
            const result = calcResult(pred.home_score, pred.away_score!, scoreH!, scoreA!)
            if (result) {
              pts = result.pts
              resultType = result.type
            }
          }

          return { pred, pts, resultType }
        })
        .sort((a, b) => (isFinished || isLive) ? (b.pts - a.pts) : 0)
        .map((item, idx) => ({ ...item, rank: idx + 1 }))

      let withGlobalPts = withLocalPts

      if (isFinished) {
        try {
          const supabase = createClient()

          const { data: allResults } = await supabase
            .from('predictions')
            .select(`
              match_id,
              home_score,
              away_score,
              matches:matches (home_score_quiniela, away_score_quiniela, stage)
            `)
            .eq('user_id', currentUserId)

          let globalPts = 0
          if (allResults) {
            for (const result of allResults) {
              const m = result.matches as any
              if (m?.home_score_quiniela != null && result.home_score != null) {
                const res = calcResult(result.home_score, result.away_score!, m.home_score_quiniela, m.away_score_quiniela)
                if (res) globalPts += res.pts
              }
            }
          }

          withGlobalPts = withLocalPts.map(item =>
            item.pred.user_id === currentUserId ? { ...item, globalPts } : item
          )
        } catch (err) {
          console.error('Error calculando ranking global:', err)
        }
      }

      setRanked(withGlobalPts)
      setLoading(false)
    }

    calculateRanking()
  }, [isFinished, isLive, match, allPredictions, currentUserId, liveHome, liveAway])

  if (loading) return null
  if (ranked.length === 0) return null

  const positions = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ranked.map(item => {
        const { pred, rank, pts, resultType, globalPts } = item
        const isMe = pred.user_id === currentUserId
        const name = (pred.profiles?.display_name ?? '?').split(' ')[0]
        const posEmoji = positions[rank - 1] ?? `#${rank}`
        const textColor = isFinished ? (RESULT_COLORS[resultType ?? 'FALLO']?.text ?? 'var(--text-main)') : 'var(--text-main)'

        return (
          <div
            key={pred.user_id}
            className="glass-card"
            style={{
              padding: '10px 12px', borderRadius: 8,
              background: isMe ? 'color-mix(in srgb, var(--theme-primary) 12%, transparent)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isMe ? 'color-mix(in srgb, var(--theme-primary) 30%, transparent)' : 'rgba(255,255,255,0.08)'}`,
              display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
            }}
          >
            <span style={{ fontSize: 18, minWidth: 28, textAlign: 'center' }}>
              {posEmoji}
            </span>

            <span style={{
              fontSize: 13,
              color: isMe ? 'var(--primary)' : 'var(--text-main)',
              fontWeight: isMe ? 700 : 500,
              flex: 1,
            }}>
              {name}{isMe ? ` (${t.texts.you.toLowerCase()})` : ''}
            </span>

            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {pred.home_score != null ? `${pred.home_score}–${pred.away_score}` : '—'}
            </span>

            {isFinished && (
              <span style={{ fontSize: 13, fontWeight: 700, color: textColor, minWidth: 32, textAlign: 'right' }}>
                +{pts} pts
              </span>
            )}

            {isMe && globalPts != null && (
              <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600, paddingLeft: 8, borderLeft: '1px solid color-mix(in srgb, var(--theme-primary) 30%, transparent)' }}>
                {globalPts}⭐
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
