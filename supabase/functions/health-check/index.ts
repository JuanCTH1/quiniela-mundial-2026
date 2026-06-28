import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ADMIN_EMAIL = 'juancarlostatto@gmail.com'

type Alert = { level: 'red' | 'yellow'; message: string }

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const RESEND_KEY = Deno.env.get('RESEND_API_KEY')

  const now = new Date()
  const in48h = new Date(now.getTime() + 48 * 3600 * 1000)
  const in72h = new Date(now.getTime() + 72 * 3600 * 1000)
  const in7d  = new Date(now.getTime() + 7  * 24 * 3600 * 1000)

  const alerts: Alert[] = []
  const ok: string[]    = []

  // ── 1. Equipos TBD en eliminatorias próximas 7 días ───────────────────────
  const { data: tbdMatches } = await supabase
    .from('matches')
    .select('home_team, away_team, scheduled_time, stage')
    .eq('status', 'SCHEDULED')
    .not('stage', 'in', '("GROUP","GROUP_STAGE")')
    .lte('scheduled_time', in7d.toISOString())
    .or('home_team.like.TBD%,away_team.like.TBD%,home_team.is.null,away_team.is.null')

  if (tbdMatches?.length) {
    for (const m of tbdMatches) {
      const d = new Date(m.scheduled_time).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' })
      alerts.push({ level: 'red', message: `Equipos sin definir (${m.stage}): ${m.home_team ?? 'TBD'} vs ${m.away_team ?? 'TBD'} — ${d}` })
    }
  } else {
    ok.push('Equipos eliminatorias: todos definidos ✓')
  }

  // ── 2. Facts faltantes en partidos próximos 72h ───────────────────────────
  const { data: upcoming72 } = await supabase
    .from('matches')
    .select('id, home_team, away_team, scheduled_time')
    .eq('status', 'SCHEDULED')
    .not('home_team', 'like', 'TBD%')
    .not('away_team', 'like', 'TBD%')
    .lte('scheduled_time', in72h.toISOString())
    .gte('scheduled_time', now.toISOString())

  const { data: existingFacts } = await supabase
    .from('match_facts')
    .select('match_id')

  const withFacts = new Set((existingFacts ?? []).map((f: { match_id: string }) => f.match_id))
  const missingFacts = (upcoming72 ?? []).filter(m => !withFacts.has(m.id))

  if (missingFacts.length > 0) {
    const names = missingFacts.map(m => `${m.home_team} vs ${m.away_team}`).join(', ')
    alerts.push({ level: 'red', message: `${missingFacts.length} partidos en 72h sin datos curiosos: ${names}` })
  } else {
    ok.push('Facts: todos los partidos próximos 72h tienen datos ✓')
  }

  // ── 4. Partidos FINISHED sin resultado registrado ─────────────────────────
  const { data: brokenFinished } = await supabase
    .from('matches')
    .select('home_team, away_team')
    .eq('status', 'FINISHED')
    .or('home_score_quiniela.is.null,away_score_quiniela.is.null')

  if (brokenFinished?.length) {
    const names = brokenFinished.map((m: { home_team: string; away_team: string }) => `${m.home_team} vs ${m.away_team}`).join(', ')
    alerts.push({ level: 'red', message: `${brokenFinished.length} partidos FINISHED sin resultado: ${names}` })
  } else {
    ok.push('Resultados finales: todos registrados ✓')
  }

  // ── 5. Partidos próximos 72h sin momios ───────────────────────────────────
  if ((upcoming72 ?? []).length > 0) {
    const { data: oddsRows } = await supabase
      .from('match_odds')
      .select('match_id')
      .in('match_id', (upcoming72 ?? []).map(m => m.id))

    const withOdds = new Set((oddsRows ?? []).map((o: { match_id: string }) => o.match_id))
    const noOdds = (upcoming72 ?? []).filter(m => !withOdds.has(m.id))
    if (noOdds.length > 0) {
      alerts.push({ level: 'yellow', message: `${noOdds.length} partidos próximos sin momios: ${noOdds.map(m => `${m.home_team} vs ${m.away_team}`).join(', ')}` })
    } else {
      ok.push('Momios: todos los partidos próximos tienen odds ✓')
    }
  }

  // ── 6. Árbitros sin asignar en próximos 72h ───────────────────────────────
  const { data: noReferee } = await supabase
    .from('matches')
    .select('home_team, away_team, scheduled_time')
    .eq('status', 'SCHEDULED')
    .is('referee', null)
    .lte('scheduled_time', in72h.toISOString())
    .gte('scheduled_time', now.toISOString())
    .not('home_team', 'like', 'TBD%')
    .not('away_team', 'like', 'TBD%')

  if (noReferee?.length) {
    alerts.push({ level: 'yellow', message: `${noReferee.length} partidos en 72h sin árbitro asignado` })
  } else {
    ok.push('Árbitros: todos asignados para próximos 72h ✓')
  }

  // ── Log a system_logs ─────────────────────────────────────────────────────
  const redAlerts  = alerts.filter(a => a.level === 'red')
  const hasRed     = redAlerts.length > 0
  const summary    = alerts.length === 0
    ? `Health check ✅ — ${ok.length} checks ok`
    : `Health check ⚠️ — ${redAlerts.length} críticos, ${alerts.filter(a => a.level === 'yellow').length} avisos`

  await supabase.from('system_logs').insert({
    log_type: 'HEALTH_CHECK',
    message: summary,
    is_error: hasRed,
    details: { alerts, ok } as unknown as Parameters<typeof supabase.from>[0],
  })

  // ── Email vía Resend si hay alertas ──────────────────────────────────────
  if (alerts.length > 0 && RESEND_KEY) {
    const body = [
      `🚨 Quiniela Overrated — ${alerts.length} alertas (${now.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })})`,
      '',
      ...alerts.map(a => `${a.level === 'red' ? '🔴' : '🟡'} ${a.message}`),
      '',
      '✅ Sin problemas:',
      ...ok.map(o => `   ${o}`),
      '',
      'Revisa /admin para más detalle.',
    ].join('\n')

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Quiniela <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject: `${hasRed ? '🔴' : '🟡'} Quiniela: ${alerts.length} alertas detectadas`,
        text: body,
      }),
    })
  }

  return Response.json({ ok: alerts.length === 0, alerts, checks: ok, summary })
})
