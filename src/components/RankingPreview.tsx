'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcResult, STAGE_LABELS } from '@/lib/utils'
import type { Tables } from '@/types/database.types'

type Prediction = {
  user_id: string
  home_score: number | null
  away_score: number | null
  profiles: { display_name: string; avatar_url: string | null } | null
}

type Match = Pick<Tables<'matches'>, 'id' | 'status' | 'home_score_quiniela' | 'away_score_quiniela' | 'stage'>

interface Props {
  matchId: string
  match: Match
  allPredictions: Prediction[]
  currentUserId: string
  isFinished: boolean
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

export function RankingPreview({ matchId, match, allPredictions, currentUserId, isFinished }: Props) {
  const [ranked, setRanked] = useState<RankedPred[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function calculateRanking() {
      // Calcular puntos locales (de este partido) — UNA SOLA VEZ
      const withLocalPts = allPredictions
        .map(pred => {
          let pts = 0
          let resultType = 'FALLO'

          if (isFinished && match.home_score_quiniela != null && pred.home_score != null) {
            const result = calcResult(pred.home_score, pred.away_score!, match.home_score_quiniela, match.away_score_quiniela!)
            if (result) {
              pts = result.pts
              resultType = result.type
            }
          }

          return { pred, pts, resultType }
        })
        .sort((a, b) => b.pts - a.pts)
        .map((item, idx) => ({ ...item, rank: idx + 1 }))

      // Calcular puntos globales (solo para el usuario actual cuando termina el partido)
      let withGlobalPts = withLocalPts

      if (isFinished) {
        try {
          const supabase = createClient()

          // Traer todos los resultados de este usuario
          const { data: allResults } = await supabase
            .from('predictions')
            .select(`
              match_id,
              home_score,
              away_score,
              matches:matches (home_score_quiniela, away_score_quiniela, stage)
            `)
            .eq('user_id', currentUserId)

          // Calcular global
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

          // Agregar global solo al usuario actual
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
  }, [isFinished, match, allPredictions, currentUserId])

  if (loading || ranked.length === 0) return null

  const positions = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣']

  return (
    <div style={{
      marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {ranked.map(item => {
        const { pred, rank, pts, resultType, globalPts } = item
        const isMe = pred.user_id === currentUserId
        const name = (pred.profiles?.display_name ?? '?').split(' ')[0]
        const posEmoji = positions[rank - 1] ?? `#${rank}`
        const textColor = isFinished ? (RESULT_COLORS[resultType ?? 'FALLO']?.text ?? 'var(--text-main)') : 'var(--text-main)'

        return (
          <div
            key={pred.user_id}
            style={{
              padding: '6px 8px', borderRadius: 7,
              background: isMe ? 'rgba(0,104,71,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isMe ? 'rgba(0,104,71,0.3)' : 'rgba(255,255,255,0.08)'}`,
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
            }}
          >
            {/* Posición */}
            <span style={{ fontSize: 14, minWidth: 24 }}>{posEmoji}</span>

            {/* Nombre */}
            <span style={{
              flex: 1, color: isMe ? 'var(--mx-green)' : 'var(--text-muted)',
              fontWeight: isMe ? 600 : 400,
            }}>
              {name}
            </span>

            {/* Pronóstico */}
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {pred.home_score != null ? `${pred.home_score}–${pred.away_score}` : '—'}
            </span>

            {/* Puntos locales */}
            {isFinished && (
              <span style={{ fontSize: 13, fontWeight: 700, color: textColor, minWidth: 28, textAlign: 'right' }}>
                +{pts}
              </span>
            )}

            {/* Global (si es el usuario y terminó) */}
            {isMe && globalPts != null && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 4, borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                {globalPts} total
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
