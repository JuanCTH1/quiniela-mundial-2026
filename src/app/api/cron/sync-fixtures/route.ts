import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAllWCMatches, normalizeStage } from '@/lib/football-data'

// Actualiza equipos y hora de partidos placeholder cuando el bracket queda definido.
// NUNCA toca scores, status ni predicciones — solo home_team, away_team, is_placeholder, scheduled_time.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const startedAt = new Date().toISOString()
  const results = { updated: 0, skipped: 0, errors: 0 }

  // Traer todos los placeholders de la DB (incluyendo knockout rounds)
  const { data: placeholders, error: dbErr } = await supabase
    .from('matches')
    .select('id, external_id, home_team, away_team, is_placeholder, scheduled_time')
    .eq('is_placeholder', true)

  if (dbErr) {
    await logEntry(supabase, 'ERROR', `sync-fixtures: error leyendo placeholders: ${dbErr.message}`, true)
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  if (!placeholders?.length) {
    await logEntry(supabase, 'CRON_RUN', 'sync-fixtures: no hay placeholders pendientes', false,
      { started_at: startedAt, ...results })
    return NextResponse.json({ ok: true, message: 'No placeholders', ...results })
  }

  // Un solo request a la API para todos los partidos del torneo
  const apiMatches = await fetchAllWCMatches()
  const apiById = new Map(apiMatches.map(m => [m.id, m]))

  for (const row of placeholders) {
    if (!row.external_id) { results.skipped++; continue }

    const api = apiById.get(row.external_id)
    if (!api) { results.skipped++; continue }

    const homeName = api.homeTeam.shortName ?? api.homeTeam.name ?? ''
    const awayName = api.awayTeam.shortName ?? api.awayTeam.name ?? ''

    // Sigue siendo placeholder si no hay nombre real o contiene "Winner"/"Loser"
    const stillPlaceholder =
      !homeName || !awayName ||
      homeName.includes('Winner') || awayName.includes('Winner') ||
      homeName.includes('Loser') || awayName.includes('Loser') ||
      homeName === 'TBD' || awayName === 'TBD'

    if (stillPlaceholder) { results.skipped++; continue }

    try {
      const { error: updateErr } = await supabase
        .from('matches')
        .update({
          home_team: homeName,
          away_team: awayName,
          is_placeholder: false,
          scheduled_time: api.utcDate,
          stage: normalizeStage(api.stage),
          group_name: api.group ?? null,
        })
        .eq('id', row.id)

      if (updateErr) throw updateErr

      await logEntry(supabase, 'FIXTURE_UPDATE',
        `sync-fixtures: ${row.external_id} → ${homeName} vs ${awayName}`, false,
        { external_id: row.external_id, home: homeName, away: awayName, scheduled_time: api.utcDate }
      )

      results.updated++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await logEntry(supabase, 'ERROR', `sync-fixtures: partido ${row.external_id}: ${msg}`, true)
      results.errors++
    }
  }

  await logEntry(supabase, 'CRON_RUN',
    `sync-fixtures completado. updated=${results.updated} skipped=${results.skipped} errors=${results.errors}`,
    results.errors > 0,
    { ...results, started_at: startedAt }
  )

  return NextResponse.json({ ok: true, ...results })
}

async function logEntry(
  supabase: ReturnType<typeof createAdminClient>,
  log_type: string,
  message: string,
  is_error: boolean,
  details?: Record<string, unknown>
) {
  await supabase.from('system_logs').insert({
    log_type, message, is_error,
    details: details as import('@/types/database.types').Json ?? null,
  })
}
