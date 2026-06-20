'use client'

import Link from 'next/link'

const STAGES = [
  { value: 'GROUP', label: 'Grupos' },
  { value: 'LAST_32', label: '32avos' },
  { value: 'ROUND_OF_16', label: '16avos' },
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

function getDefaultDays() {
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
  availableDates?: string[]
}

export function DateNav({ currentFecha, currentEtapa, timezone, availableDates }: Props) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const activeFecha = currentFecha ?? todayStr

  const datesToShow = currentEtapa && availableDates?.length
    ? availableDates
    : getDefaultDays()

  const glassChip = (active: boolean): React.CSSProperties => ({
    padding: '5px 13px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    display: 'inline-block',
    flexShrink: 0,
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    background: active
      ? 'var(--mx-green)'
      : 'rgba(255,255,255,0.07)',
    border: active
      ? '1px solid rgba(0,104,71,0.6)'
      : '1px solid rgba(255,255,255,0.10)',
    borderTop: active
      ? '1px solid rgba(0,104,71,0.6)'
      : '1px solid rgba(255,255,255,0.20)',
    color: active ? '#fff' : 'var(--text-muted)',
    boxShadow: active
      ? '0 2px 12px rgba(0,104,71,0.25), inset 0 1px 0 rgba(255,255,255,0.15)'
      : 'inset 0 1px 0 rgba(255,255,255,0.06)',
  })

  const glassDateChip = (active: boolean): React.CSSProperties => ({
    padding: '5px 10px',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    flexShrink: 0,
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    background: active
      ? 'rgba(0,104,71,0.25)'
      : 'rgba(255,255,255,0.05)',
    border: active
      ? '1px solid rgba(0,104,71,0.5)'
      : '1px solid rgba(255,255,255,0.08)',
    borderTop: active
      ? '1px solid rgba(0,104,71,0.5)'
      : '1px solid rgba(255,255,255,0.15)',
    color: active ? 'var(--mx-green)' : 'var(--text-muted)',
    boxShadow: active
      ? 'inset 0 1px 0 rgba(255,255,255,0.10)'
      : 'inset 0 1px 0 rgba(255,255,255,0.04)',
  })

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Stage tabs */}
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
        <Link href="/partidos" style={glassChip(!currentEtapa)}>Hoy</Link>
        {STAGES.map(s => (
          <Link key={s.value} href={`/partidos?etapa=${s.value}`} style={glassChip(currentEtapa === s.value)}>
            {s.label}
          </Link>
        ))}
      </div>

      {/* Date scroll */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {datesToShow.map(fecha => {
          const active = !currentEtapa && activeFecha === fecha
          return (
            <Link
              key={fecha}
              href={currentEtapa ? `/partidos?etapa=${currentEtapa}&fecha=${fecha}` : `/partidos?fecha=${fecha}`}
              style={glassDateChip(active)}
            >
              {formatDateLabel(fecha, timezone)}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
