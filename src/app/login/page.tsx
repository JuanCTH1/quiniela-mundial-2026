'use client'

import { useActionState, useEffect, useState } from 'react'
import { login } from '@/app/actions/auth'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined)
  const [hashError, setHashError] = useState<string | null>(null)

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const code = hash.get('error_code')
    if (code === 'otp_expired') setHashError('El link de invitación expiró. Pídele al admin que te mande uno nuevo.')
    else if (hash.get('error')) setHashError('El link de acceso no es válido. Pídele al admin que te mande uno nuevo.')
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 20px',
      }}
    >
      <div className="glass-card" style={{ width: '100%', maxWidth: 380, padding: '40px 32px' }}>
        {/* Logo / título */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Quiniela Overrated
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 0' }}>
            Mundial 2026
          </p>
        </div>

        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label
              htmlFor="email"
              style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}
            >
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                color: 'var(--text-main)',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                color: 'var(--text-main)',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {hashError && (
            <p style={{ fontSize: 12, color: 'var(--mx-red)', margin: 0 }}>{hashError}</p>
          )}
          {state?.error && (
            <p style={{ fontSize: 12, color: 'var(--mx-red)', margin: 0 }}>{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{
              marginTop: 4,
              padding: '12px',
              background: 'var(--mx-green)',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: pending ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {pending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
