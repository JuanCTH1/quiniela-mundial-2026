import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STAGE_LABEL: Record<string, string> = {
  GROUP: 'Fase de grupos', GROUP_STAGE: 'Fase de grupos',
  LAST_32: 'Ronda de 32', ROUND_OF_16: 'Octavos de final', LAST_16: 'Octavos de final',
  QUARTER_FINALS: 'Cuartos de final', SEMI_FINALS: 'Semifinal',
  THIRD_PLACE: 'Tercer puesto', FINAL: 'Final',
}

type Fact = { category: string; body: string }

async function callWithSearch(apiKey: string, prompt: string): Promise<Fact[]> {
  const messages: unknown[] = [{ role: 'user', content: prompt }]

  for (let i = 0; i < 6; i++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages,
      }),
    })

    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
    const data = await res.json() as Record<string, unknown>
    const content = data.content as Array<Record<string, unknown>>

    if (data.stop_reason === 'end_turn') {
      const text = content.filter(b => b.type === 'text').at(-1)?.text as string ?? ''
      const raw = text.trim().match(/\[[\s\S]*?\]/)?.[0] ?? text.trim()
      return JSON.parse(raw) as Fact[]
    }

    if (data.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content })
      messages.push({
        role: 'user',
        content: content
          .filter(b => b.type === 'tool_use')
          .map(b => ({ type: 'tool_result', tool_use_id: b.id, content: '(search executed)' })),
      })
      continue
    }
    break
  }
  throw new Error('Loop agotado sin respuesta')
}

Deno.serve(async () => {
  const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')
  if (!ANTHROPIC_KEY) return Response.json({ ok: false, error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: allMatches, error: mErr } = await supabase
    .from('matches')
    .select('id, home_team, away_team, stage, group_name, scheduled_time')
    .eq('status', 'SCHEDULED')
    .not('home_team', 'like', 'TBD%')
    .not('away_team', 'like', 'TBD%')
    .order('scheduled_time', { ascending: true })

  if (mErr) return Response.json({ ok: false, error: mErr.message }, { status: 500 })

  const { data: existingFacts } = await supabase.from('match_facts').select('match_id')
  const withFacts = new Set((existingFacts ?? []).map((f: { match_id: string }) => f.match_id))

  const pending = (allMatches ?? []).filter(m => !withFacts.has(m.id))

  if (pending.length === 0) return Response.json({ ok: true, generated: 0, message: 'Nada nuevo' })

  const { data: meta } = await supabase
    .from('team_metadata')
    .select('team_name, coach, avg_age')

  const metaMap = Object.fromEntries((meta ?? []).map(t => [t.team_name, t]))
  const today = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })

  let generated = 0, failed = 0
  const errors: string[] = []

  for (const m of pending) {
    try {
      const hm = metaMap[m.home_team]
      const am = metaMap[m.away_team]
      const teamMeta = [hm, am]
        .filter(Boolean)
        .map(t => `${t.team_name}: DT ${t.coach ?? 'desconocido'}, edad promedio ${t.avg_age ?? '?'} años`)
        .join(' | ')

      const stage = STAGE_LABEL[m.stage] ?? m.stage
      const group = m.group_name ? ` (Grupo ${m.group_name.replace(/^GROUP_?/, '')})` : ''
      const matchDate = new Date(m.scheduled_time).toLocaleDateString('es-MX', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
      })

      const prompt = `Eres el redactor de datos curiosos para una app de quiniela del Mundial 2026. Hoy es ${today}.

PARTIDO: ${m.home_team} vs ${m.away_team} — ${stage}${group}
📅 Partido programado: ${matchDate}

DATOS CONFIRMADOS:
${teamMeta ? `- ${teamMeta}` : '- (sin metadata de equipos)'}

INSTRUCCIONES:
1. Usa web_search para buscar información específica sobre este partido en el Mundial 2026.
2. Escribe exactamente 3 datos curiosos verificados. No inventes nada.

FORMATO — cada "body" máximo 130 caracteres (1-2 oraciones cortas y directas):
- BIEN: "España no ha perdido un partido de grupo en los últimos 4 Mundiales."
- MAL: "España, una de las selecciones más dominantes del fútbol europeo, ha demostrado..."

Devuelve ÚNICAMENTE un JSON array válido (sin markdown, sin backticks, sin texto extra):
[
  {"category": "historico", "body": "Hecho sobre historial entre estos equipos. Máx 130 chars."},
  {"category": "jugador", "body": "Jugador clave concreto: nombre + stat verificado. Máx 130 chars."},
  {"category": "narrativo", "body": "Contexto del partido o lo que está en juego. Máx 130 chars."}
]`

      const facts = await callWithSearch(ANTHROPIC_KEY, prompt)
      if (!Array.isArray(facts) || facts.length < 1) throw new Error(`facts inválidos`)

      const rows = facts.slice(0, 3).map((f, i) => ({
        match_id: m.id, category: f.category, body: f.body, position: i, reviewed: true,
      }))

      const { error: iErr } = await supabase.from('match_facts').insert(rows)
      if (iErr) throw iErr

      generated++
      await new Promise(r => setTimeout(r, 2000))

    } catch (e) {
      failed++
      errors.push(`${m.home_team} vs ${m.away_team}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return Response.json({ ok: true, generated, failed, ...(errors.length ? { errors } : {}) })
})
