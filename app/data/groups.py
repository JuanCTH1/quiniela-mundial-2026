"""48 selecciones repartidas en 12 grupos para el Mundial 2026.

Los tres anfitriones (México, Canadá, USA) van como cabezas de A, B y D según
el sorteo. El resto mezcla clasificados confirmados y plazas por confirmar (TBD)
a la fecha de este seed — edítalos en cuanto se cierre el cupo.
"""

GROUPS: dict[str, list[str]] = {
    "A": ["México", "TBD A2", "TBD A3", "TBD A4"],
    "B": ["Canadá", "TBD B2", "TBD B3", "TBD B4"],
    "C": ["Argentina", "TBD C2", "TBD C3", "TBD C4"],
    "D": ["Estados Unidos", "TBD D2", "TBD D3", "TBD D4"],
    "E": ["Francia", "TBD E2", "TBD E3", "TBD E4"],
    "F": ["Brasil", "TBD F2", "TBD F3", "TBD F4"],
    "G": ["Inglaterra", "TBD G2", "TBD G3", "TBD G4"],
    "H": ["España", "TBD H2", "TBD H3", "TBD H4"],
    "I": ["Portugal", "TBD I2", "TBD I3", "TBD I4"],
    "J": ["Países Bajos", "TBD J2", "TBD J3", "TBD J4"],
    "K": ["Alemania", "TBD K2", "TBD K3", "TBD K4"],
    "L": ["Bélgica", "TBD L2", "TBD L3", "TBD L4"],
}

# Sede de apertura: Estadio Azteca, Ciudad de México — 11 de junio de 2026.
OPENING = "2026-06-11T20:00:00"
