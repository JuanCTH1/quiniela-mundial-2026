-- ── PROFILES ─────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
  );

-- ── SETTINGS ─────────────────────────────────────────────────────────────────
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY settings_select ON public.settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY settings_update ON public.settings
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    AND (
      key NOT IN ('app_mode', 'mode_activated_at', 'mode_activated_by')
      OR (SELECT value FROM public.settings WHERE key = 'app_mode') = 'test'
    )
  );

-- ── REGLAS_PUNTUACION ────────────────────────────────────────────────────────
ALTER TABLE public.reglas_puntuacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY rules_select ON public.reglas_puntuacion
  FOR SELECT TO authenticated USING (true);

CREATE POLICY rules_update ON public.reglas_puntuacion
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    AND (SELECT value FROM public.settings WHERE key = 'app_mode') = 'test'
  );

-- ── MATCHES ──────────────────────────────────────────────────────────────────
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY matches_select ON public.matches
  FOR SELECT TO authenticated USING (true);
-- INSERT/UPDATE solo vía service_role (cron + Modo Dios server-side)

-- ── PREDICTIONS — lo más sagrado ─────────────────────────────────────────────
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- Propias siempre; ajenas solo después del bloqueo o liberación anticipada
CREATE POLICY predictions_select ON public.predictions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_match_locked(match_id)
    OR (SELECT early_unlock_at FROM public.matches WHERE id = match_id) IS NOT NULL
  );

-- Solo antes del bloqueo, solo el propio user, solo partidos SCHEDULED
CREATE POLICY predictions_insert ON public.predictions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT public.is_match_locked(match_id)
    AND (SELECT status FROM public.matches WHERE id = match_id) = 'SCHEDULED'
  );

-- Solo antes del bloqueo, solo el propio user
CREATE POLICY predictions_update ON public.predictions
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND NOT public.is_match_locked(match_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND NOT public.is_match_locked(match_id)
  );

-- Sin política DELETE: nadie puede borrar predicciones vía cliente

-- ── SYSTEM_LOGS ───────────────────────────────────────────────────────────────
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY logs_select ON public.system_logs
  FOR SELECT TO authenticated
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

-- ── AUDIT_LOG — visible para todos los 6 ─────────────────────────────────────
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_select ON public.audit_log
  FOR SELECT TO authenticated USING (true);
