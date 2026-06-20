import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchMatch, resolveQuinielaScore, normalizeStage, normalizeStatus } from '@/lib/football-data'
import type { TablesInsert } from '@/types/database.types'

const FAILSAFE_HOURS = 3

export async function GET(request: NextRequest) {
  // Verificar token secreto del cron (Railway lo envía como header)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const startedAt = new Date().toISOString()
  const results = { updated: 0, skipped: 0, errors: 0, failsafe_alerts: 0 }

  // Partidos candidatos: SCHEDULED (próximos 30 min) o IN_PROGRESS
  const { data: candidates, error: fetchErr } = await supabase
    .from('matches')
    .select('id, external_id, status, stage, scheduled_time, actual_start_time')
    .in('status', ['SCHEDULED', 'IN_PROGRESS'])
    .lte('scheduled_time', new Date(Date.now() + 30 * 60 * 1000).toISOString())

  if (fetchErr) {
    await logEntry(supabase, 'ERROR', `Error leyendo matches candidatos: ${fetchErr.message}`, true)
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  for (const match of candidates ?? []) {
    if (!match.external_id) { results.skipped++; continue }

    try {
      const apiMatch = await fetchMatch(match.external_id)

      // Failsafe: partido bloqueado en IN_PROGRESS por más de 3 horas
      const startTime = match.actual_start_time ?? match.scheduled_time
      const hoursElapsed = (Date.now() - new Date(startTime).getTime()) / 3_600_000

      if (apiMatch.status === 'IN_PROGRESS' && hoursElapsed >= FAILSAFE_HOURS) {
        await logEntry(supabase, 'FAILSAFE_ALERT',
          `Partido ${match.external_id} lleva ${hoursElapsed.toFixed(1)}h en IN_PROGRESS`, false,
          match.id, { external_id: match.external_id, hours_elapsed: hoursElapsed }
        )
        results.failsafe_alerts++
      }

      // Obtener la regla de corte para la etapa
      const stage = normalizeStage(apiMatch.stage)
      const { data: rule } = await supabase
        .from('reglas_puntuacion')
        .select('corte')
        .eq('etapa', stage)
        .single()

      const corte = rule?.corte ?? '90'
      const quiniela = resolveQuinielaScore(apiMatch.score, corte)

      // No escribir si no hay datos completos (evita nulos parciales)
      const isFinished = apiMatch.status === 'FINISHED' && quiniela !== null
      const isFirstLive = apiMatch.status === 'IN_PROGRESS' && !match.actual_start_time
      const detectedAt = new Date()

      const payload: Partial<TablesInsert<'matches'>> = {
        status: normalizeStatus(apiMatch.status),
        home_score_fulltime: apiMatch.score.fullTime.home,
        away_score_fulltime: apiMatch.score.fullTime.away,
        home_score_regular: apiMatch.score.regularTime?.home ?? null,
        away_score_regular: apiMatch.score.regularTime?.away ?? null,
        ...(isFinished && {
          home_score_quiniela: quiniela!.home,
          away_score_quiniela: quiniela!.away,
          result_source: 'AUTOMATIC',
        }),
        ...(isFirstLive && {
          actual_start_time: detectedAt.toISOString(),
        }),
      }

      const { error: updateErr } = await supabase
        .from('matches')
        .update(payload)
        .eq('id', match.id)

      if (updateErr) throw updateErr

      results.updated++

      // Log detección de inicio para medir delay real del API
      if (isFirstLive) {
        const delayMin = Math.round((detectedAt.getTime() - new Date(match.scheduled_time).getTime()) / 60000)
        await logEntry(supabase, 'API_DELAY',
          `${match.external_id} detectado EN JUEGO ${delayMin}min después del kickoff programado`,
          false, match.id,
          { delay_minutes: delayMin, scheduled_time: match.scheduled_time, detected_at: detectedAt.toISOString() }
        )
      }

      if (isFinished) {
        await logEntry(supabase, 'RESULT_UPDATE',
          `Partido ${match.external_id} finalizado: ${quiniela!.home}-${quiniela!.away} (corte ${corte})`,
          false, match.id
        )
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await logEntry(supabase, 'ERROR', `Partido ${match.external_id}: ${msg}`, true, match.id)
      results.errors++
    }
  }

  await logEntry(supabase, 'CRON_RUN',
    `Cron completado. updated=${results.updated} skipped=${results.skipped} errors=${results.errors} failsafe=${results.failsafe_alerts}`,
    results.errors > 0, undefined,
    { ...results, started_at: startedAt }
  )

  return NextResponse.json({ ok: true, ...results })
}

async function logEntry(
  supabase: ReturnType<typeof createAdminClient>,
  log_type: string,
  message: string,
  is_error: boolean,
  match_id?: string,
  details?: Record<string, unknown>
) {
  await supabase.from('system_logs').insert({
    log_type, message, is_error, match_id,
    details: details as import('@/types/database.types').Json ?? null,
  })
}
