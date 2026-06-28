'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  async function fetchData() {
    if (data || loading) return
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

  function open() {
    setIsOpen(true)
    document.body.style.overflow = 'hidden'
    history.pushState({ drawerOpen: matchId }, '', location.href)
    fetchData()
  }

  function close() {
    setIsOpen(false)
    document.body.style.overflow = ''
  }

  useEffect(() => {
    function onPopState(e: PopStateEvent) {
      if (isOpen && !e.state?.drawerOpen) close()
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [isOpen])

  useEffect(() => {
    return () => { if (isOpen) document.body.style.overflow = '' }
  }, [isOpen])

  const portal = mounted ? createPortal(
    <>
      {/* Backdrop — cubre todo, bloquea interacción con el fondo */}
      <div
        onClick={close}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.35)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
      />

      {/* Bottom sheet — renderizado en document.body via portal */}
      <div
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 201,
          // 64px = sticky header aprox — evita que el sheet tape el nav de arriba
          maxHeight: 'calc(100dvh - 64px)',
          overflowY: 'auto',
          background: 'rgba(10, 15, 13, 0.97)',
          borderRadius: '20px 20px 0 0',
          borderTop: '1px solid var(--glass-border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          transform: isOpen ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
          willChange: 'transform',
          overscrollBehavior: 'contain',
        }}
      >
        {/* Header sticky */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 1,
          background: 'rgba(10, 15, 13, 0.97)',
          padding: '14px 16px 10px',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'center',
        }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text-main)',
            flex: 1, textAlign: 'center',
          }}>
            {homeTeam} · {awayTeam}
          </span>
          <button
            onClick={close}
            style={{
              position: 'absolute', right: 14,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 22, color: 'var(--text-muted)', padding: '0 4px', lineHeight: 1,
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
    </>,
    document.body
  ) : null

  return (
    <>
      <button
        onTouchStart={fetchData}
        onMouseEnter={fetchData}
        onClick={e => { e.preventDefault(); e.stopPropagation(); open() }}
        aria-label="Ver análisis del partido"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 14px', borderRadius: 20,
          background: 'color-mix(in srgb, var(--theme-primary) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--theme-primary) 28%, transparent)',
          color: 'var(--theme-primary)',
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
          letterSpacing: '0.02em',
        }}
      >
        📊 Análisis
      </button>
      {portal}
    </>
  )
}
