export type Theme = 'mexico' | 'usa' | 'argentina'

export const THEMES = {
  mexico: {
    name: 'México',
    emoji: '🇲🇽',
    colors: {
      primary: '#006847',      // Verde México
      secondary: '#D4AF37',    // Oro
      accent: '#CE1126',       // Rojo
      background: '#0a0f0d',
      text_main: '#ffffff',
      text_muted: '#a0a8a6',
      text_dim: '#7a8280',
    },
    texts: {
      testMode: 'Modo prueba — los datos no son reales',
      open: 'Abierto',
      locked: 'Bloqueado',
      finished: 'Finalizado',
      live: '● En juego',
      missingPred: 'Falta pronóstico',
      noPlayed: 'No jugaron',
      edit: 'Editar',
      save: 'Guardar',
      cancel: 'Cancelar',
      ranking: 'Ranking',
      rules: 'Reglas',
      matches: 'Partidos',
    },
    header: null,
  },
  usa: {
    name: 'USA',
    emoji: '🇺🇸',
    colors: {
      primary: '#0A3161',      // Navy azul
      secondary: '#E81B23',    // Rojo vivo
      accent: '#FFFFFF',       // Blanco
      background: '#0d0e10',
      text_main: '#ffffff',
      text_muted: '#a8a8a8',
      text_dim: '#787878',
    },
    texts: {
      testMode: 'Test Mode — data is not real',
      open: 'Open',
      locked: 'Locked',
      finished: 'Finished',
      live: '● In Play',
      missingPred: 'Missing predictions',
      noPlayed: 'Did not play',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      ranking: 'Ranking',
      rules: 'Rules',
      matches: 'Matches',
    },
    header: 'FREEDOM',
  },
  argentina: {
    name: 'Argentina',
    emoji: '🇦🇷',
    colors: {
      primary: '#4B8BBE',      // Azul celeste
      secondary: '#FFFFFF',    // Blanco
      accent: '#F4D03F',       // Oro
      background: '#0a0d1a',
      text_main: '#ffffff',
      text_muted: '#9db3d6',
      text_dim: '#7a8fa6',
    },
    texts: {
      testMode: 'Modo de prueba — los datos no son reales',
      open: 'Abierto boludo',
      locked: 'Se cierra',
      finished: 'Terminó',
      live: '¡Dale, en vivo!',
      missingPred: 'Che, ¿dónde estás?',
      noPlayed: 'No se dejaron de joder',
      edit: 'Che, editar',
      save: 'Listo, guardá',
      cancel: 'Nah',
      ranking: 'El ranking',
      rules: 'Las reglas',
      matches: 'Los partidos',
    },
    header: null,
  },
}

export function getTheme(theme: Theme = 'mexico') {
  return THEMES[theme] || THEMES.mexico
}
