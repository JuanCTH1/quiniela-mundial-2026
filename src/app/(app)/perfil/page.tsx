import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'
import { Avatar } from '@/components/Avatar'
import { ProfileForm } from './ProfileForm'

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, timezone, is_admin')
    .eq('id', user!.id)
    .single()

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 20px', color: 'var(--text-main)' }}>
        Perfil
      </h1>

      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
        <Avatar
          name={profile?.display_name ?? user!.email ?? '?'}
          avatarUrl={profile?.avatar_url ?? undefined}
          size={80}
        />
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          {user!.email}
        </p>
        {profile?.is_admin && (
          <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 10, color: 'var(--gold)', marginTop: 4 }}>
            Admin
          </span>
        )}
      </div>

      <ProfileForm
        initialName={profile?.display_name ?? ''}
        initialTimezone={profile?.timezone ?? 'America/Mexico_City'}
      />

      {/* Logout */}
      <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
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
