// Busca árbitros de partidos próximos sin asignación usando Claude + web search.
// Mismo enfoque que generate-facts.mjs: llamada a API con web_search nativo.
// Sin aprobación requerida — árbitro es un dato factual, no editorial.
//
// Uso:
//   node scripts/sync-referees-web.mjs              # partidos sin árbitro en próximos 14 días
//   node scripts/sync-referees-web.mjs --days 7     # limitar ventana de búsqueda
//   node scripts/sync-referees-web.mjs --dry-run    # muestra resultado, no escribe

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const DRY_RUN = process.argv.includes('--dry-run')
const daysArg = process.argv.indexOf('--days')
const DAYS    = daysArg !== -1 ? parseInt(process.argv[daysArg + 1]) : 14

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

const until = new Date()
until.setDate(until.getDate() + DAYS)

const { data: matches, error } = await supabase
  .from('matches')
  .select('id, home_team, away_team, scheduled_time, stage')
  .eq('status', 'SCHEDULED')
  .is('referee', null)
  .not('home_team', 'like', 'TBD%')
  .not('away_team', 'like', 'TBD%')
  .lte('scheduled_time', until.toISOString())
  .order('scheduled_time', { ascending: true })

if (error) { console.error('Error leyendo matches:', error.message); process.exit(1) }
if (!matches?.length) { console.log('Ningún partido sin árbitro en los próximos ' + DAYS + ' días.'); process.exit(0) }

console.log(`Partidos sin árbitro: ${matches.length}\n`)

const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search' }

async function findReferee(homeTeam, awayTeam, scheduledTime) {
  const matchDate = new Date(scheduledTime).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
  const prompt = `Busca en internet el árbitro designado por FIFA para el partido del Mundial 2026: ${homeTeam} vs ${awayTeam} (${matchDate}).

Usa web_search para encontrar la información. Busca en ESPN, FIFA.com, BBC Sport u otras fuentes deportivas confiables.

Devuelve ÚNICAMENTE un JSON válido (sin markdown, sin texto extra):
{"name": "Nombre Completo del Árbitro", "nationality": "País en inglés"}

Si no encuentras el árbitro asignado, devuelve:
{"name": null, "nationality": null}`

  const messages = [{ role: 'user', content: prompt }]
  let iterations = 0

  while (iterations < 5) {
    iterations++
    const response = await anthropic.messages.create(
      { model: 'claude-sonnet-4-6', max_tokens: 256, tools: [WEB_SEARCH_TOOL], messages },
      { headers: { 'anthropic-beta': 'web-search-2025-03-05' } },
    )

    if (response.stop_reason === 'end_turn') {
      const text = response.content.filter(b => b.type === 'text').at(-1)?.text?.trim() ?? ''
      try {
        const raw = text.match(/\{[\s\S]*?\}/)?.[0] ?? text
        return JSON.parse(raw)
      } catch {
        throw new Error(`JSON inválido: ${text.slice(0, 100)}`)
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
  throw new Error('Loop agotado')
}

let found = 0, notFound = 0, failed = 0

for (const m of matches) {
  const label = `${m.home_team} vs ${m.away_team}`
  process.stdout.write(`${label}… `)

  try {
    const result = await findReferee(m.home_team, m.away_team, m.scheduled_time)

    if (!result.name) {
      process.stdout.write(`sin asignar\n`)
      notFound++
    } else {
      if (!DRY_RUN) {
        const { error: uErr } = await supabase
          .from('matches')
          .update({ referee: result.name, referee_country: result.nationality ?? null })
          .eq('id', m.id)
        if (uErr) throw uErr
      }
      process.stdout.write(`→ ${result.name} (${result.nationality ?? '?'})${DRY_RUN ? ' [dry-run]' : ''}\n`)
      found++
    }
  } catch (e) {
    process.stdout.write(`✗ ${e.message}\n`)
    failed++
  }

  if (matches.indexOf(m) < matches.length - 1) {
    await new Promise(r => setTimeout(r, 1500))
  }
}

console.log(`\nListo. Encontrados: ${found} · Sin asignar aún: ${notFound} · Errores: ${failed}`)
