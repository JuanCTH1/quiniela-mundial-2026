CREATE TABLE h2h_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_a TEXT NOT NULL,
  team_b TEXT NOT NULL,
  team_a_goals INT NOT NULL,
  team_b_goals INT NOT NULL,
  year INT NOT NULL,
  stage TEXT,
  tournament TEXT NOT NULL DEFAULT 'FIFA World Cup',
  CONSTRAINT h2h_teams_order CHECK (team_a < team_b)
);

CREATE INDEX h2h_history_teams_idx ON h2h_history (team_a, team_b);

ALTER TABLE h2h_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "h2h_history_read" ON h2h_history FOR SELECT TO authenticated USING (true);
