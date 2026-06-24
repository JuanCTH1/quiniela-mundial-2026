import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  'Cape Verde Islands':               'Cape Verde',
  'Cape Verde':                       'Cape Verde',
}
function mapName(n: string): string { return API_TO_DB[n] ?? n }

Deno.serve(async () => {
  const FOOTBALL_DATA_KEY = Deno.env.get('FOOTBALL_DATA_API_KEY')!
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const res = await fetch(
      'https://api.football-data.org/v4/competitions/WC/scorers?limit=100',
      { headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY } },
    )
    if (!res.ok) throw new Error(`football-data.org ${res.status}: ${await res.text()}`)

    const { scorers } = await res.json() as {
      scorers: Array<{
        player: { name: string }
        team: { name: string }
        goals: number
        assists: number | null
      }>
    }

    const rows = scorers
      .map(s => ({
        team_name:   mapName(s.team?.name ?? ''),
        player_name: s.player?.name ?? '',
        goals:       s.goals   ?? 0,
        assists:     s.assists ?? 0,
        updated_at:  new Date().toISOString(),
      }))
      .filter(r => r.team_name && r.player_name)

    const { error } = await supabase
      .from('player_stats')
      .upsert(rows, { onConflict: 'team_name,player_name' })

    if (error) throw error

    return Response.json({ ok: true, synced: rows.length })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
})
