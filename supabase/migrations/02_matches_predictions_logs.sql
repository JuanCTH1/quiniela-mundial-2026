-- ── MATCHES ──────────────────────────────────────────────────────────────────
CREATE TABLE public.matches (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id          integer UNIQUE,
  stage                text NOT NULL,
  group_name           text,
  matchday             integer,
  home_team            text NOT NULL,
  away_team            text NOT NULL,
  is_placeholder       boolean NOT NULL DEFAULT false,
  scheduled_time       timestamptz NOT NULL,
  actual_start_time    timestamptz,
  status               text NOT NULL DEFAULT 'SCHEDULED',
  -- Resultado de la API
  home_score_fulltime  integer,
  away_score_fulltime  integer,
  home_score_regular   integer,   -- regularTime (solo 90')
  away_score_regular   integer,
  -- Resultado usado para la quiniela (determinado por corte de la etapa)
  home_score_quiniela  integer,
  away_score_quiniela  integer,
  early_unlock_at      timestamptz,
  result_source        text,      -- 'AUTOMATIC' | 'MANUAL_OVERRIDE'
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX matches_scheduled_time_idx ON public.matches (scheduled_time);
CREATE INDEX matches_status_idx ON public.matches (status);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── PREDICTIONS ──────────────────────────────────────────────────────────────
CREATE TABLE public.predictions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id     uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  home_score   integer NOT NULL CHECK (home_score >= 0),
  away_score   integer NOT NULL CHECK (away_score >= 0),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id)
);

CREATE INDEX predictions_user_idx  ON public.predictions (user_id);
CREATE INDEX predictions_match_idx ON public.predictions (match_id);

-- ── SYSTEM_LOGS ───────────────────────────────────────────────────────────────
CREATE TABLE public.system_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  log_type   text NOT NULL,
  match_id   uuid REFERENCES public.matches(id),
  message    text NOT NULL,
  details    jsonb,
  is_error   boolean NOT NULL DEFAULT false
);

CREATE INDEX system_logs_created_at_idx ON public.system_logs (created_at DESC);
CREATE INDEX system_logs_match_idx ON public.system_logs (match_id);

-- ── AUDIT_LOG ────────────────────────────────────────────────────────────────
CREATE TABLE public.audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  actor_id    uuid NOT NULL REFERENCES auth.users(id),
  action_type text NOT NULL,
  match_id    uuid REFERENCES public.matches(id),
  old_value   jsonb,
  new_value   jsonb,
  notes       text
);
