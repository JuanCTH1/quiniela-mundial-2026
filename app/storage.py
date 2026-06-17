"""Capa de almacenamiento dual: SQLite en local, Supabase REST cuando hay env vars.

Si existen SUPABASE_URL y SUPABASE_KEY se usa Supabase (persistente, sirve en
serverless tipo Vercel). Si no, cae a SQLite local — ideal para desarrollo.

La interfaz pública es la misma en ambos backends.
"""
from __future__ import annotations

import os
from typing import Any, Optional

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_KEY)

# Prefijo de tablas para no chocar con nada más en el mismo proyecto Supabase.
PREFIX = "quiniela_"


# --------------------------------------------------------------------------- #
# Backend Supabase (REST / PostgREST)
# --------------------------------------------------------------------------- #
def _sb_headers(extra: Optional[dict] = None) -> dict:
    """Cabeceras para llamar a la API REST de Supabase."""
    h = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if extra:
        h.update(extra)
    return h


def _sb_request(method: str, path: str, **kwargs) -> Any:
    """Request genérico a Supabase REST; lanza en error HTTP."""
    import httpx

    url = f"{SUPABASE_URL}/rest/v1/{path}"
    with httpx.Client(timeout=20) as client:
        resp = client.request(method, url, headers=_sb_headers(kwargs.pop("headers", None)), **kwargs)
    if resp.status_code >= 400:
        raise RuntimeError(f"Supabase {method} {path} -> {resp.status_code}: {resp.text}")
    if resp.text:
        return resp.json()
    return None


# --------------------------------------------------------------------------- #
# Backend SQLite
# --------------------------------------------------------------------------- #
def _sqlite():
    from . import db

    return db


# --------------------------------------------------------------------------- #
# API pública
# --------------------------------------------------------------------------- #
def init() -> None:
    """Inicializa el backend (solo aplica a SQLite; Supabase usa migración SQL)."""
    if not USE_SUPABASE:
        _sqlite().init_db()


def upsert_user(name: str) -> dict:
    """Crea el usuario o devuelve el existente (por nombre)."""
    name = name.strip()
    if USE_SUPABASE:
        existing = _sb_request("GET", f"{PREFIX}users?name=eq.{name}&select=*")
        if existing:
            return existing[0]
        created = _sb_request(
            "POST", f"{PREFIX}users",
            json={"name": name},
            headers={"Prefer": "return=representation"},
        )
        return created[0]
    with _sqlite().get_conn() as conn:
        cur = conn.execute("SELECT * FROM users WHERE name = ?", (name,))
        row = cur.fetchone()
        if row:
            return dict(row)
        cur = conn.execute("INSERT INTO users(name) VALUES (?)", (name,))
        conn.commit()
        return {"id": cur.lastrowid, "name": name}


def list_matches() -> list[dict]:
    """Lista de partidos ordenada por kickoff."""
    if USE_SUPABASE:
        return _sb_request("GET", f"{PREFIX}matches?select=*&order=kickoff.asc")
    with _sqlite().get_conn() as conn:
        rows = conn.execute("SELECT * FROM matches ORDER BY kickoff ASC, id ASC").fetchall()
        return [dict(r) for r in rows]


def save_prediction(user_id: int, match_id: int, pred_home: int, pred_away: int) -> dict:
    """Guarda o actualiza el pronóstico de un usuario para un partido."""
    if USE_SUPABASE:
        match = _sb_request("GET", f"{PREFIX}matches?id=eq.{match_id}&select=finished")
        if match and match[0].get("finished"):
            raise ValueError("El partido ya terminó; no se admiten pronósticos.")
        payload = {
            "user_id": user_id, "match_id": match_id,
            "pred_home": pred_home, "pred_away": pred_away,
        }
        _sb_request(
            "POST", f"{PREFIX}predictions",
            json=payload,
            headers={"Prefer": "resolution=merge-duplicates,return=representation"},
        )
        return payload
    with _sqlite().get_conn() as conn:
        m = conn.execute("SELECT finished FROM matches WHERE id = ?", (match_id,)).fetchone()
        if m and m["finished"]:
            raise ValueError("El partido ya terminó; no se admiten pronósticos.")
        conn.execute(
            """INSERT INTO predictions(user_id, match_id, pred_home, pred_away)
               VALUES (?,?,?,?)
               ON CONFLICT(user_id, match_id)
               DO UPDATE SET pred_home=excluded.pred_home, pred_away=excluded.pred_away""",
            (user_id, match_id, pred_home, pred_away),
        )
        conn.commit()
        return {"user_id": user_id, "match_id": match_id,
                "pred_home": pred_home, "pred_away": pred_away}


def user_predictions(user_id: int) -> list[dict]:
    """Pronósticos de un usuario."""
    if USE_SUPABASE:
        return _sb_request("GET", f"{PREFIX}predictions?user_id=eq.{user_id}&select=*")
    with _sqlite().get_conn() as conn:
        rows = conn.execute("SELECT * FROM predictions WHERE user_id = ?", (user_id,)).fetchall()
        return [dict(r) for r in rows]


def set_result(match_id: int, home_score: int, away_score: int) -> None:
    """Carga el resultado real de un partido y lo marca como terminado."""
    if USE_SUPABASE:
        _sb_request(
            "PATCH", f"{PREFIX}matches?id=eq.{match_id}",
            json={"home_score": home_score, "away_score": away_score, "finished": True},
        )
        return
    with _sqlite().get_conn() as conn:
        conn.execute(
            "UPDATE matches SET home_score=?, away_score=?, finished=1 WHERE id=?",
            (home_score, away_score, match_id),
        )
        conn.commit()


def all_predictions() -> list[dict]:
    """Todos los pronósticos (para calcular la tabla)."""
    if USE_SUPABASE:
        return _sb_request("GET", f"{PREFIX}predictions?select=*")
    with _sqlite().get_conn() as conn:
        rows = conn.execute("SELECT * FROM predictions").fetchall()
        return [dict(r) for r in rows]


def all_users() -> list[dict]:
    """Todos los usuarios."""
    if USE_SUPABASE:
        return _sb_request("GET", f"{PREFIX}users?select=*")
    with _sqlite().get_conn() as conn:
        rows = conn.execute("SELECT * FROM users").fetchall()
        return [dict(r) for r in rows]


# --------------------------------------------------------------------------- #
# Sorteo paralelo
# --------------------------------------------------------------------------- #
def get_draw() -> list[dict]:
    """Asignaciones del sorteo, ordenadas por lote."""
    if USE_SUPABASE:
        return _sb_request("GET", f"{PREFIX}draw?select=*&order=lot_index.asc")
    with _sqlite().get_conn() as conn:
        rows = conn.execute("SELECT * FROM draw ORDER BY lot_index ASC").fetchall()
        return [dict(r) for r in rows]


def save_draw(rows: list[dict]) -> None:
    """Guarda las asignaciones del sorteo (solo si aún no hay ninguna)."""
    if USE_SUPABASE:
        _sb_request("POST", f"{PREFIX}draw", json=rows,
                    headers={"Prefer": "return=minimal"})
        return
    with _sqlite().get_conn() as conn:
        conn.executemany(
            """INSERT INTO draw(participant, team_a, team_b, lot_index)
               VALUES (:participant, :team_a, :team_b, :lot_index)""",
            rows,
        )
        conn.commit()


def reset_draw() -> None:
    """Borra el sorteo para poder rehacerlo (admin)."""
    if USE_SUPABASE:
        _sb_request("DELETE", f"{PREFIX}draw?id=gte.0")
        return
    with _sqlite().get_conn() as conn:
        conn.execute("DELETE FROM draw")
        conn.commit()
