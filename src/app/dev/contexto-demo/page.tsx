import { MatchContext, type MatchContextData } from '@/components/MatchContext'

// Ruta SOLO de desarrollo para previsualizar <MatchContext> con datos de muestra,
// sin auth ni base de datos poblada. Borrar (o proteger) antes de producción.

const DEMO: MatchContextData = {
  homeTeam: 'Suiza',
  awayTeam: 'Canadá',
  stakes: 'Suiza ya está clasificada. Canadá necesita ganar y que Uruguay no gane para avanzar.',
  odds: { home: 0.46, draw: 0.29, away: 0.25 },
  form: {
    home: ['W', 'D', 'W', 'W', 'D'],
    away: ['L', 'W', 'D', 'L', 'W'],
  },
  h2h: { homeWins: 3, draws: 2, awayWins: 1 },
  referee: { name: 'Facundo Tello', country: 'Argentina', flag: '🇦🇷' },
  coaches: { home: 'Murat Yakin', away: 'Jesse Marsch' },
  physical: { homeHeight: 185.4, awayHeight: 183.1, homeAge: 27.8, awayAge: 26.5 },
  keyPlayers: {
    home: { name: 'X. Shaqiri', stat: '2 goles en el torneo' },
    away: { name: 'A. Davies', stat: '3 asistencias' },
  },
  venue: {
    name: 'BC Place',
    city: 'Vancouver, BC',
    country: 'CAN',
    capacity: 52497,
    surface: 'Césped natural',
    openedYear: 1983,
    imageUrl: 'https://wltltpzvscgpnfwvgfmt.supabase.co/storage/v1/object/public/venues/6ee870e7-bd28-426c-b6c7-145c7476db8a.jpg',
    lat: 49.2768,
    lng: -123.1119,
  },
  facts: [
    { category: 'historico', body: 'Suiza y Canadá nunca se han enfrentado en un Mundial. Es el primer partido oficial entre ambas selecciones en una fase final.' },
    { category: 'jugador', body: 'Si juega de titular, Alphonso Davies se convertiría en el canadiense con más minutos en Mundiales.' },
    { category: 'narrativo', body: 'Suiza no pierde un partido de fase de grupos desde 2018; Canadá busca su primera victoria mundialista en suelo propio.' },
  ],
}

export default function ContextoDemoPage() {
  return (
    <div style={{ maxWidth: 440, margin: '0 auto', padding: 16 }}>
      <h1 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Preview — Contexto del partido</h1>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        Ruta de desarrollo con datos de muestra. Abierto por defecto para revisar el diseño.
      </p>
      <MatchContext data={DEMO} defaultOpen />
    </div>
  )
}
