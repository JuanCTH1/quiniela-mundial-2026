'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function ActionButton({
  label, loadingLabel, endpoint, onResult,
}: {
  label: string
  loadingLabel: string
  endpoint: string
  onResult?: (msg: string, ok: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ msg: string; ok: boolean } | null>(null)
  const router = useRouter()

  async function run() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(endpoint, { method: 'POST' })
      const data = await res.json() as Record<string, unknown>
      const ok = !!data.ok
      const msg = (data.message as string) ?? (ok ? `${data.updated ?? '?'} actualizados` : 'Error')
      setResult({ msg, ok })
      if (ok) router.refresh()
      onResult?.(msg, ok)
    } catch {
      setResult({ msg: 'Error de red', ok: false })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <button
        onClick={run}
        disabled={loading}
        style={{
          padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.06)', color: 'var(--text-main)',
          fontSize: 12, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? loadingLabel : label}
      </button>
      {result && (
        <span style={{ fontSize: 11, color: result.ok ? '#34A853' : 'var(--mx-red)' }}>
          {result.msg}
        </span>
      )}
    </div>
  )
}

export function AdminTools() {
  return (
    <div className="glass-card" style={{ padding: '14px 16px', marginTop: 12 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 10px', color: 'var(--text-muted)' }}>
        Herramientas de datos
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ActionButton
          label="🔄 Backfill scores jornada 1"
          loadingLabel="Buscando en API..."
          endpoint="/api/admin/backfill-scores"
        />
        <ActionButton
          label="🔍 Buscar árbitros (7 días)"
          loadingLabel="Buscando árbitros..."
          endpoint="/api/admin/sync-referees-web"
        />
      </div>
    </div>
  )
}
