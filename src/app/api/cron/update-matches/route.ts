import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchMatch, resolveQuinielaScore, normalizeStage, normalizeStatus, extractGoals } from '@/lib/football-data'
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
  // home_score_fulltime/away_score_fulltime incluidos para detectar cambios de marcador
  const { data: candidates, error: fetchErr } = await supabase
    .from('matches')
    .select('id, external_id, status, stage, scheduled_time, actual_start_time, home_score_fulltime, away_score_fulltime, current_minute, current_period, second_half_start_time, extra_time_start_time')
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
      // Normalizar el status de la API (IN_PLAY/PAUSED → IN_PROGRESS, etc.) una sola vez
      const apiStatus = normalizeStatus(apiMatch.status)

      // Failsafe: partido bloqueado en IN_PROGRESS por más de 3 horas
      const startTime = match.actual_start_time ?? match.scheduled_time
      const hoursElapsed = (Date.now() - new Date(startTime).getTime()) / 3_600_000

      if (apiStatus === 'IN_PROGRESS' && hoursElapsed >= FAILSAFE_HOURS) {
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
      const isFinished = apiStatus === 'FINISHED' && quiniela !== null
      const isFirstLive = apiStatus === 'IN_PROGRESS' && !match.actual_start_time
      const detectedAt = new Date()
      const newPeriod = derivePeriod(apiMatch.status, apiMatch.minute, match.current_period)
      // Detectar inicio del 2T: transición MT → 2T, solo se escribe una vez
      const isSecondHalfStart = newPeriod === '2T' && match.current_period === 'MT' && !match.second_half_start_time
      const isExtraTimeStart = newPeriod === 'ET1' && match.current_period === 'MTE' && !match.extra_time_start_time

      const payload: Partial<TablesInsert<'matches'>> = {
        status: apiStatus,
        home_score_fulltime: apiMatch.score.fullTime.home,
        away_score_fulltime: apiMatch.score.fullTime.away,
        home_score_regular: apiMatch.score.regularTime?.home ?? null,
        away_score_regular: apiMatch.score.regularTime?.away ?? null,
        current_minute: apiStatus === 'IN_PROGRESS' ? (apiMatch.minute ?? null) : null,
        current_period: newPeriod,
        goals: extractGoals(apiMatch) as unknown as import('@/types/database.types').Json,
        ...(isFinished && {
          home_score_quiniela: quiniela!.home,
          away_score_quiniela: quiniela!.away,
          result_source: 'AUTOMATIC',
        }),
        ...(isFirstLive && {
          actual_start_time: detectedAt.toISOString(),
        }),
        ...(isSecondHalfStart && {
          second_half_start_time: detectedAt.toISOString(),
        }),
        ...(isExtraTimeStart && {
          extra_time_start_time: detectedAt.toISOString(),
        }),
      }

      // Log para verificar que el API devuelve el campo minute.
      // Solo cuando cambia el minuto, para no inundar system_logs en cada tick.
      if (apiStatus === 'IN_PROGRESS' && apiMatch.minute != null && apiMatch.minute !== match.current_minute) {
        await logEntry(supabase, 'MINUTE_CHECK',
          `⏱ ${match.external_id}: minuto ${apiMatch.minute} (${newPeriod})`,
          false, match.id, { minute: apiMatch.minute }
        )
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

      // Log cambio de marcador durante partido en vivo
      const newHome = apiMatch.score.fullTime.home
      const newAway = apiMatch.score.fullTime.away
      const prevHome = match.home_score_fulltime
      const prevAway = match.away_score_fulltime
      const scoreChanged = match.status === 'IN_PROGRESS'
        && newHome != null && newAway != null
        && (newHome !== prevHome || newAway !== prevAway)
        && (prevHome != null || prevAway != null) // evita loggear el primer 0-0

      if (scoreChanged) {
        await logEntry(supabase, 'SCORE_UPDATE',
          `⚽ ${match.external_id}: ${prevHome}-${prevAway} → ${newHome}-${newAway}`,
          false, match.id,
          { prev: `${prevHome}-${prevAway}`, curr: `${newHome}-${newAway}` }
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

// Periodo del partido a partir del status raw de la API + minuto
// Valores: 1T, MT, 2T, ET1, MTE, ET2, PEN — null cuando no está en juego
function derivePeriod(rawStatus: string, minute: number | null | undefined, currentPeriod: string | null): string | null {
  if (rawStatus === 'PAUSED') {
    // Si ya estamos en MT o MTE, quedarse ahí (re-poll estable)
    if (currentPeriod === 'MT') return 'MT'
    if (currentPeriod === 'MTE') return 'MTE'
    // Transición a descanso de prórroga
    if (currentPeriod === '2T' || currentPeriod === 'ET1') return 'MTE'
    if (minute != null && minute >= 90) return 'MTE'
    // Transición a medio tiempo normal: solo si el minuto indica final del 1T
    if (minute != null && minute >= 43) return 'MT'
    // Pausa temprana (water/cooling break dentro del 1T): quedarse en periodo actual
    return currentPeriod ?? 'MT'
  }
  if (rawStatus !== 'IN_PLAY') return null

  // football-data.org no siempre envía 'minute'. Si falta, avanzamos el periodo
  // usando las transiciones de PAUSED ya guardadas (1T→MT→2T, etc.).
  if (minute == null) {
    if (currentPeriod === 'MT') return '2T'
    if (currentPeriod === 'MTE') return 'ET1'
    return currentPeriod ?? '1T'
  }

  if (minute <= 45) return '1T'
  if (minute <= 90) {
    // Distinguir descuento del 1T (45+) del arranque del 2T usando el periodo previo
    if (currentPeriod === 'MT' || currentPeriod === '2T') return '2T'
    if (currentPeriod === '1T') return '1T'
    // Fallback: 46-48 probablemente sigue siendo descuento del 1T, 49+ ya es 2T
    return minute <= 48 ? '1T' : '2T'
  }
  if (minute <= 105) return 'ET1'
  if (minute <= 120) return 'ET2'
  return 'PEN'
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
