'use client'

import { useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { TeamFlag } from '@/components/TeamFlag'

export interface TeamEntry {
  team: string
  prob: number   // 0–1, 0 = eliminado
}

interface Props {
  rank: number
  isFirst: boolean
  isLast: boolean
  isMe: boolean
  displayName: string
  avatarUrl: string | null
  totalProb: number
  eliminated: boolean
  flagships: [string, string]
  teams: TeamEntry[]
}

export function SorteoCard({
  rank, isFirst, isLast, isMe,
  displayName, avatarUrl, totalProb, eliminated,
  flagships, teams,
}: Props) {
  const [open, setOpen] = useState(false)

  const maxProb = Math.max(...teams.map(t => t.prob), 0.001)

  const rankColor = isFirst
    ? 'var(--gold)'
    : isLast
    ? 'var(--shame-red)'
    : 'var(--text-muted)'

  return (
    <div
      className={`glass-card ${isFirst ? 'rank-first' : isLast ? 'rank-last' : ''}`}
      style={{
        overflow: 'hidden',
        background: isMe
          ? 'color-mix(in srgb, var(--theme-primary) 12%, transparent)'
          : undefined,
        opacity: eliminated ? 0.55 : 1,
      }}
    >
      {/* Fila principal — clickeable para expandir */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Posición */}
        <div style={{ fontSize: 14, fontWeight: 700, minWidth: 24, color: rankColor }}>
          {rank}
        </div>

        {/* Avatar */}
        <Avatar name={displayName} avatarUrl={avatarUrl} size={40} rank={rank} />

        {/* Nombre + flagships */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isFirst && <span style={{ fontSize: 14 }}>👑</span>}
            <span style={{
              fontSize: 15,
              fontWeight: isMe ? 700 : 500,
              color: 'var(--text-main)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {displayName}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
            {flagships.map(team => (
              <TeamFlag key={team} name={team} size={14} />
            ))}
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 2 }}>
              {eliminated ? '💀 Eliminado' : 'toca para ver detalle'}
            </span>
          </div>
        </div>

        {/* % total + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{
            fontSize: 20,
            fontWeight: 800,
            color: eliminated ? 'var(--text-muted)' : rankColor !== 'var(--text-muted)' ? rankColor : 'var(--text-main)',
            textAlign: 'right',
          }}>
            {eliminated ? '0' : (totalProb * 100).toFixed(1)}
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 1 }}>%</span>
          </div>
          <span style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            display: 'inline-block',
          }}>▾</span>
        </div>
      </button>

      {/* Detalle expandible */}
      {open && (
        <div style={{
          padding: '0 14px 14px',
          borderTop: '1px solid var(--glass-border)',
        }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '10px 0 8px' }}>
            Tus 8 equipos — probabilidad individual de ganar el Mundial
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[...teams]
              .sort((a, b) => b.prob - a.prob)
              .map(({ team, prob }) => {
                const alive = prob > 0
                const barWidth = alive ? Math.round((prob / maxProb) * 100) : 0
                return (
                  <div key={team}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 3,
                      opacity: alive ? 1 : 0.45,
                    }}>
                      <TeamFlag name={team} size={16} />
                      <span style={{
                        fontSize: 13,
                        color: 'var(--text-main)',
                        flex: 1,
                        textDecoration: alive ? 'none' : 'line-through',
                      }}>
                        {team}
                      </span>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: alive ? 'var(--text-main)' : 'var(--text-muted)',
                        minWidth: 42,
                        textAlign: 'right',
                      }}>
                        {alive ? `${(prob * 100).toFixed(1)}%` : '💀'}
                      </span>
                    </div>
                    {alive && (
                      <div style={{
                        height: 4,
                        borderRadius: 2,
                        background: 'var(--glass-border)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${barWidth}%`,
                          borderRadius: 2,
                          background: 'var(--theme-primary)',
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
