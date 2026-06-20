'use client'

import { useState, useTransition } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

interface User {
  id: string
  display_name: string | null
  is_admin: boolean | null
}

interface Log {
  id: string
  message: string
  is_error: boolean | null
  created_at: string
}

interface Props {
  appMode: string
  bloqueoMinutos: string
  users: User[]
  logs: Log[]
}

function getSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function upsertSetting(key: string, value: string) {
  const sb = getSupabase()
  await sb.from('settings').upsert({ key, value }, { onConflict: 'key' })
}

export function AdminActions({ appMode, bloqueoMinutos, users, logs }: Props) {
  const [mode, setMode] = useState(appMode)
  const [bloqueo, setBloqueo] = useState(bloqueoMinutos)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [confirmReal, setConfirmReal] = useState(false)

  function saveBloqueo() {
    startTransition(async () => {
      await upsertSetting('bloqueo_minutos', bloqueo)
    })
  }

  function activateRealMode() {
    if (!confirmReal) { setConfirmReal(true); return }
    startTransition(async () => {
      await upsertSetting('app_mode', 'real')
      setMode('real')
      setConfirmReal(false)
    })
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteStatus('Enviando...')
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail }),
    })
    if (res.ok) {
      setInviteStatus(`✓ Invitación enviada a ${inviteEmail}`)
      setInviteEmail('')
    } else {
      const d = await res.json()
      setInviteStatus(`Error: ${d.error ?? 'desconocido'}`)
    }
  }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '9px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    color: 'var(--text-main)',
    fontSize: 14,
    outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* App mode */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Modo de la app</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            padding: '4px 12px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
            background: mode === 'real' ? 'rgba(0,104,71,0.2)' : 'rgba(212,175,55,0.15)',
            color: mode === 'real' ? 'var(--mx-green)' : 'var(--gold)',
            border: `1px solid ${mode === 'real' ? 'rgba(0,104,71,0.4)' : 'rgba(212,175,55,0.3)'}`,
          }}>
            {mode === 'real' ? '🟢 Modo real' : '⚗️ Modo prueba'}
          </span>
          {mode === 'test' && (
            <button
              onClick={activateRealMode}
              disabled={isPending}
              style={{
                padding: '6px 12px',
                background: confirmReal ? 'var(--mx-red)' : 'rgba(206,17,38,0.15)',
                border: '1px solid rgba(206,17,38,0.4)',
                borderRadius: 8,
                color: confirmReal ? '#fff' : 'var(--mx-red)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {confirmReal ? '⚠️ Confirmar — es irreversible' : 'Activar modo real'}
            </button>
          )}
        </div>
        {confirmReal && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Esto borra datos de prueba y activa el torneo. No hay vuelta atrás.
          </p>
        )}
      </div>

      {/* Bloqueo */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Minutos de bloqueo</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="number"
            min="0"
            max="120"
            value={bloqueo}
            onChange={e => setBloqueo(e.target.value)}
            style={{ ...inputStyle, width: 70, flex: 'none' }}
          />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>min antes del kickoff</span>
          <button
            onClick={saveBloqueo}
            disabled={isPending}
            style={{ padding: '8px 14px', background: 'var(--mx-green)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer' }}
          >
            Guardar
          </button>
        </div>
      </div>

      {/* Invite */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Invitar jugador</h2>
        <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8 }}>
          <input
            type="email"
            placeholder="correo@ejemplo.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <button
            type="submit"
            style={{ padding: '8px 14px', background: 'var(--mx-green)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Invitar
          </button>
        </form>
        {inviteStatus && (
          <p style={{ fontSize: 12, color: inviteStatus.startsWith('Error') ? 'var(--mx-red)' : 'var(--mx-green)', marginTop: 8 }}>
            {inviteStatus}
          </p>
        )}
      </div>

      {/* Users */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Jugadores ({users.length})</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {users.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ flex: 1, color: 'var(--text-main)' }}>{u.display_name ?? '—'}</span>
              {u.is_admin && <span style={{ fontSize: 10, color: 'var(--gold)' }}>admin</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Logs recientes</h2>
        <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {logs.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin registros</p>
          )}
          {logs.map(log => (
            <div key={log.id} style={{
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 11,
              background: log.is_error ? 'rgba(206,17,38,0.1)' : 'rgba(255,255,255,0.04)',
              borderLeft: `2px solid ${log.is_error ? 'var(--mx-red)' : 'rgba(255,255,255,0.1)'}`,
              color: log.is_error ? '#ff8a8a' : 'var(--text-muted)',
            }}>
              <span style={{ opacity: 0.6, marginRight: 6 }}>
                {new Date(log.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {log.message}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
