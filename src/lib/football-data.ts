const BASE_URL = 'https://api.football-data.org/v4'
const WC_ID = 'WC'

// Tipos mínimos de la API — solo los campos que usamos
interface ApiScore {
  fullTime: { home: number | null; away: number | null }
  regularTime?: { home: number | null; away: number | null } | null
  penalties?: { home: number | null; away: number | null } | null
  duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT'
}

export interface ApiGoal {
  minute: number | null
  injuryTime: number | null
  type: 'REGULAR' | 'OWN_GOAL' | 'PENALTY'
  team: { id: number; name: string }
  scorer: { id: number; name: string; shortName?: string | null }
}

export interface ApiMatch {
  id: number
  utcDate: string
  // Estados reales que devuelve football-data.org v4:
  // SCHEDULED/TIMED (por jugar), IN_PLAY (en juego), PAUSED (medio tiempo),
  // FINISHED, POSTPONED, SUSPENDED, CANCELLED
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'CANCELLED' | 'SUSPENDED'
  minute?: number | null
  stage: string
  group: string | null
  matchday: number | null
  homeTeam: { id: number; name: string; shortName?: string }
  awayTeam: { id: number; name: string; shortName?: string }
  score: ApiScore
  goals?: ApiGoal[]
  lastUpdated: string
}

// Formato simplificado que guardamos en la DB (JSONB)
export interface GoalEntry {
  minute: number
  injuryTime?: number | null
  scorer: string
  side: 'home' | 'away'
  type: 'REGULAR' | 'OWN_GOAL' | 'PENALTY'
}

export function extractGoals(apiMatch: ApiMatch): GoalEntry[] {
  if (!apiMatch.goals?.length) return []
  const homeId = apiMatch.homeTeam.id
  return apiMatch.goals
    .filter(g => g.minute != null)
    .map(g => ({
      minute: g.minute!,
      injuryTime: g.injuryTime ?? null,
      scorer: g.scorer.shortName || g.scorer.name,
      side: (g.team.id === homeId ? 'home' : 'away') as 'home' | 'away',
      type: g.type,
    }))
    .sort((a, b) => a.minute - b.minute || (a.injuryTime ?? 0) - (b.injuryTime ?? 0))
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    throw new Error(`football-data.org ${res.status}: ${path}`)
  }

  return res.json() as Promise<T>
}

export async function fetchActiveMatches(): Promise<ApiMatch[]> {
  // Estados "en vivo" y "por jugar" tal como los nombra la API
  const data = await apiFetch<{ matches: ApiMatch[] }>(
    `/competitions/${WC_ID}/matches?status=IN_PLAY,PAUSED,TIMED,SCHEDULED`
  )
  const now = Date.now()
  const window = 30 * 60 * 1000 // 30 minutos

  return data.matches.filter(m => {
    if (m.status === 'IN_PLAY' || m.status === 'PAUSED') return true
    if (m.status === 'SCHEDULED' || m.status === 'TIMED') return new Date(m.utcDate).getTime() - now <= window
    return false
  })
}

// El endpoint de un partido devuelve el objeto al nivel raíz, NO envuelto en { match }.
export async function fetchMatch(externalId: number): Promise<ApiMatch> {
  return apiFetch<ApiMatch>(`/matches/${externalId}`)
}

export async function fetchAllWCMatches(): Promise<ApiMatch[]> {
  const data = await apiFetch<{ matches: ApiMatch[] }>(
    `/competitions/${WC_ID}/matches`
  )
  return data.matches
}

// Determina el score de quiniela según el corte configurado para la etapa.
// Para fase de grupos siempre llega duration='REGULAR' → fullTime.
// Para eliminatoria: regularTime = 90', fullTime = resultado tras prórroga.
export function resolveQuinielaScore(
  score: ApiScore,
  corte: string
): { home: number | null; away: number | null } | null {
  const { duration, fullTime, regularTime } = score

  if (duration === 'REGULAR') {
    return fullTime.home != null ? { home: fullTime.home, away: fullTime.away! } : null
  }

  // Partido que fue a prórroga o penales
  if (corte === '90') {
    return regularTime?.home != null
      ? { home: regularTime.home, away: regularTime.away! }
      : null
  }

  if (corte === '120' || corte === 'PENALTIES') {
    return fullTime.home != null ? { home: fullTime.home, away: fullTime.away! } : null
  }

  return null
}

// Determina el equipo ganador en una tanda de penales.
// Retorna el nombre del equipo ganador, o null si los datos de la API no están disponibles.
export function resolvePenaltyWinner(
  penalties: { home: number | null; away: number | null } | null | undefined,
  homeTeamName: string | null,
  awayTeamName: string | null
): string | null {
  if (!penalties || penalties.home == null || penalties.away == null) return null
  if (penalties.home > penalties.away) return homeTeamName
  if (penalties.away > penalties.home) return awayTeamName
  return null // empate en penales no debería ocurrir
}

// Mapea el stage de la API al valor en nuestra tabla
export function normalizeStage(apiStage: string): string {
  const map: Record<string, string> = {
    'GROUP_STAGE': 'GROUP',
    'LAST_32': 'LAST_32',        // Ronda de 32 del Mundial 2026 (48 equipos)
    'LAST_16': 'ROUND_OF_16',
    'QUARTER_FINALS': 'QUARTER_FINALS',
    'SEMI_FINALS': 'SEMI_FINALS',
    'THIRD_PLACE': 'THIRD_PLACE',
    'FINAL': 'FINAL',
  }
  return map[apiStage] ?? apiStage
}

// Normaliza el status de la API a nuestro enum interno
export function normalizeStatus(apiStatus: string): 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'POSTPONED' {
  if (apiStatus === 'TIMED' || apiStatus === 'SCHEDULED') return 'SCHEDULED'
  if (apiStatus === 'IN_PLAY' || apiStatus === 'PAUSED') return 'IN_PROGRESS'
  if (apiStatus === 'CANCELLED' || apiStatus === 'SUSPENDED' || apiStatus === 'POSTPONED') return 'POSTPONED'
  if (apiStatus === 'FINISHED') return 'FINISHED'
  return 'SCHEDULED' // fallback seguro para estados desconocidos
}
