import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 300

async function findReferee(apiKey: string, homeTeam: string, awayTeam: string, date: string): Promise<string | null> {
  const prompt = `Busca el árbitro principal asignado por FIFA para el partido ${homeTeam} vs ${awayTeam} en la Ronda de 32 del Mundial 2026 (${date}). Responde ÚNICAMENTE con JSON: {"referee": "Nombre Apellido"} o {"referee": null} si no encuentras información confirmada.`

  const messages: unknown[] = [{ role: 'user', content: prompt }]

  for (let i = 0; i < 5; i++) {
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
        max_tokens: 512,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Anthropic ${res.status}: ${body}`)
    }
    const data = await res.json() as Record<string, unknown>
    const content = data.content as Array<Record<string, unknown>>

    if (data.stop_reason === 'end_turn') {
      const text = content.filter(b => b.type === 'text').at(-1)?.text as string ?? ''
      const match = text.match(/\{[^{}]*\}/)
      if (!match) return null
      try {
        const parsed = JSON.parse(match[0]) as { referee?: string | null }
        return parsed.referee ?? null
      } catch {
        return null
      }
    }
    // web_search_20250305 is server-side: Anthropic executes the search.
    // Just push the assistant turn and loop — no tool_result needed from our side.
    if (data.stop_reason === 'tool_use' || data.stop_reason === 'server_tool_use') {
      messages.push({ role: 'assistant', content })
      continue
    }
    break
  }
  return null
}

export async function POST() {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_KEY) return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })

  const admin = createAdminClient()
  const now = new Date()
  const in7d = new Date(now.getTime() + 7 * 24 * 3600 * 1000)

  const { data: matches } = await admin
    .from('matches')
    .select('id, home_team, away_team, scheduled_time, stage')
    .eq('status', 'SCHEDULED')
    .is('referee', null)
    .not('home_team', 'like', 'TBD%')
    .not('away_team', 'like', 'TBD%')
    .lte('scheduled_time', in7d.toISOString())
    .gte('scheduled_time', now.toISOString())
    .order('scheduled_time')

  if (!matches?.length) {
    return NextResponse.json({ ok: true, updated: 0, message: 'Sin partidos pendientes de árbitro en 7 días' })
  }

  const results: { match: string; referee: string | null; ok: boolean; reason?: string }[] = []

  for (const m of matches) {
    const date = new Date(m.scheduled_time).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    })
    try {
      const referee = await findReferee(ANTHROPIC_KEY, m.home_team, m.away_team, date)
      if (referee) {
        await admin.from('matches').update({ referee }).eq('id', m.id)
        results.push({ match: `${m.home_team} vs ${m.away_team}`, referee, ok: true })
      } else {
        results.push({ match: `${m.home_team} vs ${m.away_team}`, referee: null, ok: false, reason: 'not_found' })
      }
      await new Promise(r => setTimeout(r, 1000))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      results.push({ match: `${m.home_team} vs ${m.away_team}`, referee: null, ok: false, reason: msg })
    }
  }

  const updated = results.filter(r => r.ok).length
  return NextResponse.json({ ok: true, updated, total: matches.length, results })
}
