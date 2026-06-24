// Genera 3 datos curiosos por partido usando Claude Sonnet con web search nativo.
// Claude busca en internet antes de escribir cada fact — no inventa de memoria.
// Almacena con reviewed = false (requieren aprobación manual antes de mostrarse).
//
// Uso:
//   node scripts/generate-facts.mjs              # todos los sin facts
//   node scripts/generate-facts.mjs --limit 3    # solo 3 partidos (prueba)
//   node scripts/generate-facts.mjs --match-id UUID  # un partido específico
//   node scripts/generate-facts.mjs --dry-run    # muestra respuesta, no escribe

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// ── Env ──────────────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const DRY_RUN  = process.argv.includes('--dry-run')
const FORCE    = process.argv.includes('--force')   // borra facts existentes y regenera
const limitArg = process.argv.indexOf('--limit')
const LIMIT    = limitArg !== -1 ? parseInt(process.argv[limitArg + 1]) : Infinity
const matchArg = process.argv.indexOf('--match-id')
const MATCH_ID = matchArg !== -1 ? process.argv[matchArg + 1] : null

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

// ── Cargar partidos elegibles ─────────────────────────────────────────────────
let query = supabase
  .from('matches')
  .select('id, home_team, away_team, stage, group_name, scheduled_time, status, home_score_quiniela, away_score_quiniela')
  .not('home_team', 'is', null)
  .not('away_team', 'is', null)
  .not('home_team', 'like', 'TBD%')
  .not('away_team', 'is', null)
  .order('scheduled_time', { ascending: true })

if (MATCH_ID) query = query.eq('id', MATCH_ID)

const { data: allMatches, error: mErr } = await query
if (mErr) { console.error('Error leyendo matches:', mErr.message); process.exit(1) }

// Partidos que ya tienen facts → saltarlos
const { data: existingFacts } = await supabase.from('match_facts').select('match_id')
const withFacts = new Set((existingFacts ?? []).map(f => f.match_id))

const matches = allMatches
  .filter(m => (FORCE || !withFacts.has(m.id))
    && m.away_team && !m.away_team.startsWith('TBD')
    && m.status === 'SCHEDULED')   // solo partidos que aún no se jugaron
  .slice(0, LIMIT)

console.log(`Partidos a procesar: ${matches.length} (${withFacts.size} ya tienen facts)\n`)
if (matches.length === 0) { console.log('Nada que hacer.'); process.exit(0) }

// ── Cargar contexto del grupo por partido ─────────────────────────────────────
async function loadGroupContext(match) {
  if (!match.group_name) return null
  const { data: groupMatches } = await supabase
    .from('matches')
    .select('home_team, away_team, home_score_quiniela, away_score_quiniela, status')
    .eq('group_name', match.group_name)
    .eq('status', 'FINISHED')
  if (!groupMatches?.length) return null

  // Calcular mini-tabla del grupo
  const pts = {}
  for (const m of groupMatches) {
    pts[m.home_team] ??= { pts: 0, gf: 0, gc: 0 }
    pts[m.away_team] ??= { pts: 0, gf: 0, gc: 0 }
    if (m.home_score_quiniela == null) continue
    const hg = m.home_score_quiniela, ag = m.away_score_quiniela
    pts[m.home_team].gf += hg; pts[m.home_team].gc += ag
    pts[m.away_team].gf += ag; pts[m.away_team].gc += hg
    if (hg > ag) { pts[m.home_team].pts += 3 }
    else if (hg === ag) { pts[m.home_team].pts += 1; pts[m.away_team].pts += 1 }
    else { pts[m.away_team].pts += 3 }
  }
  const table = Object.entries(pts)
    .sort((a, b) => b[1].pts - a[1].pts || (b[1].gf - b[1].gc) - (a[1].gf - a[1].gc))
    .map(([t, s], i) => `${i + 1}. ${t} — ${s.pts}pts (${s.gf}-${s.gc})`)
    .join(', ')

  const groupLetter = match.group_name.replace(/^GROUP_?/, '')
  return `Tabla actual Grupo ${groupLetter}: ${table}`
}

// ── Cargar metadata de equipos ────────────────────────────────────────────────
async function loadTeamMeta(homeTeam, awayTeam) {
  const { data } = await supabase
    .from('team_metadata')
    .select('team_name, coach, avg_age')
    .in('team_name', [homeTeam, awayTeam])
  if (!data) return ''
  return data.map(t =>
    `${t.team_name}: DT ${t.coach ?? 'desconocido'}, edad promedio plantel ${t.avg_age ?? '?'} años`
  ).join(' | ')
}

// ── Mapeo de stage ────────────────────────────────────────────────────────────
const STAGE_LABEL = {
  GROUP: 'Fase de grupos', GROUP_STAGE: 'Fase de grupos',
  LAST_32: 'Ronda de 32', ROUND_OF_16: 'Octavos de final', LAST_16: 'Octavos de final',
  QUARTER_FINALS: 'Cuartos de final', SEMI_FINALS: 'Semifinal',
  THIRD_PLACE: 'Tercer puesto', FINAL: 'Final',
}

// ── Construir prompt ──────────────────────────────────────────────────────────
function buildPrompt(match, groupContext, teamMeta) {
  const stage = STAGE_LABEL[match.stage] ?? match.stage
  const groupLetter = match.group_name ? match.group_name.replace(/^GROUP_?/, '') : null
  const group = groupLetter ? ` (Grupo ${groupLetter})` : ''
  const matchDate = new Date(match.scheduled_time).toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })

  const isFinished = match.status === 'FINISHED' && match.home_score_quiniela != null
  const resultLine = isFinished
    ? `\n🏁 PARTIDO FINALIZADO — Resultado: ${match.home_team} ${match.home_score_quiniela}-${match.away_score_quiniela} ${match.away_team}`
    : `\n📅 Partido programado: ${matchDate}`
  const tenseInstruction = isFinished
    ? 'El partido YA SE JUGÓ. Escribe TODOS los datos en pasado (ganó, marcó, fue, logró). NUNCA uses futuro ni presente habitual.'
    : 'El partido AÚN NO SE HA JUGADO. Escribe en presente o futuro próximo según corresponda.'

  return `Eres el redactor de datos curiosos para una app de quiniela del Mundial 2026. Hoy es ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}.

PARTIDO: ${match.home_team} vs ${match.away_team} — ${stage}${group}${resultLine}

DATOS CONFIRMADOS (usa estos como base):
${teamMeta ? `- ${teamMeta}` : '- (sin metadata de equipos)'}
${groupContext ? `- ${groupContext}` : ''}

${tenseInstruction}

INSTRUCCIONES:
1. Usa web_search para buscar información específica sobre este partido. Busca al menos:
   - Historial de enfrentamientos entre ${match.home_team} y ${match.away_team} en Mundiales
   - Jugador clave o momento destacado de este partido en el Mundial 2026
2. Escribe exactamente 3 datos curiosos basados en lo que encuentres. No inventes nada.
3. Si no encuentras algo confiable, escribe sobre lo que sí encontraste.

FORMATO — CRÍTICO: cada "body" debe tener máximo 130 caracteres (1-2 oraciones cortas y directas).
- BIEN: "España no ha perdido un partido de grupo en los últimos 4 Mundiales."
- MAL: "España, una de las selecciones más dominantes del fútbol europeo, ha demostrado consistentemente su capacidad para no perder en fase de grupos durante las últimas 4 ediciones del Mundial."

Devuelve ÚNICAMENTE un JSON array válido (sin markdown, sin backticks, sin texto extra):
[
  {"category": "historico", "body": "Hecho sobre el historial entre estos equipos. Máx 130 chars."},
  {"category": "jugador", "body": "Jugador clave concreto: nombre + stat o hecho verificado. Máx 130 chars."},
  {"category": "narrativo", "body": "Contexto del partido o lo que estaba en juego. Máx 130 chars."}
]`
}

// ── Llamada a Claude con herramienta web search y loop de tool_use ────────────
const WEB_SEARCH_TOOL = {
  type: 'web_search_20250305',
  name: 'web_search',
}

async function callWithSearch(prompt) {
  const messages = [{ role: 'user', content: prompt }]
  let iterations = 0

  while (iterations < 6) {
    iterations++
    const response = await anthropic.messages.create(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        tools: [WEB_SEARCH_TOOL],
        messages,
      },
      { headers: { 'anthropic-beta': 'web-search-2025-03-05' } },
    )

    if (response.stop_reason === 'end_turn') {
      // Extraer el texto final (puede ser el único bloque o el último de varios)
      const textBlocks = response.content.filter(b => b.type === 'text')
      const raw = textBlocks[textBlocks.length - 1]?.text?.trim() ?? ''
      return raw
    }

    if (response.stop_reason === 'tool_use') {
      // Añadir respuesta del asistente a la conversación
      messages.push({ role: 'assistant', content: response.content })
      // Los resultados de las búsquedas ya vienen en el response.content como
      // bloques tool_result cuando se usa web_search nativo — solo continuamos
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
  throw new Error('Loop de tool_use agotado sin respuesta final')
}

// ── Parsear JSON del output de Claude ────────────────────────────────────────
function parseFacts(raw) {
  try { return JSON.parse(raw) } catch { /* intenta extraer */ }
  const m = raw.match(/\[[\s\S]*?\]/)
  if (m) return JSON.parse(m[0])
  throw new Error(`JSON inválido: ${raw.slice(0, 120)}`)
}

// ── Procesar cada partido ─────────────────────────────────────────────────────
let ok = 0, failed = 0

for (const m of matches) {
  const label = `${m.home_team} vs ${m.away_team}`
  process.stdout.write(`${label}… `)

  try {
    // En modo --force, borrar facts existentes antes de regenerar
    if (FORCE && withFacts.has(m.id)) {
      await supabase.from('match_facts').delete().eq('match_id', m.id)
    }

    const [groupContext, teamMeta] = await Promise.all([
      loadGroupContext(m),
      loadTeamMeta(m.home_team, m.away_team),
    ])

    const prompt = buildPrompt(m, groupContext, teamMeta)
    if (DRY_RUN) { console.log('\n── PROMPT ──\n' + prompt + '\n'); ok++; continue }

    const raw = await callWithSearch(prompt)
    const facts = parseFacts(raw)

    if (!Array.isArray(facts) || facts.length !== 3) {
      throw new Error(`Se esperaban 3 facts, llegaron ${facts?.length ?? 0}`)
    }

    const rows = facts.map((f, i) => ({
      match_id: m.id, category: f.category, body: f.body, position: i, reviewed: false,
    }))

    const { error } = await supabase.from('match_facts').insert(rows)
    if (error) throw error

    process.stdout.write(`✓\n`)
    ok++
  } catch (e) {
    process.stdout.write(`✗ ${e.message}\n`)
    failed++
  }

  // Pausa entre partidos para no saturar la API
  if (matches.indexOf(m) < matches.length - 1) {
    await new Promise(r => setTimeout(r, 2000))
  }
}

console.log(`\nListo. OK: ${ok} · Fallidos: ${failed}`)
