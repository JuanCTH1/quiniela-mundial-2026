'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function SetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, color: 'var(--text-main)',
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }

    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { setError(error.message); return }
      router.replace('/partidos')
    })
  }

  return (
    <div style={{ marginBottom: 28, padding: 16, background: 'rgba(0,104,71,0.08)', border: '1px solid rgba(0,104,71,0.25)', borderRadius: 12 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--mx-green)', margin: '0 0 4px' }}>
        ¡Bienvenido a la quiniela! 🏆
      </p>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>
        Antes de entrar, crea tu contraseña para futuros accesos.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          type="password"
          placeholder="Nueva contraseña (mín. 6 caracteres)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={inputStyle}
          autoFocus
        />
        <input
          type="password"
          placeholder="Confirmar contraseña"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          style={inputStyle}
        />
        {error && <p style={{ fontSize: 12, color: 'var(--mx-red)', margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: '11px', background: 'var(--mx-green)',
            border: 'none', borderRadius: 10, color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? 'Guardando...' : 'Crear contraseña y entrar →'}
        </button>
      </form>
    </div>
  )
}
