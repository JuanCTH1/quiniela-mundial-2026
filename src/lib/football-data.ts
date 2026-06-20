const BASE_URL = 'https://api.football-data.org/v4'
const WC_ID = 'WC'

// Tipos mínimos de la API — solo los campos que usamos
interface ApiScore {
  fullTime: { home: number | null; away: number | null }
  regularTime?: { home: number | null; away: number | null } | null
  duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT'
}

export interface ApiMatch {
  id: number
  utcDate: string
  status: 'SCHEDULED' | 'TIMED' | 'IN_PROGRESS' | 'FINISHED' | 'POSTPONED' | 'CANCELLED' | 'SUSPENDED'
  stage: string
  group: string | null
  matchday: number | null
  homeTeam: { name: string; shortName?: string }
  awayTeam: { name: string; shortName?: string }
  score: ApiScore
  lastUpdated: string
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
  // Solo partidos SCHEDULED (próximos 30 min) o IN_PROGRESS
  const data = await apiFetch<{ matches: ApiMatch[] }>(
    `/competitions/${WC_ID}/matches?status=IN_PROGRESS,SCHEDULED`
  )
  const now = Date.now()
  const window = 30 * 60 * 1000 // 30 minutos

  return data.matches.filter(m => {
    if (m.status === 'IN_PROGRESS') return true
    if (m.status === 'SCHEDULED') return new Date(m.utcDate).getTime() - now <= window
    return false
  })
}

export async function fetchMatch(externalId: number): Promise<ApiMatch> {
  const data = await apiFetch<{ match: ApiMatch }>(`/matches/${externalId}`)
  return data.match
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
  if (apiStatus === 'TIMED') return 'SCHEDULED'
  if (apiStatus === 'CANCELLED' || apiStatus === 'SUSPENDED') return 'POSTPONED'
  return apiStatus as 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'POSTPONED'
}
