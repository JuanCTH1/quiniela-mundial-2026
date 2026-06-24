// Siembra datos históricos de H2H en Mundiales para nuevos matchups (knockouts).
// Usa Claude API + web_search para buscar el historial.
// Solo inserta registros que no existan ya (idempotente por team_a+team_b+year).
//
// Uso:
//   node scripts/seed-h2h.mjs --home "France" --away "Argentina"
//   node scripts/seed-h2h.mjs --home "France" --away "Argentina" --dry-run
//   node scripts/seed-h2h.mjs --match-id "uuid-del-partido"   # busca teams del partido

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const DRY_RUN   = process.argv.includes('--dry-run')
const homeArg   = process.argv.indexOf('--home')
const awayArg   = process.argv.indexOf('--away')
const matchArg  = process.argv.indexOf('--match-id')

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

let homeTeam, awayTeam

if (matchArg !== -1) {
  const matchId = process.argv[matchArg + 1]
  const { data, error } = await supabase
    .from('matches').select('home_team, away_team').eq('id', matchId).single()
  if (error || !data) { console.error('Partido no encontrado:', error?.message); process.exit(1) }
  homeTeam = data.home_team
  awayTeam = data.away_team
} else if (homeArg !== -1 && awayArg !== -1) {
  homeTeam = process.argv[homeArg + 1]
  awayTeam = process.argv[awayArg + 1]
} else {
  console.error('Uso: --home "Team A" --away "Team B"  o  --match-id <uuid>')
  process.exit(1)
}

const teamA = homeTeam < awayTeam ? homeTeam : awayTeam
const teamB = homeTeam < awayTeam ? awayTeam : homeTeam

console.log(`\nBuscando historial WC: ${teamA} vs ${teamB}…\n`)

const { data: existing } = await supabase
  .from('h2h_history')
  .select('year')
  .eq('team_a', teamA)
  .eq('team_b', teamB)

const existingYears = new Set((existing ?? []).map(r => r.year))
if (existingYears.size) {
  console.log(`Ya hay ${existingYears.size} partido(s) en DB para este par: ${[...existingYears].join(', ')}`)
}

const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search' }

const prompt = `Search the web for ALL historical FIFA World Cup matches between ${teamA} and ${teamB} (including predecessor nations if applicable, e.g. West Germany counts as Germany, Czechoslovakia counts as Czechia).

Find every single World Cup match they have played against each other, from 1930 to the present.

Return ONLY a valid JSON array (no markdown, no extra text). Each element must have:
- "year": number (e.g. 1998)
- "stage": string (e.g. "Group stage", "Round of 16", "Quarterfinal", "Semifinal", "Final")
- "team_a_goals": number (goals scored by ${teamA}, or its predecessor)
- "team_b_goals": number (goals scored by ${teamB}, or its predecessor)

If they have NEVER met at a World Cup, return an empty array: []

Example:
[{"year":1998,"stage":"Group stage","team_a_goals":3,"team_b_goals":0}]`

const messages = [{ role: 'user', content: prompt }]
let iterations = 0
let matches = null

while (iterations < 6) {
  iterations++
  const response = await anthropic.messages.create(
    { model: 'claude-sonnet-4-6', max_tokens: 1024, tools: [WEB_SEARCH_TOOL], messages },
    { headers: { 'anthropic-beta': 'web-search-2025-03-05' } },
  )

  if (response.stop_reason === 'end_turn') {
    const text = response.content.filter(b => b.type === 'text').at(-1)?.text?.trim() ?? ''
    try {
      const raw = text.match(/\[[\s\S]*?\]/)?.[0] ?? text
      matches = JSON.parse(raw)
      break
    } catch {
      console.error('JSON inválido recibido:', text.slice(0, 200))
      process.exit(1)
    }
  }

  if (response.stop_reason === 'tool_use') {
    messages.push({ role: 'assistant', content: response.content })
    messages.push({
      role: 'user',
      content: response.content
        .filter(b => b.type === 'tool_use')
        .map(b => ({ type: 'tool_result', tool_use_id: b.id, content: '(search executed)' })),
    })
    continue
  }
  break
}

if (!matches) { console.error('No se pudo obtener respuesta del modelo.'); process.exit(1) }

if (matches.length === 0) {
  console.log(`Sin historial en Mundiales — nada que insertar.`)
  process.exit(0)
}

console.log(`Encontrados ${matches.length} partido(s) histórico(s):\n`)

let inserted = 0, skipped = 0

for (const m of matches) {
  const label = `${m.year} ${m.stage}: ${teamA} ${m.team_a_goals}-${m.team_b_goals} ${teamB}`

  if (existingYears.has(m.year)) {
    console.log(`  SKIP  ${label} (ya existe)`)
    skipped++
    continue
  }

  if (DRY_RUN) {
    console.log(`  DRY   ${label}`)
    inserted++
    continue
  }

  const { error } = await supabase.from('h2h_history').insert({
    team_a: teamA,
    team_b: teamB,
    team_a_goals: m.team_a_goals,
    team_b_goals: m.team_b_goals,
    year: m.year,
    stage: m.stage,
    tournament: 'FIFA World Cup',
  })

  if (error) {
    console.log(`  ERROR ${label}: ${error.message}`)
  } else {
    console.log(`  OK    ${label}`)
    inserted++
  }
}

console.log(`\nListo. Insertados: ${inserted} · Omitidos: ${skipped}${DRY_RUN ? ' [dry-run]' : ''}`)
