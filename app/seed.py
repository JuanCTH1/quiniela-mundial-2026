"""Carga grupos y genera todos los partidos de fase de grupos (round-robin).

Local (SQLite):   python -m app.seed
Online (Supabase): aplica primero la migración SQL (ver README) y luego corre
                   este script con SUPABASE_URL y SUPABASE_KEY en el entorno.
"""
from datetime import datetime, timedelta
from itertools import combinations

from .data.groups import GROUPS, OPENING
from . import storage


def _generate_group_matches() -> list[dict]:
    """6 partidos por grupo (todos contra todos), con kickoffs escalonados."""
    matches: list[dict] = []
    start = datetime.fromisoformat(OPENING)
    slot = 0
    for grp, teams in GROUPS.items():
        for home, away in combinations(teams, 2):
            kickoff = (start + timedelta(hours=4 * slot)).isoformat()
            matches.append({
                "stage": "group", "grp": grp,
                "home": home, "away": away,
                "kickoff": kickoff,
            })
            slot += 1
    return matches


def seed() -> int:
    """Inserta los partidos si la tabla está vacía. Devuelve cuántos insertó."""
    storage.init()
    existing = storage.list_matches()
    if existing:
        print(f"Ya hay {len(existing)} partidos cargados; no se duplica nada.")
        return 0

    matches = _generate_group_matches()

    if storage.USE_SUPABASE:
        # Inserción masiva vía REST.
        storage._sb_request(
            "POST", f"{storage.PREFIX}matches",
            json=matches,
            headers={"Prefer": "return=minimal"},
        )
    else:
        with storage._sqlite().get_conn() as conn:
            conn.executemany(
                """INSERT INTO matches(stage, grp, home, away, kickoff)
                   VALUES (:stage, :grp, :home, :away, :kickoff)""",
                matches,
            )
            conn.commit()

    print(f"Sembrados {len(matches)} partidos de fase de grupos "
          f"({'Supabase' if storage.USE_SUPABASE else 'SQLite'}).")
    return len(matches)


if __name__ == "__main__":
    seed()
