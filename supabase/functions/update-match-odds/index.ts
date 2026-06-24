import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Mismo mapeo que update-odds
const API_TO_DB: Record<string, string> = {
  'United States':                    'USA',
  'South Korea':                      'Korea Republic',
  'Bosnia and Herzegovina':           'Bosnia-H.',
  'Bosnia-Herzegovina':               'Bosnia-H.',
  'Bosnia & Herzegovina':             'Bosnia-H.',
  "Cote d'Ivoire":                    'Ivory Coast',
  "Côte d'Ivoire":                    'Ivory Coast',
  'DR Congo':                         'Congo DR',
  'Democratic Republic of the Congo': 'Congo DR',
  'Curacao':                          'Curaçao',
  'Czech Republic':                   'Czechia',
  'Cape Verde Islands':               'Cape Verde',
}
function mapName(n: string): string { return API_TO_DB[n] ?? n }

Deno.serve(async () => {
  const ODDS_API_KEY = Deno.env.get('ODDS_API_KEY')!
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    // h2h market: devuelve moneyline (1X2) por partido próximo del Mundial
    const res = await fetch(
      `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/` +
      `?apiKey=${ODDS_API_KEY}&regions=eu&markets=h2h&oddsFormat=decimal`,
    )
    if (!res.ok) throw new Error(`Odds API ${res.status}: ${await res.text()}`)

    const events = await res.json() as Array<{
      id: string
      home_team: string
      away_team: string
      bookmakers: Array<{
        markets: Array<{
          key: string
          outcomes: Array<{ name: string; price: number }>
        }>
      }>
    }>

    if (events.length === 0) {
      return Response.json({ ok: true, matches: 0, note: 'Sin eventos activos' })
    }

    // Cargar partidos de nuestra DB para cruzar por nombre
    const { data: dbMatches } = await supabase
      .from('matches')
      .select('id, home_team, away_team')
      .eq('status', 'SCHEDULED')

    const matchIndex: Record<string, string> = {}
    for (const m of dbMatches ?? []) {
      matchIndex[`${m.home_team}__${m.away_team}`] = m.id
      matchIndex[`${m.away_team}__${m.home_team}`] = m.id // por si la API invierte
    }

    const upserted: string[] = []
    const skipped: string[] = []

    for (const event of events) {
      const home = mapName(event.home_team)
      const away = mapName(event.away_team)
      const matchId = matchIndex[`${home}__${away}`] ?? matchIndex[`${away}__${home}`]

      if (!matchId) { skipped.push(`${home} vs ${away}`); continue }

      // Acumular probabilidades implícitas de todos los bookmakers
      const probs = { home: [] as number[], draw: [] as number[], away: [] as number[] }
      const homeApiName = event.home_team // comparar contra nombre original de la API

      for (const bm of event.bookmakers ?? []) {
        for (const market of bm.markets ?? []) {
          if (market.key !== 'h2h') continue
          for (const o of market.outcomes ?? []) {
            const imp = 1 / o.price
            if (o.name === homeApiName || mapName(o.name) === home) probs.home.push(imp)
            else if (o.name === 'Draw') probs.draw.push(imp)
            else probs.away.push(imp)
          }
        }
      }

      if (!probs.home.length) { skipped.push(`${home} vs ${away} (sin outcomes)`); continue }

      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b) / arr.length : 0
      const ih = avg(probs.home), id = avg(probs.draw), ia = avg(probs.away)
      const total = ih + id + ia
      if (total === 0) { skipped.push(`${home} vs ${away} (total=0)`); continue }

      const { error } = await supabase.from('match_odds').upsert({
        match_id:   matchId,
        prob_home:  parseFloat((ih / total).toFixed(4)),
        prob_draw:  parseFloat((id / total).toFixed(4)),
        prob_away:  parseFloat((ia / total).toFixed(4)),
        bookmakers: probs.home.length,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'match_id' })

      if (error) throw error
      upserted.push(`${home} vs ${away}`)
    }

    const quotaRemaining = res.headers.get('x-requests-remaining') ?? '?'
    const quotaUsed      = res.headers.get('x-requests-used')      ?? '?'

    return Response.json({
      ok: true,
      upserted: upserted.length,
      skipped: skipped.length,
      quota_remaining: quotaRemaining,
      quota_used: quotaUsed,
      matches: upserted,
      not_matched: skipped,
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
})
