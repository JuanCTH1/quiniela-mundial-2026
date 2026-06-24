import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUser, getProfile, getSettings } from '@/lib/data'
import { TestModeBanner } from '@/components/TestModeBanner'
import { SystemAlertBanner } from '@/components/SystemAlertBanner'
import { NextMatchBannerWrapper } from '@/components/NextMatchBannerWrapper'
import { BottomNav } from '@/components/BottomNav'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ParallaxBackground } from '@/components/ParallaxBackground'
import type { Theme } from '@/lib/themes'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  const [profile, settings, liveMatchRes, nextMatchRes, alertRes] = await Promise.all([
    getProfile(user.id),
    getSettings(),
    // Partidos en vivo (hasta 4 simultáneos; el banner los lista todos)
    supabase.from('matches')
      .select('id, home_team, away_team, scheduled_time, early_unlock_at, stage, group_name, home_score_fulltime, away_score_fulltime, current_minute, current_period')
      .eq('status', 'IN_PROGRESS')
      .order('scheduled_time').limit(4),
    // Siguiente programado
    supabase.from('matches')
      .select('id, home_team, away_team, scheduled_time, early_unlock_at, stage, group_name')
      .eq('status', 'SCHEDULED')
      .gte('scheduled_time', new Date().toISOString())
      .order('scheduled_time').limit(1).maybeSingle(),
    // Solo alertas que el jugador debe ver (partido atascado sin actualizar).
    // Los errores transitorios del cron (fetch failed, etc.) viven en el panel
    // de salud del admin, no en una banda roja para los 6 jugadores.
    supabase.from('system_logs').select('message, created_at').eq('log_type', 'FAILSAFE_ALERT')
      .gte('created_at', new Date(Date.now() - 2 * 3_600_000).toISOString())
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const appMode = settings.find(s => s.key === 'app_mode')?.value ?? 'test'
  const bloqueoMinutos = parseInt(settings.find(s => s.key === 'bloqueo_minutos')?.value ?? '15')
  const timezone = profile?.timezone ?? 'America/Mexico_City'

  const theme = (profile?.theme as Theme) ?? 'mexico'
  const liveMatches = liveMatchRes.data ?? []
  const nextMatch = nextMatchRes.data ?? null

  const bannerSkeleton = (liveMatches.length > 0 || nextMatch) ? (
    <div style={{ height: 52, background: 'var(--glass-bg)' }} />
  ) : null

  return (
    <ThemeProvider theme={theme}>
      <ParallaxBackground />
      <div style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))', maxWidth: 480, margin: '0 auto' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        background: 'var(--header-bg)',
        borderBottom: '1px solid var(--header-border)',
      }}>
        {appMode === 'test' && <TestModeBanner theme={theme} />}
        {alertRes.data && (
          <SystemAlertBanner message={alertRes.data.message} createdAt={alertRes.data.created_at} />
        )}
        <Suspense fallback={bannerSkeleton}>
          <NextMatchBannerWrapper
            liveMatches={liveMatches}
            nextMatch={nextMatch}
            userId={user.id}
            bloqueoMinutos={bloqueoMinutos}
            timezone={timezone}
            theme={theme}
          />
        </Suspense>
      </div>
      <div style={{ padding: '0 16px' }}>
        {children}
      </div>
      <BottomNav isAdmin={profile?.is_admin ?? false} theme={theme} />
    </div>
    </ThemeProvider>
  )
}
