import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAllWCMatches, resolveQuinielaScore } from '@/lib/football-data'

export async function POST() {
  const admin = createAdminClient()

  // Partidos FINISHED sin score en nuestra DB
  const { data: missing, error } = await admin
    .from('matches')
    .select('id, external_id')
    .eq('status', 'FINISHED')
    .is('home_score_quiniela', null)
    .not('external_id', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!missing?.length) return NextResponse.json({ ok: true, updated: 0, message: 'Nada que backfillear' })

  // Una sola llamada a la API para traer todos los partidos del torneo
  const apiMatches = await fetchAllWCMatches()
  const apiById = new Map(apiMatches.map(m => [m.id, m]))

  // Corte de grupos siempre es 90'
  const CORTE_GROUP = '90'

  let updated = 0
  const errors: string[] = []

  for (const m of missing) {
    const api = apiById.get(m.external_id)
    if (!api || api.status !== 'FINISHED') continue

    const quiniela = resolveQuinielaScore(api.score, CORTE_GROUP)
    if (!quiniela) { errors.push(`Sin score en API: ${m.external_id}`); continue }

    const { error: upErr } = await admin
      .from('matches')
      .update({
        home_score_quiniela: quiniela.home,
        away_score_quiniela: quiniela.away,
        home_score_fulltime: api.score.fullTime.home,
        away_score_fulltime: api.score.fullTime.away,
        result_source: 'BACKFILL',
      })
      .eq('id', m.id)

    if (upErr) errors.push(`${m.id}: ${upErr.message}`)
    else updated++
  }

  return NextResponse.json({ ok: true, updated, total: missing.length, errors })
}
