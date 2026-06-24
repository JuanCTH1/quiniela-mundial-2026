// Sincroniza goles y asistencias del Mundial 2026 desde football-data.org.
// Upsertea en player_stats (team_name / player_name únicos).
//
// Uso:
//   node scripts/sync-scorers.mjs          # sync normal
//   node scripts/sync-scorers.mjs --dry-run  # muestra datos, no escribe

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const DRY_RUN = process.argv.includes('--dry-run')

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Mismo mapeo que seed-team-metadata.mjs
const API_TO_DB = {
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
const mapName = n => API_TO_DB[n] ?? n

console.log('Obteniendo goleadores de football-data.org…')

const r = await fetch('https://api.football-data.org/v4/competitions/WC/scorers?limit=100', {
  headers: { 'X-Auth-Token': env.FOOTBALL_DATA_API_KEY },
})
if (!r.ok) {
  console.error(`API error: ${r.status} ${r.statusText}`)
  process.exit(1)
}

const { scorers } = await r.json()
console.log(`${scorers.length} goleadores recibidos\n`)

const rows = scorers.map(s => ({
  team_name:   mapName(s.team?.name ?? ''),
  player_name: s.player?.name ?? '',
  goals:       s.goals   ?? 0,
  assists:     s.assists ?? 0,
  updated_at:  new Date().toISOString(),
})).filter(r => r.team_name && r.player_name)

if (DRY_RUN) {
  console.log('── Dry run ──────────────────────────────────────────────────────')
  rows.forEach(r => {
    console.log(`${r.player_name.padEnd(30)} ${r.team_name.padEnd(25)} ⚽${r.goals}  🅰️${r.assists}`)
  })
  console.log(`\n${rows.length} jugadores. Vuelve sin --dry-run para aplicar.`)
  process.exit(0)
}

const { error } = await supabase
  .from('player_stats')
  .upsert(rows, { onConflict: 'team_name,player_name' })

if (error) { console.error('Error en upsert:', error.message); process.exit(1) }

console.log(`✓ ${rows.length} jugadores sincronizados`)
rows.slice(0, 10).forEach(r => {
  console.log(`  ${r.player_name.padEnd(30)} ${r.team_name.padEnd(25)} ⚽${r.goals}  🅰️${r.assists}`)
})
if (rows.length > 10) console.log(`  … y ${rows.length - 10} más`)
