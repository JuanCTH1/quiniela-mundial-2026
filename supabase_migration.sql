-- Migración Supabase para la Quiniela Mundial 2026.
-- Ejecutar en el SQL Editor de Supabase (o vía CLI) antes del primer deploy online.
-- Tablas con prefijo quiniela_ para no chocar con otros proyectos del mismo Postgres.

create table if not exists quiniela_users (
    id          bigint generated always as identity primary key,
    name        text unique not null,
    created_at  timestamptz not null default now()
);

create table if not exists quiniela_matches (
    id          bigint generated always as identity primary key,
    stage       text not null,
    grp         text,
    home        text not null,
    away        text not null,
    kickoff     timestamptz,
    home_score  integer,
    away_score  integer,
    finished    boolean not null default false
);

create table if not exists quiniela_predictions (
    id          bigint generated always as identity primary key,
    user_id     bigint not null references quiniela_users(id),
    match_id    bigint not null references quiniela_matches(id),
    pred_home   integer not null,
    pred_away   integer not null,
    created_at  timestamptz not null default now(),
    unique (user_id, match_id)
);

-- Nota: si usas la anon key, configura políticas RLS acordes.
-- Para una porra simple basta con la service_role key en el backend (no expuesta al cliente).
