'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { localTodayStr } from '@/lib/utils'

const STAGES = [
  { value: 'GROUP', label: 'Grupos' },
  { value: 'LAST_32', label: 'R. de 32' },
  { value: 'ROUND_OF_16', label: 'R. de 16' },
  { value: 'QUARTER_FINALS', label: 'Cuartos' },
  { value: 'SEMI_FINALS', label: 'Semis' },
  { value: 'THIRD_PLACE', label: '3er lugar' },
  { value: 'FINAL', label: 'Final' },
]

function formatDateLabel(fecha: string, timezone: string) {
  const now = new Date()
  const today = localTodayStr(timezone)
  const tomorrow = new Intl.DateTimeFormat('sv', { timeZone: timezone }).format(new Date(now.getTime() + 86400000))
  if (fecha === today) return 'Hoy'
  if (fecha === tomorrow) return 'Mañana'
  const d = new Date(fecha + 'T12:00:00Z')
  return new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short', timeZone: timezone }).format(d)
}

function getDefaultDays(timezone: string) {
  const today = localTodayStr(timezone)
  const todayMs = new Date(today + 'T12:00:00Z').getTime()
  const days: string[] = []
  for (let i = -1; i <= 5; i++) {
    const d = new Date(todayMs + i * 86400000)
    days.push(new Intl.DateTimeFormat('sv', { timeZone: timezone }).format(d))
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
  const todayStr = localTodayStr(timezone)
  const activeFecha = currentFecha ?? todayStr
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Solo scrollea si ya estamos en /partidos sin params (Hoy puro).
  // Si venimos de ?fecha=X o ?etapa=Y, SwipeNav lo maneja y evita el doble scroll.
  function handleTodayClick() {
    const alreadyOnToday = pathname === '/partidos' && !searchParams.has('etapa') && !searchParams.has('fecha')
    if (!alreadyOnToday) return
    setTimeout(() => {
      document.getElementById('next-match')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  const datesToShow = currentEtapa && availableDates?.length
    ? availableDates
    : getDefaultDays(timezone)

  const glassChip = (active: boolean): React.CSSProperties => ({
    padding: '5px 13px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    display: 'inline-block',
    flexShrink: 0,
    background: active
      ? 'var(--primary)'
      : 'rgba(255,255,255,0.07)',
    border: active
      ? '1px solid color-mix(in srgb, var(--primary) 60%, transparent)'
      : '1px solid rgba(255,255,255,0.10)',
    borderTop: active
      ? '1px solid color-mix(in srgb, var(--primary) 60%, transparent)'
      : '1px solid rgba(255,255,255,0.20)',
    color: active ? '#fff' : 'var(--text-muted)',
    boxShadow: active
      ? '0 2px 12px color-mix(in srgb, var(--primary) 25%, transparent), inset 0 1px 0 rgba(255,255,255,0.15)'
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
    background: active
      ? 'color-mix(in srgb, var(--primary) 22%, transparent)'
      : 'rgba(255,255,255,0.05)',
    border: active
      ? '1px solid color-mix(in srgb, var(--primary) 50%, transparent)'
      : '1px solid rgba(255,255,255,0.08)',
    borderTop: active
      ? '1px solid color-mix(in srgb, var(--primary) 50%, transparent)'
      : '1px solid rgba(255,255,255,0.15)',
    color: active ? 'var(--primary)' : 'var(--text-muted)',
    boxShadow: active
      ? 'inset 0 1px 0 rgba(255,255,255,0.10)'
      : 'inset 0 1px 0 rgba(255,255,255,0.04)',
  })

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Stage tabs */}
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
        <Link href="/partidos" onClick={handleTodayClick} style={glassChip(!currentEtapa)}>Hoy</Link>
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
              onClick={undefined}
            >
              {formatDateLabel(fecha, timezone)}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
