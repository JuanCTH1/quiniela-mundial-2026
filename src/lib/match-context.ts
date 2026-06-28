import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { MatchContextData, FormResult } from '@/components/MatchContext'

// Carga los datos de contexto de un partido desde la DB.
// Cada bloque falla de forma aislada (try/catch → null) para que un dato faltante
// nunca tumbe la sección entera. Usa el cliente con RLS: los facts no-revisados
// quedan filtrados por la policy (reviewed = true).
//
// PENDIENTE (ver docs/Feature_Contexto_Partido.md):
//  - stakes: calcular desde standings del grupo
//  - keyPlayers: requiere acumular goleadores/asistentes del torneo en DB

// ISO 3166-1 alpha-2 → flag emoji (solo países frecuentes en arbitraje FIFA)
const COUNTRY_FLAG: Record<string, string> = {
  Argentina: '🇦🇷', Brazil: '🇧🇷', Uruguay: '🇺🇾', Colombia: '🇨🇴', Chile: '🇨🇱',
  Paraguay: '🇵🇾', Peru: '🇵🇪', Venezuela: '🇻🇪', Ecuador: '🇪🇨', Bolivia: '🇧🇴',
  Mexico: '🇲🇽', USA: '🇺🇸', 'United States': '🇺🇸', Canada: '🇨🇦', Costa: '🇨🇷',
  'Costa Rica': '🇨🇷', Panama: '🇵🇦', Honduras: '🇭🇳', Guatemala: '🇬🇹',
  Spain: '🇪🇸', Germany: '🇩🇪', France: '🇫🇷', Italy: '🇮🇹', England: '🇬🇧',
  Portugal: '🇵🇹', Netherlands: '🇳🇱', Belgium: '🇧🇪', Switzerland: '🇨🇭',
  Sweden: '🇸🇪', Norway: '🇳🇴', Denmark: '🇩🇰', Poland: '🇵🇱', Russia: '🇷🇺',
  Ukraine: '🇺🇦', Turkey: '🇹🇷', Romania: '🇷🇴', Croatia: '🇭🇷', Serbia: '🇷🇸',
  Slovakia: '🇸🇰', 'Czech Republic': '🇨🇿', Czechia: '🇨🇿', Austria: '🇦🇹',
  Hungary: '🇭🇺', Greece: '🇬🇷', Scotland: '🇴🇬', Ireland: '🇮🇪',
  Japan: '🇯🇵', 'South Korea': '🇰🇷', China: '🇨🇳', Australia: '🇦🇺',
  'New Zealand': '🇳🇿', Iran: '🇮🇷', 'Saudi Arabia': '🇸🇦', Qatar: '🇶🇦',
  'United Arab Emirates': '🇦🇪', Jordan: '🇯🇴', Bahrain: '🇧🇭', Kuwait: '🇰🇼',
  Nigeria: '🇳🇬', Ghana: '🇬🇭', Morocco: '🇲🇦', Tunisia: '🇹🇳', Egypt: '🇪🇬',
  Senegal: '🇸🇳', Cameroon: '🇨🇲', Algeria: '🇩🇿', 'South Africa': '🇿🇦',
  Kenya: '🇰🇪', Tanzania: '🇹🇿', Zambia: '🇿🇲', Zimbabwe: '🇿🇼',
  'China PR': '🇨🇳', Gabon: '🇬🇦', Mauritania: '🇲🇷', Mali: '🇲🇱', Burkina: '🇧🇫', 'Burkina Faso': '🇧🇫',
  Mozambique: '🇲🇿', Uganda: '🇺🇬', Rwanda: '🇷🇼', Ethiopia: '🇪🇹',
  Slovenia: '🇸🇮', 'Bosnia-Herzegovina': '🇧🇦', 'Bosnia and Herzegovina': '🇧🇦',
  Israel: '🇮🇱', Uzbekistan: '🇺🇿', Kazakhstan: '🇰🇿', Georgia: '🇬🇪',
  Indonesia: '🇮🇩', Thailand: '🇹🇭', Vietnam: '🇻🇳', Malaysia: '🇲🇾',
}

const safe = async <T>(fn: () => Promise<T>): Promise<T | null> => {
  try { return await fn() } catch { return null }
}

export async function getMatchContext(
  matchId: string,
  homeTeam: string,
  awayTeam: string,
): Promise<MatchContextData> {
  const supabase = await createClient()

  // Pre-fetch del match row: venue_id y árbitro en una sola query
  const { data: matchRow } = await supabase
    .from('matches')
    .select('venue_id, referee, referee_country')
    .eq('id', matchId)
    .single()

  const [venue, metadata, odds, facts, form, h2h, stakes, keyPlayers] = await Promise.all([
    // ── Sede ──
    safe(async () => {
      if (!matchRow?.venue_id) return null
      const { data } = await supabase
        .from('venues')
        .select('name, city, country, capacity, surface, opened_year, image_url, latitude, longitude')
        .eq('id', matchRow.venue_id).single()
      if (!data) return null
      return {
        name: data.name, city: data.city, country: data.country,
        capacity: data.capacity, surface: data.surface, openedYear: data.opened_year,
        imageUrl: data.image_url, lat: Number(data.latitude), lng: Number(data.longitude),
      }
    }),

    // ── Metadata de equipos (DT + físicas) ──
    safe(async () => {
      const { data } = await supabase
        .from('team_metadata')
        .select('team_name, coach, avg_height, avg_age')
        .in('team_name', [homeTeam, awayTeam])
      if (!data) return null
      const h = data.find(d => d.team_name === homeTeam)
      const a = data.find(d => d.team_name === awayTeam)
      return { home: h, away: a }
    }),

    // ── Momios ──
    safe(async () => {
      const { data } = await supabase
        .from('match_odds')
        .select('prob_home, prob_draw, prob_away')
        .eq('match_id', matchId).single()
      if (!data || data.prob_home == null) return null
      return { home: Number(data.prob_home), draw: Number(data.prob_draw), away: Number(data.prob_away) }
    }),

    // ── Facts (RLS filtra reviewed = true) ──
    safe(async () => {
      const { data } = await supabase
        .from('match_facts')
        .select('category, body, position')
        .eq('match_id', matchId)
        .order('position', { ascending: true })
      if (!data || data.length === 0) return null
      return data.map(f => ({ category: f.category, body: f.body }))
    }),

    // ── Forma reciente: últimos 5 finalizados de cada equipo ──
    safe(() => computeForm(supabase, homeTeam, awayTeam)),

    // ── H2H: todos los finalizados entre ambos en este torneo ──
    safe(() => computeH2H(supabase, homeTeam, awayTeam)),

    // ── Stakes: qué se juega cada equipo ──
    safe(() => computeStakes(supabase, matchId, homeTeam, awayTeam)),

    // ── Key players: goleador/asistente top por equipo ──
    safe(() => computeKeyPlayers(supabase, homeTeam, awayTeam)),
  ])

  const coaches = metadata && (metadata.home?.coach || metadata.away?.coach)
    ? { home: metadata.home?.coach ?? null, away: metadata.away?.coach ?? null } : null

  const physical = metadata && (metadata.home?.avg_height || metadata.away?.avg_height)
    ? {
        homeHeight: metadata.home?.avg_height != null ? Number(metadata.home.avg_height) : null,
        awayHeight: metadata.away?.avg_height != null ? Number(metadata.away.avg_height) : null,
        homeAge: metadata.home?.avg_age != null ? Number(metadata.home.avg_age) : null,
        awayAge: metadata.away?.avg_age != null ? Number(metadata.away.avg_age) : null,
      } : null

  const referee = matchRow?.referee
    ? {
        name: matchRow.referee,
        country: matchRow.referee_country ?? null,
        flag: matchRow.referee_country ? (COUNTRY_FLAG[matchRow.referee_country] ?? null) : null,
      }
    : null

  return {
    homeTeam, awayTeam,
    stakes, odds, form, h2h, venue, coaches, physical, facts, referee,
    keyPlayers,
  }
}

// Resultado de un partido finalizado desde la perspectiva de `team`
function resultFor(team: string, home: string, away: string, hs: number, as: number): FormResult {
  const isHome = team === home
  const my = isHome ? hs : as
  const opp = isHome ? as : hs
  return my > opp ? 'W' : my < opp ? 'L' : 'D'
}

async function computeForm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  homeTeam: string, awayTeam: string,
): Promise<MatchContextData['form']> {
  const lastFive = async (team: string): Promise<FormResult[]> => {
    const { data } = await supabase
      .from('matches')
      .select('home_team, away_team, home_score_quiniela, away_score_quiniela, scheduled_time')
      .or(`home_team.eq.${team},away_team.eq.${team}`)
      .eq('status', 'FINISHED')
      .order('scheduled_time', { ascending: false })
      .limit(5)
    return (data ?? [])
      .filter(m => m.home_score_quiniela != null && m.away_score_quiniela != null)
      .map(m => resultFor(team, m.home_team, m.away_team, m.home_score_quiniela!, m.away_score_quiniela!))
  }
  const [home, away] = await Promise.all([lastFive(homeTeam), lastFive(awayTeam)])
  if (home.length === 0 && away.length === 0) return null
  return { home, away }
}

async function computeH2H(
  supabase: Awaited<ReturnType<typeof createClient>>,
  homeTeam: string, awayTeam: string,
): Promise<MatchContextData['h2h']> {
  const teamA = homeTeam < awayTeam ? homeTeam : awayTeam
  const teamB = homeTeam < awayTeam ? awayTeam : homeTeam

  const [currentRes, historicalRes] = await Promise.all([
    supabase
      .from('matches')
      .select('home_team, away_team, home_score_fulltime, away_score_fulltime')
      .eq('status', 'FINISHED')
      .or(`and(home_team.eq.${homeTeam},away_team.eq.${awayTeam}),and(home_team.eq.${awayTeam},away_team.eq.${homeTeam})`),
    supabase
      .from('h2h_history')
      .select('team_a, team_b, team_a_goals, team_b_goals')
      .eq('team_a', teamA)
      .eq('team_b', teamB),
  ])

  let homeWins = 0, draws = 0, awayWins = 0

  for (const m of (currentRes.data ?? []).filter(m => m.home_score_fulltime != null && m.away_score_fulltime != null)) {
    const r = resultFor(homeTeam, m.home_team, m.away_team, m.home_score_fulltime!, m.away_score_fulltime!)
    if (r === 'W') homeWins++; else if (r === 'L') awayWins++; else draws++
  }

  for (const h of (historicalRes.data ?? [])) {
    const homeIsA = homeTeam === h.team_a
    const aGoals = h.team_a_goals, bGoals = h.team_b_goals
    if (aGoals > bGoals) { homeIsA ? homeWins++ : awayWins++ }
    else if (aGoals < bGoals) { homeIsA ? awayWins++ : homeWins++ }
    else draws++
  }

  const total = homeWins + draws + awayWins
  if (total === 0) return null
  return { homeWins, draws, awayWins }
}

// ── Stakes: qué se juega cada equipo ──────────────────────────────────────────
// WC 2026: 12 grupos de 4, top 2 clasifican directo + 8 mejores 3ros pasan.
// BUG anterior: isLastGroupGame usaba conteo de partidos finalizados, lo que
// fallaba para la jornada final (2 partidos simultáneos, ninguno terminado aún).
// Fix: si ambos equipos ya jugaron 2 partidos previos → es la última jornada.
async function computeStakes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string,
  homeTeam: string,
  awayTeam: string,
): Promise<string | null> {
  const { data: matchInfo } = await supabase
    .from('matches')
    .select('stage, group_name, status')
    .eq('id', matchId)
    .single()
  if (!matchInfo) return null

  if (matchInfo.stage !== 'GROUP' && matchInfo.stage !== 'GROUP_STAGE') {
    const stageLabel: Record<string, string> = {
      LAST_32: 'Ronda de 32', ROUND_OF_16: 'Octavos de final', LAST_16: 'Octavos de final',
      QUARTER_FINALS: 'Cuartos de final', SEMI_FINALS: 'Semifinales',
      THIRD_PLACE: 'Tercer puesto', FINAL: 'Final',
    }
    const label = stageLabel[matchInfo.stage] ?? 'eliminatoria'
    return `Partido de ${label} — el ganador avanza, el perdedor queda fuera del Mundial.`
  }

  if (!matchInfo.group_name) return null
  const groupLetter = matchInfo.group_name.replace(/^GROUP_?/, '')

  const { data: allGroupMatches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, home_score_fulltime, away_score_fulltime, home_score_quiniela, away_score_quiniela, status')
    .eq('group_name', matchInfo.group_name)

  if (!allGroupMatches) return null

  const stats: Record<string, { pts: number; gf: number; gc: number; played: number }> = {}
  const initTeam = (t: string) => { stats[t] ??= { pts: 0, gf: 0, gc: 0, played: 0 } }

  for (const m of allGroupMatches) {
    if (m.id === matchId) continue
    if (m.status !== 'FINISHED') continue
    const hg = m.home_score_fulltime ?? m.home_score_quiniela
    const ag = m.away_score_fulltime ?? m.away_score_quiniela
    if (hg == null || ag == null) continue
    initTeam(m.home_team); initTeam(m.away_team)
    stats[m.home_team].gf += hg; stats[m.home_team].gc += ag; stats[m.home_team].played++
    stats[m.away_team].gf += ag; stats[m.away_team].gc += hg; stats[m.away_team].played++
    if (hg > ag) stats[m.home_team].pts += 3
    else if (hg === ag) { stats[m.home_team].pts += 1; stats[m.away_team].pts += 1 }
    else stats[m.away_team].pts += 3
  }
  initTeam(homeTeam); initTeam(awayTeam)

  // Ambos equipos ya jugaron sus 2 partidos anteriores → es la última jornada.
  // (La lógica anterior contaba partidos terminados del grupo, lo que fallaba
  // cuando los 2 juegos de la última ronda se juegan en simultáneo.)
  const isLastGroupGame = stats[homeTeam].played === 2 && stats[awayTeam].played === 2

  const sorted = Object.entries(stats).sort((a, b) =>
    b[1].pts - a[1].pts || (b[1].gf - b[1].gc) - (a[1].gf - a[1].gc) || b[1].gf - a[1].gf
  )
  const posOf = (team: string) => sorted.findIndex(([t]) => t === team) + 1
  const ptOf  = (team: string) => stats[team]?.pts ?? 0

  const homePos = posOf(homeTeam)
  const awayPos = posOf(awayTeam)
  const homePts = ptOf(homeTeam)
  const awayPts = ptOf(awayTeam)

  if (isLastGroupGame) {
    const otherMatch = allGroupMatches.find(m => m.id !== matchId && m.status !== 'FINISHED')
    const describeNeed = (team: string, pos: number, pts: number) => {
      if (pts >= 6) return `${team} ya está clasificado (${pos}º, ${pts} pts)`
      if (pos <= 2) return `${team} clasifica si no pierde (${pos}º, ${pts} pts)`
      if (pos === 3) return `${team} pelea por 3er lugar (${pts} pts) — los mejores 8 terceros avanzan`
      return `${team} necesita ganar y esperar resultados (${pos}º, ${pts} pts)`
    }
    const lines = [
      describeNeed(homeTeam, homePos, homePts),
      describeNeed(awayTeam, awayPos, awayPts),
    ]
    if (otherMatch) lines.push(`El otro partido del Grupo ${groupLetter} se juega simultáneamente.`)
    return lines.join(' · ')
  }

  const lines: string[] = []
  const describe = (team: string, pos: number, pts: number, played: number) => {
    const remaining = 3 - played  // incluye este partido
    if (pts >= 6) return `${team} ya está clasificado con ${pts} pts`
    if (played === 0) return `${team} debuta en el Grupo ${groupLetter}`
    if (pos <= 2) return `${team} lleva ${pts} pts (${pos}º en Grupo ${groupLetter}), ${remaining} partido${remaining !== 1 ? 's' : ''} por jugar`
    if (pos >= 3 && pts === 0 && played >= 2) return `${team} está eliminado (0 pts en 2 partidos)`
    return `${team} suma ${pts} pts (${pos}º en Grupo ${groupLetter})`
  }
  lines.push(describe(homeTeam, homePos, homePts, stats[homeTeam].played))
  lines.push(describe(awayTeam, awayPos, awayPts, stats[awayTeam].played))
  if (homePos >= 3 && awayPos >= 3) {
    lines.push('Un empate podría dejar a ambos fuera de la zona de clasificación.')
  } else if (homePos <= 2 && awayPos <= 2) {
    lines.push('El ganador se consolida en el top 2 del grupo.')
  }
  return lines.join(' · ')
}

// ── Key players: top goleador/asistente por equipo ────────────────────────────
// Lee de player_stats (poblada por scripts/sync-scorers.mjs).
// Elige el jugador con más goles+asistencias de cada equipo.
async function computeKeyPlayers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  homeTeam: string,
  awayTeam: string,
): Promise<MatchContextData['keyPlayers']> {
  const { data } = await supabase
    .from('player_stats')
    .select('team_name, player_name, goals, assists')
    .in('team_name', [homeTeam, awayTeam])

  if (!data || data.length === 0) return null

  const topFor = (team: string) => {
    const players = data
      .filter(p => p.team_name === team)
      .sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists))
    const p = players[0]
    if (!p || (p.goals === 0 && p.assists === 0)) return null
    const parts: string[] = []
    if (p.goals > 0) parts.push(`${p.goals} gol${p.goals !== 1 ? 'es' : ''}`)
    if (p.assists > 0) parts.push(`${p.assists} asist.`)
    return { name: p.player_name, stat: parts.join(' · ') }
  }

  const home = topFor(homeTeam)
  const away = topFor(awayTeam)
  if (!home && !away) return null
  return { home, away }
}
