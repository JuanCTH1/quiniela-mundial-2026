'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // PKCE flow: ?code=xxx (futuro)
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        router.replace(error ? '/login?error=auth_callback' : '/partidos')
      })
      return
    }

    // Implicit flow: #access_token=xxx (invitaciones de Supabase)
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const accessToken = hash.get('access_token')
    const refreshToken = hash.get('refresh_token')
    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
        router.replace(error ? '/login?error=auth_callback' : '/partidos')
      })
      return
    }

    router.replace('/login?error=missing_code')
  }, [router])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-main)' }}>
      <p>Verificando cuenta...</p>
    </div>
  )
}
