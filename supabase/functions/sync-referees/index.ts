import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Actualiza referee + referee_country en matches desde football-data.org.
// Usa el endpoint bulk /competitions/WC/matches (1 request) en vez de uno por partido.
// Solo actualiza partidos que tengan external_id y aún no tengan árbitro asignado.

Deno.serve(async () => {
  const FOOTBALL_DATA_KEY = Deno.env.get('FOOTBALL_DATA_API_KEY')!
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    // Un solo request con todos los partidos del torneo
    const res = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches',
      { headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY } },
    )
    if (!res.ok) throw new Error(`football-data.org ${res.status}: ${await res.text()}`)

    const { matches: apiMatches } = await res.json() as {
      matches: Array<{
        id: number
        referees: Array<{ name: string; nationality: string | null; type: string }>
      }>
    }

    // Index API matches por external_id
    const apiIndex = new Map(apiMatches.map(m => [m.id, m]))

    // Partidos de nuestra DB sin árbitro y con external_id
    const { data: dbMatches, error: dbErr } = await supabase
      .from('matches')
      .select('id, external_id')
      .not('external_id', 'is', null)
      .is('referee', null)

    if (dbErr) throw dbErr

    let updated = 0
    const updates: Promise<unknown>[] = []

    for (const m of dbMatches ?? []) {
      const api = apiIndex.get(m.external_id!)
      if (!api) continue
      const ref = api.referees?.find(r => r.type === 'REFEREE') ?? api.referees?.[0]
      if (!ref) continue

      updates.push(
        supabase
          .from('matches')
          .update({ referee: ref.name, referee_country: ref.nationality ?? null })
          .eq('id', m.id)
          .then(() => { updated++ })
      )
    }

    await Promise.all(updates)

    return Response.json({ ok: true, checked: dbMatches?.length ?? 0, updated })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
})
