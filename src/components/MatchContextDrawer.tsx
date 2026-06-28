'use client'

import { useEffect, useRef, useState } from 'react'
import { MatchContext, type MatchContextData } from './MatchContext'

interface Props {
  matchId: string
  homeTeam: string
  awayTeam: string
}

export function MatchContextButton({ matchId, homeTeam, awayTeam }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<MatchContextData | null>(null)
  const [loading, setLoading] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  async function open() {
    setIsOpen(true)
    document.body.style.overflow = 'hidden'
    // Push hash so browser back closes the drawer
    history.pushState({ drawerOpen: matchId }, '', location.href)
    if (!data) {
      setLoading(true)
      try {
        const res = await fetch(`/api/match-context/${matchId}`)
        const json = await res.json() as MatchContextData | null
        setData(json ?? { homeTeam, awayTeam })
      } catch {
        setData({ homeTeam, awayTeam })
      } finally {
        setLoading(false)
      }
    }
  }

  function close() {
    setIsOpen(false)
    document.body.style.overflow = ''
  }

  // Cerrar con browser back
  useEffect(() => {
    function onPopState(e: PopStateEvent) {
      if (isOpen && !e.state?.drawerOpen) close()
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [isOpen])

  // Limpiar overflow si el componente se desmonta con el drawer abierto
  useEffect(() => {
    return () => { if (isOpen) document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <>
      {/* Botón ⓘ en la tarjeta */}
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); open() }}
        aria-label="Contexto del partido"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '2px 4px', borderRadius: 6,
          fontSize: 15, color: 'var(--text-muted)', lineHeight: 1,
        }}
      >
        ⓘ
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Bottom sheet */}
      <div
        ref={drawerRef}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 201,
          maxHeight: '80dvh', overflowY: 'auto',
          background: 'var(--bg-card)',
          borderRadius: '20px 20px 0 0',
          borderTop: '1px solid var(--glass-border)',
          padding: '0 0 env(safe-area-inset-bottom)',
          transform: isOpen ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
          willChange: 'transform',
          overscrollBehavior: 'contain',
        }}
      >
        {/* Handle bar + header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 1,
          background: 'var(--bg-card)',
          padding: '12px 16px 10px',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)', margin: '0 auto' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            {homeTeam} vs {awayTeam}
          </span>
          <button
            onClick={close}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 20, color: 'var(--text-muted)', padding: '0 4px', lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '12px 16px' }}>
          {loading && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '32px 0' }}>
              Cargando contexto…
            </div>
          )}
          {!loading && data && <MatchContext data={data} defaultOpen />}
          {!loading && data && !data.form && !data.h2h && !data.odds && !data.referee && !data.coaches && !data.facts?.length && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '32px 0' }}>
              Sin contexto disponible aún
            </div>
          )}
        </div>
      </div>
    </>
  )
}
