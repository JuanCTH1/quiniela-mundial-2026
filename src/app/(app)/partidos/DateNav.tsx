'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const STAGES = [
  { value: 'GROUP', label: 'Grupos' },
  { value: 'LAST_32', label: '32avos' },
  { value: 'ROUND_OF_16', label: 'Octavos' },
  { value: 'QUARTER_FINALS', label: 'Cuartos' },
  { value: 'SEMI_FINALS', label: 'Semis' },
  { value: 'THIRD_PLACE', label: '3er lugar' },
  { value: 'FINAL', label: 'Final' },
]

function getDays(timezone: string) {
  const days: { label: string; fecha: string }[] = []
  const today = new Date()
  for (let i = -1; i <= 5; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const fecha = d.toISOString().slice(0, 10)
    const label = i === 0 ? 'Hoy' :
      i === 1 ? 'Mañana' :
      new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', timeZone: timezone }).format(d)
    days.push({ label, fecha })
  }
  return days
}

interface Props {
  currentFecha?: string
  currentEtapa?: string
  timezone: string
}

export function DateNav({ currentFecha, currentEtapa, timezone }: Props) {
  const days = getDays(timezone)
  const todayStr = new Date().toISOString().slice(0, 10)
  const activeFecha = currentFecha ?? todayStr

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Stage tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
        <Link
          href="/partidos"
          style={{
            padding: '5px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            textDecoration: 'none',
            background: !currentEtapa ? 'var(--mx-green)' : 'rgba(255,255,255,0.07)',
            color: !currentEtapa ? '#fff' : 'var(--text-muted)',
            border: '1px solid transparent',
          }}
        >
          Hoy
        </Link>
        {STAGES.map(s => (
          <Link
            key={s.value}
            href={`/partidos?etapa=${s.value}`}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              textDecoration: 'none',
              background: currentEtapa === s.value ? 'var(--mx-green)' : 'rgba(255,255,255,0.07)',
              color: currentEtapa === s.value ? '#fff' : 'var(--text-muted)',
              border: '1px solid transparent',
            }}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Date scroll (only visible when no stage filter) */}
      {!currentEtapa && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {days.map(({ label, fecha }) => (
            <Link
              key={fecha}
              href={`/partidos?fecha=${fecha}`}
              style={{
                padding: '6px 12px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                background: activeFecha === fecha ? 'rgba(0,104,71,0.3)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${activeFecha === fecha ? 'rgba(0,104,71,0.5)' : 'rgba(255,255,255,0.08)'}`,
                color: activeFecha === fecha ? 'var(--mx-green)' : 'var(--text-muted)',
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
