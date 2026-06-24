export const RANK_TITLES = [
  { title: 'El Messias', color: 'var(--gold)', crown: true },
  { title: 'El Escolta', color: 'var(--text-muted)', crown: false },
  { title: 'El de Bronce', color: '#CD7F32', crown: false },
  { title: 'El del Montón', color: 'var(--text-dim)', crown: false },
  { title: 'El Sparring', color: 'var(--text-dim)', crown: false },
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

const ABBR: Record<string, string> = {
  'Mexico': 'MEX', 'México': 'MEX',
  'United States': 'USA', 'USA': 'USA',
  'Canada': 'CAN',
  'Argentina': 'ARG',
  'Brazil': 'BRA', 'Brasil': 'BRA',
  'France': 'FRA',
  'Germany': 'GER',
  'Spain': 'ESP',
  'England': 'ENG',
  'Portugal': 'POR',
  'Netherlands': 'NED',
  'Belgium': 'BEL',
  'Italy': 'ITA',
  'Croatia': 'CRO',
  'Morocco': 'MAR',
  'Japan': 'JPN',
  'South Korea': 'KOR', 'Korea Republic': 'KOR',
  'Australia': 'AUS',
  'Colombia': 'COL',
  'Uruguay': 'URU',
  'Chile': 'CHI',
  'Ecuador': 'ECU',
  'Peru': 'PER',
  'Venezuela': 'VEN',
  'Paraguay': 'PAR',
  'Bolivia': 'BOL',
  'Senegal': 'SEN',
  'Ghana': 'GHA',
  'Nigeria': 'NGA',
  'Cameroon': 'CMR',
  'Egypt': 'EGY',
  'Tunisia': 'TUN',
  'Algeria': 'ALG',
  "Côte d'Ivoire": 'CIV', 'Ivory Coast': 'CIV',
  'Mali': 'MLI',
  'Saudi Arabia': 'KSA',
  'Iran': 'IRN',
  'Qatar': 'QAT',
  'Switzerland': 'SUI',
  'Denmark': 'DEN',
  'Poland': 'POL',
  'Serbia': 'SRB',
  'Austria': 'AUT',
  'Scotland': 'SCO',
  'Wales': 'WAL',
  'Ukraine': 'UKR',
  'Turkey': 'TUR', 'Türkiye': 'TUR',
  'Czech Republic': 'CZE', 'Czechia': 'CZE',
  'Slovakia': 'SVK',
  'New Zealand': 'NZL',
  'Costa Rica': 'CRC',
  'Panama': 'PAN',
  'Honduras': 'HON',
  'Jamaica': 'JAM',
  'Guatemala': 'GUA',
  'El Salvador': 'SLV',
  'Haiti': 'HAI',
  'Cuba': 'CUB',
  'South Africa': 'RSA',
  'China PR': 'CHN', 'China': 'CHN',
  'Uzbekistan': 'UZB',
  'Iraq': 'IRQ',
  'Jordan': 'JOR',
  'United Arab Emirates': 'UAE',
  'Norway': 'NOR',
  'Sweden': 'SWE',
  'Indonesia': 'IDN',
  'Thailand': 'THA',
  'Bosnia-H.': 'BIH', 'Bosnia and Herzegovina': 'BIH',
  'Congo DR': 'COD',
  'Cape Verde': 'CPV',
  'TBD': 'TBD',
}

export function getTeamAbbr(name: string): string {
  return ABBR[name] ?? name.slice(0, 3).toUpperCase()
}

// Etiqueta de tiempo para partidos en vivo.
// 1T/2T/ET1/ET2 → muestra el minuto; MT/MTE/PEN → etiqueta fija.
export function formatLivePeriod(period: string | null | undefined, minute: number | null | undefined): string | null {
  if (!period) return null
  if (period === 'MT') return 'MT'
  if (period === 'MTE') return 'MTE'
  if (period === 'PEN') return 'PEN'
  if (minute != null) return `${minute}'`
  if (period === 'ET1' || period === 'ET2') return 'ET'
  return null
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

/** Fecha de hoy en la zona horaria del usuario, formato YYYY-MM-DD */
export function localTodayStr(timezone: string): string {
  return new Intl.DateTimeFormat('sv', { timeZone: timezone }).format(new Date())
}

/** Rango UTC para el inicio y fin del día 'dateStr' (YYYY-MM-DD) en la zona horaria dada */
export function dayBoundsUTC(dateStr: string, timezone: string): { start: Date; end: Date } {
  const noonUTC = new Date(dateStr + 'T12:00:00Z')
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(noonUTC)
  const localH = parseInt(parts.find(p => p.type === 'hour')?.value ?? '12') % 24
  const localM = parseInt(parts.find(p => p.type === 'minute')?.value ?? '00')
  const offsetMs = (12 * 60 - (localH * 60 + localM)) * 60_000
  return {
    start: new Date(new Date(dateStr + 'T00:00:00Z').getTime() + offsetMs),
    end:   new Date(new Date(dateStr + 'T23:59:59Z').getTime() + offsetMs),
  }
}

export const TIMEZONES = [
  { label: 'Ciudad de México / Monterrey (CST/CDT)', value: 'America/Mexico_City' },
  { label: 'Mazatlán / Chihuahua (MST/MDT)', value: 'America/Mazatlan' },
  { label: 'Tijuana / Mexicali (PST/PDT)', value: 'America/Tijuana' },
  { label: 'Horario Inzunza (CDT)', value: 'America/Chicago' },
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
