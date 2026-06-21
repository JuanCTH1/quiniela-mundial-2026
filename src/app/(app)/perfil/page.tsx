import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'
import { ProfileForm } from './ProfileForm'
import { ThemeSelector } from './ThemeSelector'
import { SetPasswordForm } from './SetPasswordForm'

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ bienvenido?: string }>
}) {
  const { bienvenido } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, timezone, is_admin, theme')
    .eq('id', user!.id)
    .single()

  const theme = profile?.theme ?? 'mexico'

  return (
    <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-main)' }}>
        Perfil
      </h1>

      {/* Email + badge */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{user!.email}</p>
        {profile?.is_admin && (
          <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 10, color: 'var(--gold)', display: 'inline-block', marginTop: 6 }}>
            Admin
          </span>
        )}
      </div>

      {bienvenido === '1' && <SetPasswordForm />}

      <div className="glass-card" style={{ padding: '16px' }}>
        <ProfileForm
          initialName={profile?.display_name ?? ''}
          initialTimezone={profile?.timezone ?? 'America/Mexico_City'}
          initialAvatarUrl={profile?.avatar_url}
          userId={user!.id}
        />
      </div>

      {/* Selector de Tema */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', margin: '0 0 14px' }}>
          Tema Visual
        </h2>
        <ThemeSelector initialTheme={theme} userId={user!.id} />
      </div>

      {/* Logout */}
      <div className="glass-card" style={{ padding: '12px' }}>
        <form action={logout}>
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '11px',
              background: 'transparent',
              border: '1px solid rgba(206,17,38,0.4)',
              borderRadius: 10,
              color: 'var(--mx-red)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  )
}
