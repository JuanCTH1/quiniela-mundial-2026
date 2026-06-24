-- ════════════════════════════════════════════════════════════════════════════
-- PLAYER_STATS
-- Goles y asistencias por jugador en el torneo.
-- Poblado por scripts/sync-scorers.mjs (football-data.org /competitions/WC/scorers).
-- getMatchContext() lee el jugador con más goles+asistencias por equipo.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.player_stats (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name   text NOT NULL,                   -- mismo formato que matches.home_team
  player_name text NOT NULL,
  goals       integer NOT NULL DEFAULT 0,
  assists     integer NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_name, player_name)
);

CREATE INDEX player_stats_team_idx ON public.player_stats (team_name);

CREATE TRIGGER player_stats_updated_at
  BEFORE UPDATE ON public.player_stats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY player_stats_read
  ON public.player_stats FOR SELECT TO authenticated USING (true);
