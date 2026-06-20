import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TestModeBanner } from '@/components/TestModeBanner'
import { SystemAlertBanner } from '@/components/SystemAlertBanner'
import { NextMatchBanner } from '@/components/NextMatchBanner'
import { BottomNav } from '@/components/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, settingsRes, nextMatchRes, alertRes] = await Promise.all([
    supabase.from('profiles').select('display_name, avatar_url, is_admin, timezone').eq('id', user.id).single(),
    supabase.from('settings').select('key, value'),
    supabase.from('matches').select('*').eq('status', 'SCHEDULED').gte('scheduled_time', new Date().toISOString()).order('scheduled_time').limit(1).single(),
    supabase.from('system_logs').select('message, created_at').eq('is_error', true).gte('created_at', new Date(Date.now() - 2 * 3_600_000).toISOString()).order('created_at', { ascending: false }).limit(1).single(),
  ])

  const profile = profileRes.data
  const settings = settingsRes.data ?? []
  const appMode = settings.find(s => s.key === 'app_mode')?.value ?? 'test'
  const bloqueoMinutos = parseInt(settings.find(s => s.key === 'bloqueo_minutos')?.value ?? '15')
  const timezone = profile?.timezone ?? 'America/Mexico_City'
  const nextMatch = nextMatchRes.data ?? null

  let nextPrediction = null
  if (nextMatch) {
    const { data } = await supabase
      .from('predictions')
      .select('home_score, away_score')
      .eq('match_id', nextMatch.id)
      .eq('user_id', user.id)
      .single()
    nextPrediction = data
  }

  return (
    <div style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
      {appMode === 'test' && <TestModeBanner />}
      {alertRes.data && (
        <SystemAlertBanner
          message={alertRes.data.message}
          createdAt={alertRes.data.created_at}
        />
      )}
      <NextMatchBanner
        match={nextMatch}
        prediction={nextPrediction}
        bloqueoMinutos={bloqueoMinutos}
        timezone={timezone}
      />
      {children}
      <BottomNav isAdmin={profile?.is_admin ?? false} />
    </div>
  )
}
