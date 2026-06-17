"""Reglas de puntuación de la quiniela."""

EXACT = 5      # marcador exacto
OUTCOME = 3    # resultado correcto (1/X/2) sin marcador exacto


def _outcome(home: int, away: int) -> str:
    """Devuelve '1' (gana local), 'X' (empate) o '2' (gana visitante)."""
    if home > away:
        return "1"
    if home < away:
        return "2"
    return "X"


def points(pred_home: int, pred_away: int, real_home: int, real_away: int) -> int:
    """Puntos de un pronóstico contra el resultado real."""
    if pred_home == real_home and pred_away == real_away:
        return EXACT
    if _outcome(pred_home, pred_away) == _outcome(real_home, real_away):
        return OUTCOME
    return 0
