export const RANK_TITLES = [
  { title: 'El Messias', color: 'var(--gold)', crown: true },
  { title: 'El Escolta', color: 'rgba(255,255,255,0.7)', crown: false },
  { title: 'El de Bronce', color: '#CD7F32', crown: false },
  { title: 'El del Montón', color: 'rgba(255,255,255,0.4)', crown: false },
  { title: 'El Sparring', color: 'rgba(255,255,255,0.4)', crown: false },
  { title: 'El Analista de la FIFA', color: 'var(--shame-red)', crown: false },
]

const FLAGS: Record<string, string> = {
  'Mexico': '🇲🇽', 'México': '🇲🇽',
  'United States': '🇺🇸', 'USA': '🇺🇸',
  'Canada': '🇨🇦',
  'Argentina': '🇦🇷',
  'Brazil': '🇧🇷', 'Brasil': '🇧🇷',
  'France': '🇫🇷',
  'Germany': '🇩🇪',
  'Spain': '🇪🇸',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Portugal': '🇵🇹',
  'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪',
  'Italy': '🇮🇹',
  'Croatia': '🇭🇷',
  'Morocco': '🇲🇦',
  'Japan': '🇯🇵',
  'South Korea': '🇰🇷', 'Korea Republic': '🇰🇷',
  'Australia': '🇦🇺',
  'Colombia': '🇨🇴',
  'Uruguay': '🇺🇾',
  'Chile': '🇨🇱',
  'Ecuador': '🇪🇨',
  'Peru': '🇵🇪',
  'Venezuela': '🇻🇪',
  'Paraguay': '🇵🇾',
  'Bolivia': '🇧🇴',
  'Senegal': '🇸🇳',
  'Ghana': '🇬🇭',
  'Nigeria': '🇳🇬',
  'Cameroon': '🇨🇲',
  'Egypt': '🇪🇬',
  'Tunisia': '🇹🇳',
  'Algeria': '🇩🇿',
  "Côte d'Ivoire": '🇨🇮', 'Ivory Coast': '🇨🇮',
  'Mali': '🇲🇱',
  'Saudi Arabia': '🇸🇦',
  'Iran': '🇮🇷',
  'Qatar': '🇶🇦',
  'Switzerland': '🇨🇭',
  'Denmark': '🇩🇰',
  'Poland': '🇵🇱',
  'Serbia': '🇷🇸',
  'Austria': '🇦🇹',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Ukraine': '🇺🇦',
  'Turkey': '🇹🇷', 'Türkiye': '🇹🇷',
  'Czech Republic': '🇨🇿', 'Czechia': '🇨🇿',
  'Slovakia': '🇸🇰',
  'New Zealand': '🇳🇿',
  'Costa Rica': '🇨🇷',
  'Panama': '🇵🇦',
  'Honduras': '🇭🇳',
  'Jamaica': '🇯🇲',
  'Guatemala': '🇬🇹',
  'El Salvador': '🇸🇻',
  'Trinidad and Tobago': '🇹🇹',
  'Haiti': '🇭🇹',
  'Cuba': '🇨🇺',
  'South Africa': '🇿🇦',
  'Mozambique': '🇲🇿',
  'Tanzania': '🇹🇿',
  'Angola': '🇦🇴',
  'Cape Verde': '🇨🇻',
  'Zambia': '🇿🇲',
  'Thailand': '🇹🇭',
  'Indonesia': '🇮🇩',
  'China PR': '🇨🇳', 'China': '🇨🇳',
  'Uzbekistan': '🇺🇿',
  'Iraq': '🇮🇶',
  'Jordan': '🇯🇴',
  'United Arab Emirates': '🇦🇪',
  'Norway': '🇳🇴',
  'Sweden': '🇸🇪',
  'Curaçao': '🇨🇼',
  'Bosnia-H.': '🇧🇦', 'Bosnia and Herzegovina': '🇧🇦',
  'Congo DR': '🇨🇩', 'Congo': '🇨🇩',
  'TBD': '🏳️',
}

export function getTeamFlag(name: string): string {
  return FLAGS[name] ?? '🏳️'
}

export type ResultType = 'EXACTO' | 'DIFERENCIA' | 'TENDENCIA' | 'FALLO'

export function calcResult(
  predH: number, predA: number,
  resH: number, resA: number
): { type: ResultType; pts: number } {
  if (predH === resH && predA === resA) return { type: 'EXACTO', pts: 4 }
  const predDiff = predH - predA
  const resDiff = resH - resA
  if (predDiff === resDiff) return { type: 'DIFERENCIA', pts: 3 }
  if (resDiff !== 0 && Math.sign(predDiff) === Math.sign(resDiff)) return { type: 'TENDENCIA', pts: 2 }
  return { type: 'FALLO', pts: 0 }
}

export function isMatchLocked(scheduledTime: string, bloqueoMinutos: number, earlyUnlockAt?: string | null): boolean {
  if (earlyUnlockAt && new Date(earlyUnlockAt) <= new Date()) return true
  const lockTime = new Date(scheduledTime).getTime() - bloqueoMinutos * 60_000
  return Date.now() >= lockTime
}

export function formatMatchTime(utcTime: string, timezone: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(utcTime))
}

export function getLockTime(scheduledTime: string, bloqueoMinutos: number): Date {
  return new Date(new Date(scheduledTime).getTime() - bloqueoMinutos * 60_000)
}

export const TIMEZONES = [
  { label: 'Ciudad de México / Monterrey (CST/CDT)', value: 'America/Mexico_City' },
  { label: 'Mazatlán / Chihuahua (MST/MDT)', value: 'America/Mazatlan' },
  { label: 'Tijuana / Mexicali (PST/PDT)', value: 'America/Tijuana' },
  { label: 'Nueva York / Miami (EST/EDT)', value: 'America/New_York' },
  { label: 'Madrid / Barcelona (CET/CEST)', value: 'Europe/Madrid' },
  { label: 'UTC', value: 'UTC' },
]

export function getMatchPhase(actualStartTime: string | null, status: string): string {
  if (status !== 'IN_PROGRESS' || !actualStartTime) return ''

  const elapsed = (Date.now() - new Date(actualStartTime).getTime()) / 60000 // minutos

  if (elapsed < 45) return `Primer Tiempo (${Math.floor(elapsed)}')`
  if (elapsed < 50) return 'Medio Tiempo ⏸'
  if (elapsed < 90) return `Segundo Tiempo (${Math.floor(elapsed)}')`
  if (elapsed < 105) return `Prórroga (${Math.floor(elapsed - 90)}')`
  if (elapsed < 120) return `Prórroga (${Math.floor(elapsed - 90)}')`
  return `Penales`
}

export const STAGE_LABELS: Record<string, string> = {
  GROUP: 'Fase de grupos',
  LAST_32: 'Ronda de 32',
  ROUND_OF_16: 'Ronda de 16',
  QUARTER_FINALS: 'Cuartos de final',
  SEMI_FINALS: 'Semifinales',
  THIRD_PLACE: 'Tercer lugar',
  FINAL: 'Final',
}
