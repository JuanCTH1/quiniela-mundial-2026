-- Agrega datos del árbitro al partido. Nullable: se puebla cuando la API lo asigna
-- (~3-5 días antes del kickoff o al finalizar). Estrictamente aditivo.
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS referee TEXT,
  ADD COLUMN IF NOT EXISTS referee_country TEXT;
