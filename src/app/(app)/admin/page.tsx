import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminActions } from './AdminActions'
import { ContextHealthPanel, type MatchHealth } from './ContextHealthPanel'

export default async function AdminPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const [
    settingsRes, logsRes, usersRes,
    allMatchesRes, scheduledRes, oddsRes, teamMetaRes, factsRes, tbdRes,
  ] = await Promise.all([
    supabase.from('settings').select('key, value'),
    supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(50),
    (() => {
      const q = supabase.from('profiles').select('id, display_name, is_admin').order('display_name')
      return process.env.NEXT_PUBLIC_APP_ENV === 'production' ? q.eq('is_test', false) : q
    })(),
    // Todos los partidos (selector del panel de borrado)
    supabase.from('matches')
      .select('id, home_team, away_team, scheduled_time')
      .order('scheduled_time').limit(80),
    // SCHEDULED con equipos definidos (panel de salud)
    supabase.from('matches')
      .select('id, home_team, away_team, scheduled_time, stage, group_name, venue_id, referee')
      .eq('status', 'SCHEDULED')
      .not('home_team', 'like', 'TBD%')
      .not('away_team', 'is', null)
      .not('away_team', 'like', 'TBD%')
      .order('scheduled_time'),
    supabase.from('match_odds').select('match_id'),
    supabase.from('team_metadata').select('team_name, coach, avg_age'),
    // Admin client para ver facts no-revisados (RLS los filtra al user normal)
    admin.from('match_facts')
      .select('id, match_id, category, body, position, reviewed')
      .order('position', { ascending: true }),
    // Partidos de eliminatorias con equipos sin definir (TBD)
    supabase.from('matches')
      .select('home_team, away_team, scheduled_time, stage')
      .eq('status', 'SCHEDULED')
      .not('stage', 'in', '("GROUP","GROUP_STAGE")')
      .or('home_team.like.TBD%,away_team.like.TBD%'),
  ])

  const settings      = settingsRes.data ?? []
  const logs          = logsRes.data ?? []
  const users         = usersRes.data ?? []
  const allMatches    = allMatchesRes.data ?? []
  const scheduled     = scheduledRes.data ?? []
  const tbdKnockout   = tbdRes.data ?? []

  const appMode       = settings.find(s => s.key === 'app_mode')?.value ?? 'test'
  const bloqueoMinutos = settings.find(s => s.key === 'bloqueo_minutos')?.value ?? '15'

  // Índices para cruce rápido
  const oddsSet = new Set((oddsRes.data ?? []).map(o => o.match_id))
  const teamMeta = new Map((teamMetaRes.data ?? []).map(t => [t.team_name, t]))

  const factsByMatch = new Map<string, NonNullable<typeof factsRes.data>>()
  for (const f of factsRes.data ?? []) {
    if (!factsByMatch.has(f.match_id)) factsByMatch.set(f.match_id, [])
    factsByMatch.get(f.match_id)!.push(f)
  }

  // Alertas de salud para el banner superior
  const now48h = new Date(Date.now() + 48 * 3600 * 1000)
  const upcoming48h = scheduled.filter(m => new Date(m.scheduled_time) <= now48h)
  const missingFacts48h = upcoming48h.filter(m => !factsByMatch.has(m.id))
  const unreviewedFacts48h = upcoming48h.filter(m => {
    const mFacts = factsByMatch.get(m.id) ?? []
    return mFacts.length > 0 && mFacts.some(f => !f.reviewed)
  })

  const healthAlerts: { level: 'red' | 'yellow'; message: string }[] = [
    ...tbdKnockout.map(m => ({
      level: 'red' as const,
      message: `Equipo sin definir: ${m.home_team} vs ${m.away_team} (${m.stage})`,
    })),
    ...(missingFacts48h.length > 0 ? [{
      level: 'red' as const,
      message: `${missingFacts48h.length} partido${missingFacts48h.length > 1 ? 's' : ''} en 48h sin datos curiosos: ${missingFacts48h.map(m => `${m.home_team} vs ${m.away_team}`).join(', ')}`,
    }] : []),
    ...(unreviewedFacts48h.length > 0 ? [{
      level: 'yellow' as const,
      message: `Facts sin aprobar para: ${unreviewedFacts48h.map(m => `${m.home_team} vs ${m.away_team}`).join(', ')}`,
    }] : []),
  ]

  const healthMatches: MatchHealth[] = scheduled.map(m => {
    const hm = teamMeta.get(m.home_team)
    const am = teamMeta.get(m.away_team)
    return {
      id:             m.id,
      home_team:      m.home_team,
      away_team:      m.away_team,
      scheduled_time: m.scheduled_time,
      stage:          m.stage,
      group_name:     m.group_name,
      has_venue:      m.venue_id != null,
      has_odds:       oddsSet.has(m.id),
      has_referee:    m.referee != null,
      has_home_coach: hm?.coach != null,
      has_away_coach: am?.coach != null,
      has_home_age:   hm?.avg_age != null,
      has_away_age:   am?.avg_age != null,
      facts:          factsByMatch.get(m.id) ?? [],
    }
  })

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-main)' }}>
        Admin 🛡️
      </h1>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 20px' }}>
        Con gran poder viene gran irresponsabilidad
      </p>

      <ContextHealthPanel matches={healthMatches} alerts={healthAlerts} />

      <div style={{ marginTop: 16 }}>
        <AdminActions
          appMode={appMode}
          bloqueoMinutos={bloqueoMinutos}
          users={users}
          logs={logs}
          matches={allMatches}
        />
      </div>
    </div>
  )
}
