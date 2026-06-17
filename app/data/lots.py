"""Los 6 lotes del sorteo paralelo: cada participante saca un par de selecciones.

Si una de sus dos selecciones gana el Mundial, gana el sorteo. Pares fijos definidos
por el usuario; el sorteo solo decide a quién le toca cada lote.
"""

LOTS: list[dict[str, str]] = [
    {"team_a": "Canadá",     "team_b": "Francia"},
    {"team_a": "México",     "team_b": "España"},
    {"team_a": "Argentina",  "team_b": "Estados Unidos"},
    {"team_a": "Brasil",     "team_b": "Países Bajos"},
    {"team_a": "Alemania",   "team_b": "Bélgica"},
    {"team_a": "Inglaterra", "team_b": "Portugal"},
]
