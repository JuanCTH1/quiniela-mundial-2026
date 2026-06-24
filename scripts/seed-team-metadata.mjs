// Puebla team_metadata con coach y edad promedio del plantel para los 48 equipos del WC.
// Fuente: football-data.org /v4/competitions/WC/teams (1 sola request, no hay paginación).
// avg_height queda null — el free tier no incluye datos de altura.
//
// Uso: node scripts/seed-team-metadata.mjs [--dry-run]

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// ── Env ──────────────────────────────────────────────────────────────────────
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

// ── Mapeo API → nombre en nuestra DB (mismo que update-odds) ─────────────────
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

// ── Calcular edad promedio desde dateOfBirth ──────────────────────────────────
function avgAge(squad) {
  const today = new Date()
  const ages = squad
    .filter(p => p.dateOfBirth)
    .map(p => {
      const dob = new Date(p.dateOfBirth)
      const years = (today - dob) / (365.25 * 24 * 3600 * 1000)
      return years
    })
    .filter(y => y > 15 && y < 50) // filtrar datos raros
  if (ages.length === 0) return null
  return parseFloat((ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1))
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
console.log('Obteniendo equipos de football-data.org…')
const r = await fetch('https://api.football-data.org/v4/competitions/WC/teams', {
  headers: { 'X-Auth-Token': env.FOOTBALL_DATA_API_KEY },
})
if (!r.ok) { console.error(`API error: ${r.status}`); process.exit(1) }

const { teams } = await r.json()
console.log(`${teams.length} equipos recibidos\n`)

// ── Construir rows ────────────────────────────────────────────────────────────
const rows = teams.map(t => ({
  team_name: mapName(t.name),
  coach: t.coach?.name ?? null,
  avg_age: avgAge(t.squad ?? []),
  avg_height: null, // no disponible en free tier
  updated_at: new Date().toISOString(),
}))

if (DRY_RUN) {
  console.log('── Dry run ──────────────────────────────────────────────────────')
  rows.forEach(r => {
    console.log(`${r.team_name.padEnd(25)} DT: ${(r.coach ?? 'sin datos').padEnd(30)} edad: ${r.avg_age ?? '-'}`)
  })
  console.log(`\n${rows.length} equipos. Vuelve sin --dry-run para aplicar.`)
  process.exit(0)
}

// ── Upsert ────────────────────────────────────────────────────────────────────
const { error } = await supabase
  .from('team_metadata')
  .upsert(rows, { onConflict: 'team_name' })

if (error) { console.error('Error en upsert:', error.message); process.exit(1) }

console.log(`✓ ${rows.length} equipos guardados en team_metadata`)
rows.forEach(r => {
  console.log(`  ${r.team_name.padEnd(25)} ${(r.coach ?? 'sin DT').padEnd(30)} edad prom: ${r.avg_age ?? '-'}`)
})
