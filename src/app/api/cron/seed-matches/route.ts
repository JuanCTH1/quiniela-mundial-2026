import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAllWCMatches, normalizeStage, normalizeStatus } from '@/lib/football-data'
import type { TablesInsert } from '@/types/database.types'

// Ruta de uso único para poblar la tabla matches desde la API.
// Idempotente: upsert por external_id.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const apiMatches = await fetchAllWCMatches()

  const rows: TablesInsert<'matches'>[] = apiMatches.map(m => ({
    external_id: m.id,
    stage: normalizeStage(m.stage),
    group_name: m.group ?? null,
    matchday: m.matchday ?? null,
    home_team: m.homeTeam.shortName ?? m.homeTeam.name ?? 'TBD',
    away_team: m.awayTeam.shortName ?? m.awayTeam.name ?? 'TBD',
    is_placeholder: !m.homeTeam.name || !m.awayTeam.name ||
                    m.homeTeam.name.includes('Winner') || m.awayTeam.name.includes('Winner'),
    scheduled_time: m.utcDate,
    status: normalizeStatus(m.status),
  }))

  const { error, count } = await supabase
    .from('matches')
    .upsert(rows, { onConflict: 'external_id', ignoreDuplicates: false })
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.from('system_logs').insert({
    log_type: 'CRON_RUN',
    message: `Seed completado: ${count ?? rows.length} partidos insertados/actualizados`,
    is_error: false,
    details: { total: rows.length },
  })

  return NextResponse.json({ ok: true, total: rows.length })
}
