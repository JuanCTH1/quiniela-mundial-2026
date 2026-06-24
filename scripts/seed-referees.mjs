// Puebla referee y referee_country en la tabla matches usando football-data.org v4.
// Solo trae árbitros para partidos FINISHED o próximos con árbitro asignado.
// Rate limit: 1 request cada 7 segundos (free tier ~10 req/min).
//
// Uso: node scripts/seed-referees.mjs [--dry-run]

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

// Solo partidos FINISHED o scheduled dentro de los próximos 10 días (los demás no tendrán árbitro)
const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString()

const { data: matches, error } = await supabase
  .from('matches')
  .select('id, external_id, home_team, away_team, status, referee')
  .not('external_id', 'is', null)
  .or(`status.eq.FINISHED,and(status.eq.SCHEDULED,scheduled_time.lte.${tenDaysFromNow})`)
  .is('referee', null) // solo los que no tienen árbitro aún
  .order('scheduled_time')

if (error) { console.error(error.message); process.exit(1) }
console.log(`Partidos a procesar: ${matches.length}\n`)

let found = 0, missing = 0, failed = 0

for (let i = 0; i < matches.length; i++) {
  const m = matches[i]
  const label = `${m.home_team ?? 'TBD'} vs ${m.away_team ?? 'TBD'} (${m.external_id})`
  process.stdout.write(`[${i + 1}/${matches.length}] ${label}… `)

  try {
    const r = await fetch(`https://api.football-data.org/v4/matches/${m.external_id}`, {
      headers: { 'X-Auth-Token': env.FOOTBALL_DATA_API_KEY },
    })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const d = await r.json()

    // Tomar el árbitro principal (type = 'REFEREE')
    const ref = (d.referees ?? []).find(r => r.type === 'REFEREE') ?? d.referees?.[0]

    if (!ref) {
      process.stdout.write(`sin árbitro asignado\n`)
      missing++
    } else {
      process.stdout.write(`→ ${ref.name} (${ref.nationality ?? '?'})\n`)
      found++
      if (!DRY_RUN) {
        const { error: updErr } = await supabase
          .from('matches')
          .update({ referee: ref.name, referee_country: ref.nationality ?? null })
          .eq('id', m.id)
        if (updErr) throw updErr
      }
    }
  } catch (e) {
    process.stdout.write(`error: ${e.message}\n`)
    failed++
  }

  if (i < matches.length - 1) await new Promise(r => setTimeout(r, 7000))
}

console.log(`\nListo. Con árbitro: ${found} · Sin árbitro: ${missing} · Errores: ${failed}`)
if (DRY_RUN) console.log('(dry-run — nada escrito a DB)')
