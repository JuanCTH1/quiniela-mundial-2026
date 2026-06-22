// Sorteo paralelo — asignaciones oficiales del Mundial 2026
// Key: user_id de Supabase, Value: grupos asignados + equipo insignia por grupo

export const PLAYER_GROUPS: Record<string, {
  groups: [string, string]
  flagships: [string, string]   // equipo "famoso" de cada grupo, para identificación visual
}> = {
  '4376aadf-6954-4766-80d3-59eeabbe3e9f': { groups: ['GROUP_E', 'GROUP_G'], flagships: ['Germany',     'Belgium']     }, // Ernesto
  'e453cca6-59cb-4171-9efa-9b661ccfb911': { groups: ['GROUP_B', 'GROUP_I'], flagships: ['Canada',      'France']      }, // Javier
  'd1d7cbd6-0f87-47e2-a5a1-b2d2ac6c9878': { groups: ['GROUP_L', 'GROUP_K'], flagships: ['England',     'Portugal']    }, // JCT
  '49142426-f8f8-4337-acd7-e0dd79c7b0ab': { groups: ['GROUP_C', 'GROUP_F'], flagships: ['Brazil',      'Netherlands'] }, // Chuy
  '911f0b3b-fd40-4ac6-826b-5ab2858c97c6': { groups: ['GROUP_J', 'GROUP_D'], flagships: ['Argentina',   'USA']         }, // Mani
  '30d59f34-f088-4f78-b6ea-b82d824d8cfd': { groups: ['GROUP_A', 'GROUP_H'], flagships: ['Mexico',      'Spain']       }, // Gus
}

// Composición exacta de cada grupo (nombres como están en matches.home_team / away_team)
export const GROUP_TEAMS: Record<string, readonly [string, string, string, string]> = {
  GROUP_A: ['Mexico',      'Czechia',      'Korea Republic', 'South Africa'],
  GROUP_B: ['Canada',      'Bosnia-H.',    'Qatar',          'Switzerland'],
  GROUP_C: ['Brazil',      'Haiti',        'Morocco',        'Scotland'],
  GROUP_D: ['USA',         'Australia',    'Paraguay',       'Turkey'],
  GROUP_E: ['Germany',     'Ecuador',      'Ivory Coast',    'Curaçao'],
  GROUP_F: ['Netherlands', 'Japan',        'Sweden',         'Tunisia'],
  GROUP_G: ['Belgium',     'Egypt',        'Iran',           'New Zealand'],
  GROUP_H: ['Spain',       'Cape Verde',   'Saudi Arabia',   'Uruguay'],
  GROUP_I: ['France',      'Iraq',         'Norway',         'Senegal'],
  GROUP_J: ['Argentina',   'Algeria',      'Austria',        'Jordan'],
  GROUP_K: ['Portugal',    'Colombia',     'Congo DR',       'Uzbekistan'],
  GROUP_L: ['England',     'Croatia',      'Ghana',          'Panama'],
}
