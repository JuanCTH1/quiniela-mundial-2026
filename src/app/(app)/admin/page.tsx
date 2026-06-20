import { createClient } from '@/lib/supabase/server'
import { AdminActions } from './AdminActions'

export default async function AdminPage() {
  const supabase = await createClient()

  const [settingsRes, logsRes, usersRes] = await Promise.all([
    supabase.from('settings').select('key, value'),
    supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('profiles').select('id, display_name, is_admin').order('display_name'),
  ])

  const settings = settingsRes.data ?? []
  const logs = logsRes.data ?? []
  const users = usersRes.data ?? []

  const appMode = settings.find(s => s.key === 'app_mode')?.value ?? 'test'
  const bloqueoMinutos = settings.find(s => s.key === 'bloqueo_minutos')?.value ?? '15'

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-main)' }}>
        Admin 🛡️
      </h1>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 20px' }}>
        Con gran poder viene gran irresponsabilidad
      </p>

      <AdminActions
        appMode={appMode}
        bloqueoMinutos={bloqueoMinutos}
        users={users}
        logs={logs}
      />
    </div>
  )
}
