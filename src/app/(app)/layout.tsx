import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUser, getProfile, getSettings } from '@/lib/data'
import { TestModeBanner } from '@/components/TestModeBanner'
import { SystemAlertBanner } from '@/components/SystemAlertBanner'
import { NextMatchBanner } from '@/components/NextMatchBanner'
import { BottomNav } from '@/components/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  // getProfile + getSettings are cached — pages that call them won't re-query the DB
  const [profile, settings, nextMatchRes, alertRes] = await Promise.all([
    getProfile(user.id),
    getSettings(),
    supabase.from('matches')
      .select('id, home_team, away_team, scheduled_time, early_unlock_at, stage, group_name')
      .eq('status', 'SCHEDULED')
      .gte('scheduled_time', new Date().toISOString())
      .order('scheduled_time').limit(1).maybeSingle(),
    supabase.from('system_logs').select('message, created_at').eq('is_error', true)
      .gte('created_at', new Date(Date.now() - 2 * 3_600_000).toISOString())
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const appMode = settings.find(s => s.key === 'app_mode')?.value ?? 'test'
  const bloqueoMinutos = parseInt(settings.find(s => s.key === 'bloqueo_minutos')?.value ?? '15')
  const timezone = profile?.timezone ?? 'America/Mexico_City'
  const nextMatch = nextMatchRes.data ?? null

  const nextPrediction = nextMatch
    ? (await supabase.from('predictions').select('home_score, away_score')
        .eq('match_id', nextMatch.id).eq('user_id', user.id).maybeSingle()).data
    : null

  return (
    <div style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
      {/* Sticky header: banners + próximo partido */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        background: 'rgba(6,12,10,0.75)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {appMode === 'test' && <TestModeBanner />}
        {alertRes.data && (
          <SystemAlertBanner message={alertRes.data.message} createdAt={alertRes.data.created_at} />
        )}
        <NextMatchBanner
          match={nextMatch}
          prediction={nextPrediction}
          bloqueoMinutos={bloqueoMinutos}
          timezone={timezone}
        />
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px' }}>
        {children}
      </div>
      <BottomNav isAdmin={profile?.is_admin ?? false} />
    </div>
  )
}
