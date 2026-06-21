'use client'

import { useRef, useState, useTransition } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { updateProfile } from '@/app/actions/predictions'
import { TIMEZONES } from '@/lib/utils'
import type { Database } from '@/types/database.types'

interface Props {
  initialName: string
  initialTimezone: string
  initialAvatarUrl?: string | null
  userId: string
}

export function ProfileForm({ initialName, initialTimezone, initialAvatarUrl, userId }: Props) {
  const [name, setName] = useState(initialName)
  const [timezone, setTimezone] = useState(initialTimezone)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwPending, setPwPending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setAvatarError('Máximo 2 MB'); return }

    setAvatarUploading(true)
    setAvatarError(null)

    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`

    const { error } = await supabase.storage.from('avatares').upload(path, file, { upsert: true })
    if (error) {
      const msg = /mime|content type/i.test(error.message) ? 'Formato no soportado. Usa JPG, PNG o WebP.'
        : /size|exceed|large|payload/i.test(error.message) ? 'Imagen muy pesada (máx 2 MB).'
        : error.message || 'Error al subir imagen'
      setAvatarError(msg); setAvatarUploading(false); return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatares').getPublicUrl(path)

    // Add cache-bust so the browser doesn't show the old image
    const urlWithBust = `${publicUrl}?t=${Date.now()}`
    setAvatarUrl(urlWithBust)

    // Persist to profile
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)
    setAvatarUploading(false)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    if (newPassword.length < 6) { setPwError('Mínimo 6 caracteres'); return }
    if (newPassword !== confirmPassword) { setPwError('Las contraseñas no coinciden'); return }
    setPwPending(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwPending(false)
    if (error) { setPwError(error.message); return }
    setPwSaved(true)
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPwSaved(false), 3000)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await updateProfile(name, timezone)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    color: 'var(--text-main)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  }

  // Initials for the preview
  const initials = name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Avatar upload */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            position: 'relative',
            width: 80, height: 80,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px dashed rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.06)',
            cursor: 'pointer',
            padding: 0,
          }}
          title="Cambiar foto"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-muted)' }}>{initials}</span>
          )}
          {/* Overlay on hover */}
          <span style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: '#fff', fontWeight: 500,
            opacity: avatarUploading ? 1 : 0,
            transition: 'opacity 0.2s',
          }}>
            {avatarUploading ? '...' : '📷'}
          </span>
        </button>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {avatarUploading ? 'Subiendo...' : 'Toca para cambiar foto'}
        </span>
        {avatarError && <span style={{ fontSize: 11, color: 'var(--mx-red)' }}>{avatarError}</span>}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
          Nombre para mostrar
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Tu nombre"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
          Zona horaria
        </label>
        <select value={timezone} onChange={e => setTimezone(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          {TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value} style={{ background: '#111' }}>{tz.label}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        style={{
          padding: '11px',
          background: saved ? 'rgba(52,168,83,0.3)' : 'var(--mx-green)',
          border: 'none', borderRadius: 10, color: '#fff',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
          opacity: isPending ? 0.7 : 1, transition: 'all 0.2s',
        }}
      >
        {isPending ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar'}
      </button>
    </form>

    {/* Cambiar contraseña */}
    <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Cambiar contraseña
      </div>
      <input
        type="password"
        value={newPassword}
        onChange={e => setNewPassword(e.target.value)}
        placeholder="Nueva contraseña"
        autoComplete="new-password"
        style={inputStyle}
      />
      <input
        type="password"
        value={confirmPassword}
        onChange={e => setConfirmPassword(e.target.value)}
        placeholder="Confirmar contraseña"
        autoComplete="new-password"
        style={inputStyle}
      />
      {pwError && <span style={{ fontSize: 11, color: 'var(--mx-red)' }}>{pwError}</span>}
      <button
        type="submit"
        disabled={pwPending || !newPassword}
        style={{
          padding: '11px',
          background: pwSaved ? 'rgba(52,168,83,0.3)' : 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
          opacity: (pwPending || !newPassword) ? 0.5 : 1, transition: 'all 0.2s',
        }}
      >
        {pwPending ? 'Guardando...' : pwSaved ? '✓ Contraseña actualizada' : 'Actualizar contraseña'}
      </button>
    </form>
  )
}
