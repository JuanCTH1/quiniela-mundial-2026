'use client'

import Link from 'next/link'

const STAGES = [
  { value: 'GROUP', label: 'Grupos' },
  { value: 'LAST_32', label: '32avos' },
  { value: 'ROUND_OF_16', label: 'Octavos' },
  { value: 'QUARTER_FINALS', label: 'Cuartos' },
  { value: 'SEMI_FINALS', label: 'Semis' },
  { value: 'THIRD_PLACE', label: '3er lugar' },
  { value: 'FINAL', label: 'Final' },
]

function formatDateLabel(fecha: string, timezone: string) {
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  if (fecha === today) return 'Hoy'
  if (fecha === tomorrow) return 'Mañana'
  const d = new Date(fecha + 'T12:00:00')
  return new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short', timeZone: timezone }).format(d)
}

function getDefaultDays(timezone: string) {
  const days: string[] = []
  for (let i = -1; i <= 5; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

interface Props {
  currentFecha?: string
  currentEtapa?: string
  timezone: string
  availableDates?: string[]  // dates from the selected stage
}

export function DateNav({ currentFecha, currentEtapa, timezone, availableDates }: Props) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const activeFecha = currentFecha ?? todayStr

  // Which dates to show in the date scroll
  const datesToShow = currentEtapa && availableDates?.length
    ? availableDates
    : getDefaultDays(timezone)

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    display: 'inline-block',
    background: active ? 'var(--mx-green)' : 'rgba(255,255,255,0.07)',
    color: active ? '#fff' : 'var(--text-muted)',
    border: '1px solid transparent',
    flexShrink: 0,
  })

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Stage tabs */}
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
        <Link href="/partidos" style={chipStyle(!currentEtapa)}>Hoy</Link>
        {STAGES.map(s => (
          <Link key={s.value} href={`/partidos?etapa=${s.value}`} style={chipStyle(currentEtapa === s.value)}>
            {s.label}
          </Link>
        ))}
      </div>

      {/* Date scroll */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {datesToShow.map(fecha => {
          const active = currentEtapa ? false : activeFecha === fecha
          return (
            <Link
              key={fecha}
              href={currentEtapa ? `/partidos?etapa=${currentEtapa}&fecha=${fecha}` : `/partidos?fecha=${fecha}`}
              style={{
                padding: '5px 10px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                flexShrink: 0,
                background: active ? 'rgba(0,104,71,0.3)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${active ? 'rgba(0,104,71,0.5)' : 'rgba(255,255,255,0.07)'}`,
                color: active ? 'var(--mx-green)' : 'var(--text-muted)',
              }}
            >
              {formatDateLabel(fecha, timezone)}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
