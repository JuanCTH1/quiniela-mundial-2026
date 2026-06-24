-- H2H histórico de Mundiales para los 72 pares de grupo de WC 2026.
-- Fuente: web search (sesión Claude, sin API key externa).
-- team_a < team_b alfabéticamente siempre.

INSERT INTO h2h_history (team_a, team_b, team_a_goals, team_b_goals, year, stage, tournament) VALUES

-- Grupo B: Brazil, Scotland, Morocco, Haiti
('Brazil', 'Scotland', 0, 0, 1974, 'Group stage', 'FIFA World Cup'),
('Brazil', 'Scotland', 4, 1, 1982, 'Group stage', 'FIFA World Cup'),
('Brazil', 'Scotland', 1, 0, 1990, 'Group stage', 'FIFA World Cup'),
('Brazil', 'Scotland', 2, 1, 1998, 'Group stage', 'FIFA World Cup'),
('Brazil', 'Morocco',  3, 0, 1998, 'Group stage', 'FIFA World Cup'),
('Morocco', 'Scotland', 3, 0, 1998, 'Group stage', 'FIFA World Cup'),

-- Grupo C: Spain, Saudi Arabia, Cape Verde, Uruguay
('Saudi Arabia', 'Spain',   0, 1, 2006, 'Group stage', 'FIFA World Cup'),
('Spain', 'Uruguay',        2, 2, 1950, 'Group stage', 'FIFA World Cup'),
('Spain', 'Uruguay',        0, 0, 1990, 'Group stage', 'FIFA World Cup'),
('Saudi Arabia', 'Uruguay', 0, 1, 2018, 'Group stage', 'FIFA World Cup'),

-- Grupo D: Netherlands, Japan, Tunisia, Sweden
('Japan', 'Netherlands', 0, 1, 2010, 'Group stage', 'FIFA World Cup'),
('Japan', 'Tunisia',     2, 0, 2002, 'Group stage', 'FIFA World Cup'),
('Netherlands', 'Sweden', 0, 0, 1974, 'Group stage', 'FIFA World Cup'),

-- Grupo E: Germany, Ecuador, Ivory Coast, Curaçao
('Ecuador', 'Germany', 0, 3, 2006, 'Group stage', 'FIFA World Cup'),

-- Grupo H: France, Norway, Senegal, Iraq
('France', 'Senegal', 0, 1, 2002, 'Group stage', 'FIFA World Cup'),

-- Grupo I: Croatia, England, Ghana, Panama
('Croatia', 'England', 2, 1, 2018, 'Semifinal', 'FIFA World Cup'),
('England', 'Panama',  6, 1, 2018, 'Group stage', 'FIFA World Cup'),

-- Grupo K: Algeria, Jordan, Argentina, Austria
('Algeria', 'Austria', 0, 2, 1982, 'Group stage', 'FIFA World Cup'),

-- Grupo A: Mexico, Czechia, South Africa, Korea Republic
('Korea Republic', 'Mexico', 1, 3, 1998, 'Group stage', 'FIFA World Cup'),
('Korea Republic', 'Mexico', 1, 2, 2018, 'Group stage', 'FIFA World Cup'),
('Czechia', 'Mexico',        1, 3, 1962, 'Group stage', 'FIFA World Cup'); -- como Checoslovaquia
