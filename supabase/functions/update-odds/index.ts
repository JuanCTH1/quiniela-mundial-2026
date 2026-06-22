import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Mapeo de nombres de The-Odds-API → nombres en nuestra DB (matches.home_team)
const API_TO_DB: Record<string, string> = {
  'United States':                    'USA',
  'South Korea':                      'Korea Republic',
  'Bosnia and Herzegovina':           'Bosnia-H.',
  'Bosnia-Herzegovina':               'Bosnia-H.',
  "Cote d'Ivoire":                    'Ivory Coast',
  "Côte d'Ivoire":                    'Ivory Coast',
  'DR Congo':                         'Congo DR',
  'Democratic Republic of the Congo': 'Congo DR',
  'Curacao':                          'Curaçao',
  'Czech Republic':                   'Czechia',
}

function mapName(apiName: string): string {
  return API_TO_DB[apiName] ?? apiName
}

Deno.serve(async () => {
  const ODDS_API_KEY = Deno.env.get('ODDS_API_KEY')!

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const res = await fetch(
      `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup_winner/odds/` +
      `?apiKey=${ODDS_API_KEY}&regions=eu&markets=outrights&oddsFormat=decimal`,
    )

    if (!res.ok) throw new Error(`Odds API ${res.status}: ${await res.text()}`)

    const events = await res.json() as Array<{
      bookmakers: Array<{
        markets: Array<{ key: string; outcomes: Array<{ name: string; price: number }> }>
      }>
    }>

    // Acumular todas las cuotas por equipo a través de todas las casas de apuestas
    const allOdds: Record<string, number[]> = {}

    for (const event of events) {
      for (const bm of event.bookmakers ?? []) {
        for (const market of bm.markets ?? []) {
          if (market.key !== 'outrights') continue
          for (const outcome of market.outcomes ?? []) {
            const name = mapName(outcome.name)
            ;(allOdds[name] ??= []).push(outcome.price)
          }
        }
      }
    }

    if (Object.keys(allOdds).length === 0) {
      throw new Error('Sin datos de odds — respuesta vacía de la API')
    }

    // Media de cuotas → probabilidad implícita → normalizar (quitar margen de la casa)
    const implied: Record<string, number> = {}
    for (const [team, odds] of Object.entries(allOdds)) {
      const avg = odds.reduce((a, b) => a + b, 0) / odds.length
      implied[team] = 1 / avg
    }

    const total = Object.values(implied).reduce((a, b) => a + b, 0)
    const now = new Date().toISOString()

    const rows = Object.entries(implied).map(([team_name, imp]) => ({
      team_name,
      probability: parseFloat((imp / total).toFixed(6)),
      updated_at: now,
    }))

    const { error } = await supabase
      .from('team_odds')
      .upsert(rows, { onConflict: 'team_name' })

    if (error) throw error

    const quotaRemaining = res.headers.get('x-requests-remaining') ?? 'unknown'
    const quotaUsed      = res.headers.get('x-requests-used')      ?? 'unknown'

    return Response.json({
      ok: true,
      teams: rows.length,
      quota_remaining: quotaRemaining,
      quota_used: quotaUsed,
      top5: rows
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 5)
        .map(r => ({ team: r.team_name, pct: (r.probability * 100).toFixed(1) + '%' })),
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
})
