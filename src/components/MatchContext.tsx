'use client'

import { useState } from 'react'
import { TeamFlag } from './TeamFlag'

// ── Tipos ──────────────────────────────────────────────────────────────────
export type FormResult = 'W' | 'D' | 'L'

export interface MatchContextData {
  homeTeam: string
  awayTeam: string
  // Cada bloque es opcional: si falta, no se renderiza (degradación elegante)
  stakes?: string | null
  form?: { home: FormResult[]; away: FormResult[] } | null
  h2h?: { homeWins: number; draws: number; awayWins: number } | null
  odds?: { home: number; draw: number; away: number } | null // probabilidades 0–1
  referee?: { name: string; country?: string | null; flag?: string | null } | null
  coaches?: { home: string | null; away: string | null } | null
  physical?: { homeHeight: number | null; awayHeight: number | null; homeAge: number | null; awayAge: number | null } | null
  keyPlayers?: { home?: { name: string; stat: string } | null; away?: { name: string; stat: string } | null } | null
  venue?: {
    name: string; city: string; country: string
    capacity: number | null; surface: string | null; openedYear: number | null
    imageUrl: string | null; lat: number; lng: number
  } | null
  facts?: { category: string; body: string }[] | null
}

// ── Helpers visuales ─────────────────────────────────────────────────────────
const FORM_COLORS: Record<FormResult, { bg: string; text: string; label: string }> = {
  W: { bg: 'rgba(52,168,83,0.20)',  text: '#34A853', label: 'G' },
  D: { bg: 'rgba(255,255,255,0.10)', text: 'var(--text-muted)', label: 'E' },
  L: { bg: 'rgba(206,17,38,0.18)',  text: 'var(--mx-red)', label: 'P' },
}

const COUNTRY_FLAG: Record<string, string> = { MEX: '🇲🇽', USA: '🇺🇸', CAN: '🇨🇦' }

// Banderas emoji no renderizan en Chrome/Windows: convertir a imagen Twemoji
// (mismo enfoque que <TeamFlag>) para que se vean en todos los dispositivos.
function flagUrl(emoji: string): string {
  const cp = [...emoji]
    .map(c => c.codePointAt(0)!.toString(16))
    .filter(x => parseInt(x, 16) !== 0xfe0f)
    .join('-')
  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${cp}.svg`
}

function FlagImg({ emoji, size = 14 }: { emoji: string; size?: number }) {
  return <img src={flagUrl(emoji)} alt="" width={size} height={size} style={{ verticalAlign: 'middle', objectFit: 'contain' }} />
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8, marginTop: 4 }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '12px 0' }} />
}

function FormDots({ results }: { results: FormResult[] }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {results.map((r, i) => {
        const c = FORM_COLORS[r]
        return (
          <div key={i} style={{ width: 22, height: 22, borderRadius: '50%', background: c.bg, color: c.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>
            {c.label}
          </div>
        )
      })}
    </div>
  )
}

// ── Componente ───────────────────────────────────────────────────────────────
export function MatchContext({ data, defaultOpen = false }: { data: MatchContextData; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)

  const { homeTeam, awayTeam } = data

  // Si no hay absolutamente nada que mostrar, no renderizar el toggle
  const hasAnything =
    data.form || data.h2h || data.odds || data.referee ||
    data.coaches || data.physical || data.keyPlayers || data.venue ||
    (data.facts && data.facts.length > 0)
  if (!hasAnything) return null

  return (
    <div className="glass-card" style={{ padding: 0, marginBottom: 14, overflow: 'hidden' }}>
      {/* Toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-main)', font: 'inherit',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
          <span style={{ fontSize: 15 }}>ⓘ</span> Contexto del partido
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </button>

      {open && (
        <div style={{ padding: '4px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Momios */}
          {data.odds && (
            <>
              <Label>Momios (casas de apuestas)</Label>
              <div style={{ display: 'flex', gap: 6 }}>
                {([
                  { k: 'home', pct: data.odds.home, label: homeTeam },
                  { k: 'draw', pct: data.odds.draw, label: 'Empate' },
                  { k: 'away', pct: data.odds.away, label: awayTeam },
                ] as const).map(o => (
                  <div key={o.k} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>{Math.round(o.pct * 100)}%</div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.label}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Forma reciente */}
          {data.form && (
            <>
              <Label>Resultados en el torneo</Label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{homeTeam}</div>
                  <FormDots results={data.form.home} />
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', height: 40 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{awayTeam}</div>
                  <FormDots results={data.form.away} />
                </div>
              </div>
            </>
          )}

          {/* H2H */}
          {data.h2h && (
            <>
              <Label>Historial en Mundiales</Label>
              <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
                {([
                  { n: data.h2h.homeWins, label: homeTeam, color: 'var(--primary)' },
                  { n: data.h2h.draws, label: 'Empates', color: 'var(--text-muted)' },
                  { n: data.h2h.awayWins, label: awayTeam, color: 'var(--mx-red)' },
                ] as const).map((b, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: b.color }}>{b.n}</div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.label}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {(data.referee || data.coaches) && <Divider />}

          {/* Árbitro */}
          {data.referee && (
            <>
              <Label>Árbitro</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 4 }}>
                <span style={{ fontSize: 16 }}>🟨</span>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)' }}>{data.referee.name}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {data.referee.flag && <FlagImg emoji={data.referee.flag} size={12} />}
                    {data.referee.country}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* DTs */}
          {data.coaches && (data.coaches.home || data.coaches.away) && (
            <>
              <Label>Entrenadores</Label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4 }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)' }}>{data.coaches.home ?? '—'}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{homeTeam}</div>
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>vs</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)' }}>{data.coaches.away ?? '—'}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{awayTeam}</div>
                </div>
              </div>
            </>
          )}

          {/* Comparativas físicas */}
          {data.physical && (
            <>
              <Label>Comparativas</Label>
              <CompareBar
                label="Altura promedio" unit="cm"
                a={data.physical.homeHeight} b={data.physical.awayHeight}
              />
              <CompareBar
                label="Edad promedio" unit="años"
                a={data.physical.homeAge} b={data.physical.awayAge}
              />
            </>
          )}

          {/* Jugadores clave */}
          {data.keyPlayers && (data.keyPlayers.home || data.keyPlayers.away) && (
            <>
              <Label>A quién seguir</Label>
              <div style={{ display: 'flex', gap: 8 }}>
                {data.keyPlayers.home && <PlayerCard team={homeTeam} player={data.keyPlayers.home} />}
                {data.keyPlayers.away && <PlayerCard team={awayTeam} player={data.keyPlayers.away} />}
              </div>
            </>
          )}

          {/* Sede */}
          {data.venue && (
            <>
              <Divider />
              <Label>Sede</Label>
              <VenueImage url={data.venue.imageUrl} name={data.venue.name} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{data.venue.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {COUNTRY_FLAG[data.venue.country] && <FlagImg emoji={COUNTRY_FLAG[data.venue.country]} size={12} />}
                    {data.venue.city}
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${data.venue.lat},${data.venue.lng}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', padding: '4px 10px', border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)', borderRadius: 8 }}
                >
                  📍 Ver en mapa
                </a>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {data.venue.openedYear && <VenueStat value={String(data.venue.openedYear)} label="Inaugurado" />}
                {data.venue.surface && <VenueStat value={data.venue.surface.split(' ')[0]} label="Superficie" />}
                {data.venue.capacity && <VenueStat value={data.venue.capacity.toLocaleString('es-MX')} label="Capacidad" />}
              </div>
            </>
          )}

          {/* Datos curiosos (solo aprobados — la RLS ya filtra reviewed=true) */}
          {data.facts && data.facts.length > 0 && (
            <>
              <Divider />
              {data.facts.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '9px 12px', marginBottom: i < data.facts!.length - 1 ? 8 : 0 }}>
                  <span style={{ fontSize: 15, flexShrink: 0 }}>💡</span>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {f.body
                      .replace(/<cite[^>]*>[\s\S]*?<\/cite>/g, '')
                      .replace(/<cite[^>]*/g, '')
                      .replace(/^\s*[.,;]\s*/, '')
                      .trim()}
                  </div>
                </div>
              ))}
            </>
          )}

        </div>
      )}
    </div>
  )
}

// ── Subcomponentes ───────────────────────────────────────────────────────────
function CompareBar({ label, unit, a, b }: { label: string; unit: string; a: number | null; b: number | null }) {
  if (a == null || b == null) return null
  const total = a + b
  const aPct = total > 0 ? (a / total) * 100 : 50
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)', minWidth: 56 }}>{a} {unit}</span>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>{label}</div>
        <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
          <div style={{ width: `${aPct}%`, background: 'var(--primary)' }} />
          <div style={{ width: `${100 - aPct}%`, background: 'var(--warning)' }} />
        </div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)', minWidth: 56, textAlign: 'right' }}>{b} {unit}</span>
    </div>
  )
}

function PlayerCard({ team, player }: { team: string; player: { name: string; stat: string } }) {
  return (
    <div style={{ flex: 1, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
        <TeamFlag name={team} size={12} /> {team}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)' }}>{player.name}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{player.stat}</div>
    </div>
  )
}

// Imagen del estadio con fallback: si no hay URL o falla la carga, muestra el
// placeholder en vez del ícono de "imagen rota".
function VenueImage({ url, name }: { url: string | null; name: string }) {
  const [failed, setFailed] = useState(false)
  if (!url || failed) {
    return (
      <div style={{ width: '100%', height: 90, borderRadius: 8, marginBottom: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
        <span style={{ fontSize: 14 }}>📍</span> {name}
      </div>
    )
  }
  return (
    <img
      src={url}
      alt={name}
      onError={() => setFailed(true)}
      style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 10, display: 'block', background: 'rgba(255,255,255,0.04)' }}
    />
  )
}

function VenueStat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-main)' }}>{value}</div>
      <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 1 }}>{label}</div>
    </div>
  )
}
