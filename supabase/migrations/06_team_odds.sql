-- Probabilidades de ganar el Mundial por equipo, calculadas desde cuotas de apuestas.
-- Un registro por equipo, actualizado por el Edge Function update-odds (cron diario).
CREATE TABLE IF NOT EXISTS team_odds (
  team_name   TEXT         PRIMARY KEY,
  probability DECIMAL(8,6) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE team_odds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_odds_read"
  ON team_odds FOR SELECT TO authenticated USING (true);
