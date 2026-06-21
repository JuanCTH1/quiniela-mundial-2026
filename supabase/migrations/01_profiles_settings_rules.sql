-- ── PROFILES (extiende auth.users) ──────────────────────────────────────────
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url  text,
  is_admin    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── SETTINGS ─────────────────────────────────────────────────────────────────
CREATE TABLE public.settings (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

INSERT INTO public.settings (key, value) VALUES
  ('app_mode',          'test'),
  ('bloqueo_minutos',   '15'),
  ('mode_activated_at', ''),
  ('mode_activated_by', '');

-- ── REGLAS_PUNTUACION ────────────────────────────────────────────────────────
-- Las reglas son configuración, no código. Cambiar una regla = editar un valor.
CREATE TABLE public.reglas_puntuacion (
  etapa          text PRIMARY KEY,
  corte          text NOT NULL DEFAULT '90',
  pts_exacto     integer NOT NULL DEFAULT 4,
  pts_diferencia integer NOT NULL DEFAULT 3,
  pts_tendencia  integer NOT NULL DEFAULT 2,
  pts_fallo      integer NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.reglas_puntuacion (etapa, corte) VALUES
  ('GROUP',          '90'),
  ('ROUND_OF_16',    '90'),
  ('QUARTER_FINALS', '90'),
  ('SEMI_FINALS',    '90'),
  ('THIRD_PLACE',    '90'),
  ('FINAL',          '90');
