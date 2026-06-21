import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// QA health-check cron — corre cada 30 min durante días con partidos.
// Verifica el ciclo completo: bloqueo → resultados → puntos → leaderboard.
// Todo queda en system_logs para que el admin lo vea en el panel.

export async function GET(req: NextRequest) {
  // Acepta el secret de 3 formas para que ambos crons usen config idéntica:
  // - Authorization: Bearer <secret>  (igual que update-matches)
  // - x-cron-secret: <secret>
  // - ?secret=<secret>
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  const secret = bearer
    ?? req.headers.get('x-cron-secret')
    ?? req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = createAdminClient()
  const now = new Date()
  const checks: string[] = []
  const errors: string[] = []

  try {
    // ── 1. Partidos activos en las próximas 4h o recién terminados ────────────
    const window4h = new Date(now.getTime() + 4 * 3600 * 1000)
    const window2hAgo = new Date(now.getTime() - 2 * 3600 * 1000)

    const { data: relevantMatches } = await sb
      .from('matches')
      .select('id, home_team, away_team, scheduled_time, status, home_score_quiniela, away_score_quiniela, early_unlock_at')
      .or(`scheduled_time.gte.${window2hAgo.toISOString()},status.eq.IN_PROGRESS`)
      .lte('scheduled_time', window4h.toISOString())
      .order('scheduled_time')

    if (!relevantMatches?.length) {
      checks.push('Sin partidos en ventana ±2h/+4h — nada que verificar')
      await log(sb, checks.join(' | '), false)
      return NextResponse.json({ ok: true, checks })
    }

    const { data: settingsRows } = await sb.from('settings').select('key, value')
    const bloqueoMinutos = parseInt(settingsRows?.find(s => s.key === 'bloqueo_minutos')?.value ?? '15')

    for (const match of relevantMatches) {
      const label = `${match.home_team} vs ${match.away_team}`
      const kickoff = new Date(match.scheduled_time)
      const lockTime = new Date(kickoff.getTime() - bloqueoMinutos * 60 * 1000)
      const minutesToKickoff = Math.round((kickoff.getTime() - now.getTime()) / 60000)
      const minutesToLock = Math.round((lockTime.getTime() - now.getTime()) / 60000)

      // ── 2. Verificar conteo de predicciones ────────────────────────────────
      const { data: predCount } = await sb
        .rpc('prediction_count', { p_match_id: match.id })
      const count = predCount as number ?? 0

      checks.push(`${label}: ${count}/6 pronósticos`)

      if (count < 6 && minutesToKickoff < 60) {
        errors.push(`⚠️ ${label}: solo ${count}/6 pronósticos y faltan ${minutesToKickoff}min`)
      }

      // ── 3. Verificar bloqueo ────────────────────────────────────────────────
      if (now >= lockTime && match.status === 'SCHEDULED') {
        // Debe estar bloqueado por tiempo — verificar que RLS rechaza inserts
        // (solo verificamos estado lógico, no hacemos test real de RLS aquí)
        checks.push(`${label}: bloqueado por tiempo ✓ (kickoff ${minutesToKickoff < 0 ? 'hace' : 'en'} ${Math.abs(minutesToKickoff)}min)`)
      } else if (minutesToLock > 0 && minutesToLock <= 30) {
        checks.push(`${label}: cierra en ${minutesToLock}min`)
      }

      // ── 4. Partido en vivo — verificar que el cron está actualizando ───────
      if (match.status === 'IN_PROGRESS') {
        // Verificar que updated_at no sea muy viejo
        const { data: matchFresh } = await sb
          .from('matches')
          .select('updated_at, home_score_fulltime, away_score_fulltime')
          .eq('id', match.id)
          .single()

        if (matchFresh) {
          const updatedAt = new Date(matchFresh.updated_at)
          const minsSinceUpdate = Math.round((now.getTime() - updatedAt.getTime()) / 60000)
          if (minsSinceUpdate > 20) {
            errors.push(`🔴 ${label} EN JUEGO pero sin actualización desde hace ${minsSinceUpdate}min — ¿cron caído?`)
          } else {
            checks.push(`${label}: EN JUEGO ${matchFresh.home_score_fulltime}-${matchFresh.away_score_fulltime}, cron activo (hace ${minsSinceUpdate}min) ✓`)
          }
        }
      }

      // ── 5. Partido terminado — verificar resultado y puntos ────────────────
      if (match.status === 'FINISHED') {
        if (match.home_score_quiniela == null) {
          errors.push(`🔴 ${label} FINISHED pero sin home_score_quiniela — falla el cron o necesita Modo Dios`)
        } else {
          // Verificar que leaderboard tiene puntos
          const { data: lbRows } = await sb.from('leaderboard').select('total_points, user_id')
          const hasPoints = lbRows?.some(r => (r.total_points ?? 0) > 0)
          if (!hasPoints) {
            errors.push(`⚠️ ${label} terminado con resultado ${match.home_score_quiniela}-${match.away_score_quiniela} pero leaderboard en ceros — ¿vista rota?`)
          } else {
            checks.push(`${label}: FINALIZADO ${match.home_score_quiniela}-${match.away_score_quiniela}, puntos en leaderboard ✓`)
          }
        }
      }
    }

    // ── 6. Cron principal — verificar que corrió recientemente ────────────────
    const { data: lastCronLog } = await sb
      .from('system_logs')
      .select('created_at, message')
      .eq('log_type', 'CRON_RUN')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!lastCronLog) {
      errors.push('🔴 Sin registros del cron de actualización en system_logs')
    } else {
      const minsSinceCron = Math.round((now.getTime() - new Date(lastCronLog.created_at).getTime()) / 60000)
      if (minsSinceCron > 10) {
        errors.push(`🔴 Cron principal sin correr desde hace ${minsSinceCron}min`)
      } else {
        checks.push(`Cron principal: último run hace ${minsSinceCron}min ✓`)
      }
    }

    // Tip: football-data.org free tier = 10min delay intencional
    // Paid tier = ~1min. Si delay_minutes > 10 es normal en free tier.
    checks.push('ℹ️ football-data.org free tier: delay intencional de ~10min en datos live')

    const allOk = errors.length === 0
    const summary = allOk
      ? `QA ✅ ${checks.length} checks pasados`
      : `QA ⚠️ ${errors.length} alertas: ${errors.join(' | ')}`

    await log(sb, summary, !allOk)

    return NextResponse.json({ ok: allOk, checks, errors, summary })

  } catch (err) {
    const msg = `QA error inesperado: ${err instanceof Error ? err.message : String(err)}`
    await log(sb, msg, true)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

async function log(sb: ReturnType<typeof createAdminClient>, message: string, isError: boolean) {
  await sb.from('system_logs').insert({
    log_type: 'QA_CHECK',
    message,
    is_error: isError,
  })
}
