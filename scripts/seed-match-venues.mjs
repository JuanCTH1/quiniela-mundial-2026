// Asigna venues a partidos llamando el endpoint individual de football-data.org v4,
// que sí incluye el campo `venue` (el bulk /competitions/WC/matches lo omite).
// Llama en lotes de 6 con pausa de 7s entre lotes (~10 req/min, dentro del free tier).
//
// Uso: node scripts/seed-match-venues.mjs [--dry-run]

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

// ── Mapeo: nombre corto de la API → nombre exacto en nuestra tabla venues ─────
// La API devuelve nombres cortos (ej. "Azteca", "AT&T", "MetLife").
// Añadir aquí si el script reporta venues sin resolver.
const VENUE_MAP = {
  // México
  'azteca':                          'Estadio Azteca',
  'estadio azteca':                  'Estadio Azteca',
  'bbva':                            'Estadio BBVA',
  'estadio bbva':                    'Estadio BBVA',
  'akron':                           'Estadio Akron',
  'estadio akron':                   'Estadio Akron',
  // EE.UU.
  'at&t':                            'AT&T Stadium',
  'att stadium':                     'AT&T Stadium',
  'at&t stadium':                    'AT&T Stadium',
  'metlife':                         'MetLife Stadium',
  'metlife stadium':                 'MetLife Stadium',
  'sofi':                            'SoFi Stadium',
  'sofi stadium':                    'SoFi Stadium',
  'nrg':                             'NRG Stadium',
  'nrg stadium':                     'NRG Stadium',
  'hard rock':                       'Hard Rock Stadium',
  'hard rock stadium':               'Hard Rock Stadium',
  'gillette':                        'Gillette Stadium',
  'gillette stadium':                'Gillette Stadium',
  'arrowhead':                       'Arrowhead Stadium',
  'arrowhead stadium':               'Arrowhead Stadium',
  'lincoln financial':               'Lincoln Financial Field',
  'lincoln financial field':         'Lincoln Financial Field',
  'levi\'s':                         "Levi's Stadium",
  'levis':                           "Levi's Stadium",
  'lumen':                           'Lumen Field',
  'lumen field':                     'Lumen Field',
  'mercedes-benz':                   'Mercedes-Benz Stadium',
  'mercedes benz':                   'Mercedes-Benz Stadium',
  'mercedes-benz stadium':           'Mercedes-Benz Stadium',
  'empower field':                   'Empower Field at Mile High',
  'empower':                         'Empower Field at Mile High',
  'rose bowl':                       'Rose Bowl Stadium',
  'la memorial coliseum':            'Los Angeles Memorial Coliseum',
  'memorial coliseum':               'Los Angeles Memorial Coliseum',
  // Canadá
  'bmo field':                       'BMO Field',
  'bmo':                             'BMO Field',
  'bc place':                        'BC Place',
}

function resolveVenue(apiName, dbVenues) {
  if (!apiName) return null
  const n = apiName.toLowerCase().trim()
  // 1. Mapa explícito
  const mapped = VENUE_MAP[n]
  if (mapped) return dbVenues.find(v => v.name === mapped) ?? null
  // 2. Partial match contra nombres en DB
  const match = dbVenues.find(v => n.includes(v.name.toLowerCase()) || v.name.toLowerCase().includes(n))
  return match ?? null
}

// ── Cargar matches de nuestra DB ──────────────────────────────────────────────
const { data: dbMatches, error: mErr } = await supabase
  .from('matches')
  .select('id, external_id, home_team, away_team, venue_id')
if (mErr) { console.error('Error leyendo matches:', mErr.message); process.exit(1) }

const toFetch = dbMatches.filter(m => !m.venue_id && m.external_id)
const alreadySet = dbMatches.filter(m => m.venue_id).length
console.log(`Matches a procesar: ${toFetch.length} · Ya con venue: ${alreadySet}`)

if (toFetch.length === 0) {
  console.log('Nada que hacer.')
  process.exit(0)
}

// ── Cargar venues de DB ───────────────────────────────────────────────────────
const { data: dbVenues, error: vErr } = await supabase.from('venues').select('id, name')
if (vErr) { console.error('Error leyendo venues:', vErr.message); process.exit(1) }

// ── Fetch secuencial con 7s entre cada llamada (~8 req/min, bajo el límite free) ──
const PAUSE_MS = 7000

const results = [] // { dbId, venueId, venueName, apiVenue, matchLabel }
const unresolved = []
const noVenueApi = []

for (let i = 0; i < toFetch.length; i++) {
  const m = toFetch[i]
  const label = `${m.home_team ?? '?'} vs ${m.away_team ?? '?'} (${m.external_id})`
  process.stdout.write(`[${i + 1}/${toFetch.length}] ${label}… `)

  try {
    const r = await fetch(`https://api.football-data.org/v4/matches/${m.external_id}`, {
      headers: { 'X-Auth-Token': env.FOOTBALL_DATA_API_KEY },
    })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const d = await r.json()
    const apiVenue = d.venue ?? null

    if (!apiVenue) {
      process.stdout.write(`sin venue\n`)
      noVenueApi.push(label)
    } else {
      const venue = resolveVenue(apiVenue, dbVenues)
      if (!venue) {
        process.stdout.write(`⚠ no resuelto: "${apiVenue}"\n`)
        unresolved.push(`"${apiVenue}" — ${label}`)
      } else {
        process.stdout.write(`→ ${venue.name}\n`)
        results.push({ dbId: m.id, venueId: venue.id, venueName: venue.name, apiVenue, matchLabel: label })
      }
    }
  } catch (e) {
    process.stdout.write(`error: ${e.message}\n`)
    noVenueApi.push(`${label} [${e.message}]`)
  }

  if (i < toFetch.length - 1) await new Promise(r => setTimeout(r, PAUSE_MS))
}

// ── Reporte ───────────────────────────────────────────────────────────────────
console.log(`\n── Resumen ─────────────────────────────────────────────────────`)
console.log(`Resueltos:        ${results.length}`)
console.log(`Sin venue en API: ${noVenueApi.length}`)
console.log(`No resueltos:     ${unresolved.length}`)

if (unresolved.length) {
  console.log('\n⚠ VENUES NO RESUELTOS (agregar a VENUE_MAP):')
  unresolved.forEach(u => console.log('  -', u))
}
if (noVenueApi.length) {
  console.log('\n⚠ Sin venue en API (probablemente partidos de eliminatoria sin definir):')
  noVenueApi.slice(0, 10).forEach(u => console.log('  -', u))
  if (noVenueApi.length > 10) console.log(`  … y ${noVenueApi.length - 10} más`)
}

if (DRY_RUN) {
  console.log('\n── Se asignaría ────────────────────────────────────────────────')
  results.forEach(r => console.log(`  "${r.venueName}" ← API "${r.apiVenue}" — ${r.matchLabel}`))
  console.log('\nVuelve sin --dry-run para aplicar.')
  process.exit(0)
}

// ── Escribir a DB ─────────────────────────────────────────────────────────────
console.log(`\nAplicando ${results.length} actualizaciones…`)
let done = 0, failed = 0
for (const u of results) {
  const { error } = await supabase.from('matches').update({ venue_id: u.venueId }).eq('id', u.dbId)
  if (error) { console.error(`  ✗ ${u.matchLabel}: ${error.message}`); failed++ }
  else { done++ }
}
console.log(`\nListo. Actualizados: ${done} · Fallidos: ${failed}`)
if (unresolved.length || noVenueApi.length) {
  console.log(`Quedan ${unresolved.length + noVenueApi.length} partidos sin venue — revisa ⚠ arriba.`)
}
