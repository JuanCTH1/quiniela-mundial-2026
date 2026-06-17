"""Conexión y esquema de SQLite para la quiniela."""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "quiniela.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS matches (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    stage       TEXT NOT NULL,            -- 'group', 'r32', 'r16', 'qf', 'sf', 'final'
    grp         TEXT,                     -- 'A'..'L' en fase de grupos
    home        TEXT NOT NULL,
    away        TEXT NOT NULL,
    kickoff     TEXT,                     -- ISO datetime
    home_score  INTEGER,                  -- NULL = no jugado
    away_score  INTEGER,
    finished    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS predictions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    match_id   INTEGER NOT NULL REFERENCES matches(id),
    pred_home  INTEGER NOT NULL,
    pred_away  INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, match_id)
);

CREATE TABLE IF NOT EXISTS draw (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    participant TEXT NOT NULL,
    team_a      TEXT NOT NULL,
    team_b      TEXT NOT NULL,
    lot_index   INTEGER NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


def get_conn() -> sqlite3.Connection:
    """Devuelve una conexión con row_factory tipo dict."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    """Crea las tablas si no existen."""
    with get_conn() as conn:
        conn.executescript(SCHEMA)
