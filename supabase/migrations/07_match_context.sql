-- ════════════════════════════════════════════════════════════════════════════
-- CONTEXTO DEL PARTIDO
-- Sede, metadata de equipos, datos curiosos (facts) y momios por partido.
-- Todo aditivo: no toca lógica de predicciones ni resultados existente.
-- ════════════════════════════════════════════════════════════════════════════

-- ── VENUES ───────────────────────────────────────────────────────────────────
-- Datos fijos de los 16 estadios. Se pueblan una vez; no cambian en el torneo.
CREATE TABLE public.venues (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,     -- "Estadio Azteca"
  city        text NOT NULL,            -- "Ciudad de México"
  country     text NOT NULL,            -- 'MEX' | 'USA' | 'CAN'
  capacity    integer,
  surface     text,                     -- "Césped natural"
  opened_year integer,
  latitude    decimal(9,6) NOT NULL,
  longitude   decimal(9,6) NOT NULL,
  image_url   text,                     -- satélite en Supabase Storage; null = solo link a mapa
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Cada partido se juega en una sede. Columna aditiva y nullable: los partidos
-- existentes no se rompen mientras se puebla.
ALTER TABLE public.matches
  ADD COLUMN venue_id uuid REFERENCES public.venues(id);

CREATE INDEX matches_venue_idx ON public.matches (venue_id);

-- ── TEAM_METADATA ────────────────────────────────────────────────────────────
-- DT, altura y edad promedio por selección. Keyed por team_name igual que team_odds.
CREATE TABLE public.team_metadata (
  team_name   text PRIMARY KEY,         -- mismo formato que matches.home_team
  coach       text,
  avg_height  decimal(5,1),             -- cm
  avg_age     decimal(4,1),             -- años
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER team_metadata_updated_at
  BEFORE UPDATE ON public.team_metadata
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── MATCH_FACTS ──────────────────────────────────────────────────────────────
-- Datos curiosos generados por Claude. NO se muestran hasta reviewed = true.
CREATE TABLE public.match_facts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  category   text NOT NULL,             -- 'historico' | 'jugador' | 'narrativo'
  body       text NOT NULL,
  reviewed   boolean NOT NULL DEFAULT false,
  position   integer NOT NULL DEFAULT 0,  -- orden de despliegue
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX match_facts_match_idx ON public.match_facts (match_id);
CREATE INDEX match_facts_reviewed_idx ON public.match_facts (match_id, reviewed);

CREATE TRIGGER match_facts_updated_at
  BEFORE UPDATE ON public.match_facts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── MATCH_ODDS ───────────────────────────────────────────────────────────────
-- Momios por partido (mercado h2h de The Odds API). Probabilidades implícitas
-- normalizadas (sin margen de la casa). Un registro por partido.
CREATE TABLE public.match_odds (
  match_id    uuid PRIMARY KEY REFERENCES public.matches(id) ON DELETE CASCADE,
  prob_home   decimal(5,4),             -- 0.0000–1.0000
  prob_draw   decimal(5,4),
  prob_away   decimal(5,4),
  bookmakers  integer,                  -- nº de casas promediadas (transparencia)
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER match_odds_updated_at
  BEFORE UPDATE ON public.match_odds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Lectura para usuarios autenticados; escritura solo vía service_role (crons/seed).
-- Facts: los jugadores solo ven los aprobados. El service_role salta RLS, así que
-- el admin/cron sí ve y edita los no-revisados.
ALTER TABLE public.venues        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_facts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_odds    ENABLE ROW LEVEL SECURITY;

CREATE POLICY venues_read
  ON public.venues FOR SELECT TO authenticated USING (true);

CREATE POLICY team_metadata_read
  ON public.team_metadata FOR SELECT TO authenticated USING (true);

CREATE POLICY match_facts_read
  ON public.match_facts FOR SELECT TO authenticated USING (reviewed = true);

CREATE POLICY match_odds_read
  ON public.match_odds FOR SELECT TO authenticated USING (true);
