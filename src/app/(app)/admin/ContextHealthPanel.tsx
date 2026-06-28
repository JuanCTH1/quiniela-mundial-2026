'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { adminApproveFact, adminRejectFact, adminApproveAllFacts } from '@/app/actions/admin'

export interface MatchHealth {
  id: string
  home_team: string
  away_team: string
  scheduled_time: string
  stage: string
  group_name: string | null
  has_venue: boolean
  has_odds: boolean
  has_referee: boolean
  has_home_coach: boolean
  has_away_coach: boolean
  has_home_age: boolean
  has_away_age: boolean
  facts: {
    id: string
    category: string
    body: string
    position: number
    reviewed: boolean
  }[]
}

const CATEGORY_LABEL: Record<string, string> = {
  historico: 'Hist.',
  jugador: 'Jugador',
  narrativo: 'Narr.',
}

const STAGE_SHORT: Record<string, string> = {
  GROUP: 'Grupo', GROUP_STAGE: 'Grupo',
  LAST_32: 'R32', ROUND_OF_16: 'R16', LAST_16: 'R16',
  QUARTER_FINALS: 'QF', SEMI_FINALS: 'SF', THIRD_PLACE: '3°', FINAL: 'Final',
}

function Chip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 6px', borderRadius: 6, fontSize: 10, fontWeight: 600,
      background: ok ? 'rgba(52,168,83,0.15)' : 'rgba(206,17,38,0.15)',
      color: ok ? '#34A853' : 'var(--mx-red)',
      border: `1px solid ${ok ? 'rgba(52,168,83,0.3)' : 'rgba(206,17,38,0.3)'}`,
      whiteSpace: 'nowrap',
    }}>
      {ok ? '✓' : '✗'} {label}
    </span>
  )
}

function FactRow({ fact, onApprove, onReject, loading }: {
  fact: MatchHealth['facts'][number]
  onApprove: () => void
  onReject: () => void
  loading: boolean
}) {
  return (
    <div style={{
      borderRadius: 8,
      padding: '10px 12px',
      marginBottom: 8,
      background: fact.reviewed ? 'rgba(52,168,83,0.08)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${fact.reviewed ? 'rgba(52,168,83,0.25)' : 'rgba(255,255,255,0.08)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
          background: 'rgba(255,255,255,0.07)', color: 'var(--text-muted)',
          textTransform: 'uppercase',
        }}>
          {CATEGORY_LABEL[fact.category] ?? fact.category}
        </span>
        {fact.reviewed && (
          <span style={{ fontSize: 9, color: '#34A853', fontWeight: 700 }}>✓ APROBADO</span>
        )}
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-main)', lineHeight: 1.5, margin: '0 0 8px' }}>
        {fact.body}
      </p>
      {!fact.reviewed && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onApprove}
            disabled={loading}
            style={{
              padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700,
              background: 'rgba(52,168,83,0.2)', color: '#34A853',
              opacity: loading ? 0.5 : 1,
            }}
          >
            ✓ Aprobar
          </button>
          <button
            onClick={onReject}
            disabled={loading}
            style={{
              padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700,
              background: 'rgba(206,17,38,0.15)', color: 'var(--mx-red)',
              opacity: loading ? 0.5 : 1,
            }}
          >
            ✗ Rechazar
          </button>
        </div>
      )}
    </div>
  )
}

function MatchRow({ match }: { match: MatchHealth }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const factsTotal = match.facts.length
  const factsReviewed = match.facts.filter(f => f.reviewed).length
  const hasMissingFacts = factsTotal === 0
  const allApproved = factsTotal > 0 && factsReviewed === factsTotal
  const hasBreak = !match.has_venue || !match.has_odds || !match.has_home_coach ||
    !match.has_away_coach || hasMissingFacts

  const matchDate = new Date(match.scheduled_time).toLocaleDateString('es-MX', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  })

  function doApprove(factId: string) {
    startTransition(async () => {
      await adminApproveFact(factId)
      router.refresh()
    })
  }

  function doReject(factId: string) {
    startTransition(async () => {
      await adminRejectFact(factId)
      router.refresh()
    })
  }

  function doApproveAll() {
    startTransition(async () => {
      await adminApproveAllFacts(match.id)
      router.refresh()
    })
  }

  const pendingFacts = match.facts.filter(f => !f.reviewed)

  return (
    <div style={{
      borderRadius: 10,
      marginBottom: 8,
      border: `1px solid ${hasBreak ? 'rgba(206,17,38,0.25)' : 'rgba(255,255,255,0.07)'}`,
      background: hasBreak ? 'rgba(206,17,38,0.04)' : 'rgba(255,255,255,0.02)',
      overflow: 'hidden',
    }}>
      {/* Cabecera — siempre visible */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'transparent', border: 'none',
          cursor: 'pointer', padding: '10px 12px', textAlign: 'left',
        }}
      >
        {/* Fila 1: partido + fecha */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
            {match.home_team} vs {match.away_team}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {STAGE_SHORT[match.stage] ?? match.stage}
            {match.group_name && ` ${match.group_name.replace(/^GROUP_?/, 'G')}`}
            {' · '}{matchDate}
            <span style={{ fontSize: 11, transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>▾</span>
          </span>
        </div>
        {/* Fila 2: chips de salud */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Chip ok={match.has_venue}      label="Sede" />
          <Chip ok={match.has_odds}       label="Momios" />
          <Chip ok={match.has_referee}    label="Árbitro" />
          <Chip ok={match.has_home_coach && match.has_away_coach} label="DTs" />
          <Chip ok={match.has_home_age && match.has_away_age}     label="Edad" />
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 6px', borderRadius: 6, fontSize: 10, fontWeight: 600,
            background: hasMissingFacts
              ? 'rgba(206,17,38,0.15)'
              : allApproved
                ? 'rgba(52,168,83,0.15)'
                : 'rgba(255,193,7,0.15)',
            color: hasMissingFacts
              ? 'var(--mx-red)'
              : allApproved ? '#34A853' : 'var(--gold)',
            border: `1px solid ${hasMissingFacts ? 'rgba(206,17,38,0.3)' : allApproved ? 'rgba(52,168,83,0.3)' : 'rgba(255,193,7,0.3)'}`,
            whiteSpace: 'nowrap',
          }}>
            💡 {factsReviewed}/{factsTotal}
          </span>
        </div>
      </button>

      {/* Detalle expandido */}
      {open && (
        <div style={{ padding: '4px 12px 12px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Facts */}
          {match.facts.length === 0 ? (
            <p style={{ fontSize: 11, color: 'var(--mx-red)', margin: '10px 0 0' }}>
              ✗ Sin facts generados
            </p>
          ) : (
            <>
              {pendingFacts.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '8px 0 4px' }}>
                  <button
                    onClick={doApproveAll}
                    disabled={isPending}
                    style={{
                      padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 700,
                      background: 'rgba(52,168,83,0.25)', color: '#34A853',
                      opacity: isPending ? 0.5 : 1,
                    }}
                  >
                    ✓ Aprobar todos
                  </button>
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                {match.facts.map(f => (
                  <FactRow
                    key={f.id}
                    fact={f}
                    onApprove={() => doApprove(f.id)}
                    onReject={() => doReject(f.id)}
                    loading={isPending}
                  />
                ))}
              </div>
            </>
          )}

          {/* Campos faltantes */}
          {(!match.has_venue || !match.has_odds || !match.has_referee ||
            !match.has_home_coach || !match.has_away_coach ||
            !match.has_home_age || !match.has_away_age) && (
            <div style={{
              marginTop: 8, padding: '8px 10px', borderRadius: 8,
              background: 'rgba(255,193,7,0.08)', border: '1px solid rgba(255,193,7,0.2)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>
                Datos faltantes:
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {!match.has_venue      && <span>• Sede no asignada</span>}
                {!match.has_odds       && <span>• Momios no disponibles</span>}
                {!match.has_referee    && <span>• Árbitro sin asignar (puede llegar más tarde)</span>}
                {!match.has_home_coach && <span>• DT de {match.home_team} faltante</span>}
                {!match.has_away_coach && <span>• DT de {match.away_team} faltante</span>}
                {!match.has_home_age   && <span>• Edad promedio de {match.home_team} faltante</span>}
                {!match.has_away_age   && <span>• Edad promedio de {match.away_team} faltante</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export interface HealthAlert { level: 'red' | 'yellow'; message: string }

function SyncRefereesButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  async function handleSync() {
    setState('loading')
    try {
      const res = await fetch('/api/admin/sync-referees-web', { method: 'POST' })
      const data = await res.json() as { ok: boolean; updated?: number; total?: number; message?: string }
      if (data.ok) {
        setResult(data.message ?? `${data.updated}/${data.total} árbitros encontrados`)
        setState('done')
        router.refresh()
      } else {
        setState('error')
        setResult('Error en la búsqueda')
      }
    } catch {
      setState('error')
      setResult('Error de red')
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <button
        onClick={handleSync}
        disabled={state === 'loading'}
        style={{
          padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,193,7,0.35)',
          background: 'rgba(255,193,7,0.10)', color: 'var(--gold)',
          fontSize: 11, fontWeight: 700, cursor: state === 'loading' ? 'wait' : 'pointer',
          opacity: state === 'loading' ? 0.6 : 1,
        }}
      >
        {state === 'loading' ? '🔍 Buscando...' : '🔍 Buscar árbitros'}
      </button>
      {result && (
        <span style={{ fontSize: 11, color: state === 'error' ? 'var(--mx-red)' : '#34A853' }}>
          {result}
        </span>
      )}
    </div>
  )
}

export function ContextHealthPanel({ matches, alerts = [] }: { matches: MatchHealth[]; alerts?: HealthAlert[] }) {
  const withBreaks = matches.filter(m =>
    !m.has_venue || !m.has_odds || !m.has_home_coach || !m.has_away_coach ||
    m.facts.length === 0 || m.facts.some(f => !f.reviewed)
  )
  const healthy = matches.filter(m =>
    m.has_venue && m.has_odds && m.has_home_coach && m.has_away_coach &&
    m.facts.length > 0 && m.facts.every(f => f.reviewed)
  )

  return (
    <div className="glass-card" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Contexto del partido</h2>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {healthy.length}/{matches.length} ok
        </span>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 10px' }}>
        Salud de datos y aprobación de facts para partidos próximos.
      </p>

      {alerts.length > 0 && (
        <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: a.level === 'red' ? 'rgba(206,17,38,0.12)' : 'rgba(255,193,7,0.10)',
              border: `1px solid ${a.level === 'red' ? 'rgba(206,17,38,0.35)' : 'rgba(255,193,7,0.35)'}`,
              color: a.level === 'red' ? 'var(--mx-red)' : 'var(--gold)',
              lineHeight: 1.4,
            }}>
              {a.level === 'red' ? '🔴' : '🟡'} {a.message}
            </div>
          ))}
          {alerts.some(a => a.message.includes('árbitro')) && (
            <SyncRefereesButton />
          )}
        </div>
      )}


      {matches.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No hay partidos SCHEDULED con equipos definidos.</p>
      )}

      {/* Primero los que tienen quiebres */}
      {withBreaks.map(m => <MatchRow key={m.id} match={m} />)}

      {/* Luego los sanos, colapsados por defecto */}
      {healthy.length > 0 && (
        <>
          {withBreaks.length > 0 && (
            <div style={{ height: 1, background: 'rgba(52,168,83,0.2)', margin: '8px 0', borderRadius: 1 }} />
          )}
          {healthy.map(m => <MatchRow key={m.id} match={m} />)}
        </>
      )}
    </div>
  )
}
