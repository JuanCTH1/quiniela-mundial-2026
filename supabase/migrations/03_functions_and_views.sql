-- ── HELPER: tiempo de bloqueo ─────────────────────────────────────────────────
-- Bloqueo basado en hora programada, no en flag de cron.
CREATE OR REPLACE FUNCTION public.get_lock_time(p_match_id uuid)
RETURNS timestamptz LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT scheduled_time - (
    COALESCE((SELECT value::integer FROM public.settings WHERE key = 'bloqueo_minutos'), 15)
    * interval '1 minute'
  )
  FROM public.matches WHERE id = p_match_id;
$$;

CREATE OR REPLACE FUNCTION public.is_match_locked(p_match_id uuid)
RETURNS boolean LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT now() >= public.get_lock_time(p_match_id);
$$;

CREATE OR REPLACE FUNCTION public.prediction_count(p_match_id uuid)
RETURNS integer LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT COUNT(*)::integer FROM public.predictions WHERE match_id = p_match_id;
$$;

-- ── VISTA: puntuación por (usuario, partido) ──────────────────────────────────
-- Diferencia con signo (no absoluta): 2-0 vs 0-2 es FALLO, no DIFERENCIA.
-- Empate sin exacto: diferencia 0==0 → DIFERENCIA (3pts). Nunca 2pts para empates.
CREATE OR REPLACE VIEW public.scores AS
SELECT
  p.user_id,
  p.match_id,
  m.stage,
  m.home_team,
  m.away_team,
  m.scheduled_time,
  m.status,
  p.home_score   AS pred_home,
  p.away_score   AS pred_away,
  m.home_score_quiniela AS result_home,
  m.away_score_quiniela AS result_away,
  CASE
    WHEN m.home_score_quiniela IS NULL THEN NULL
    WHEN p.home_score = m.home_score_quiniela
     AND p.away_score = m.away_score_quiniela                          THEN r.pts_exacto
    WHEN (p.home_score - p.away_score) = (m.home_score_quiniela - m.away_score_quiniela) THEN r.pts_diferencia
    WHEN SIGN(p.home_score - p.away_score)::integer
       = SIGN(m.home_score_quiniela - m.away_score_quiniela)::integer  THEN r.pts_tendencia
    ELSE r.pts_fallo
  END AS points,
  CASE
    WHEN m.home_score_quiniela IS NULL THEN 'PENDIENTE'
    WHEN p.home_score = m.home_score_quiniela
     AND p.away_score = m.away_score_quiniela                          THEN 'EXACTO'
    WHEN (p.home_score - p.away_score) = (m.home_score_quiniela - m.away_score_quiniela) THEN 'DIFERENCIA'
    WHEN SIGN(p.home_score - p.away_score)::integer
       = SIGN(m.home_score_quiniela - m.away_score_quiniela)::integer  THEN 'TENDENCIA'
    ELSE 'FALLO'
  END AS result_type
FROM public.predictions p
JOIN public.matches m ON p.match_id = m.id
JOIN public.reglas_puntuacion r ON r.etapa = m.stage;

-- ── VISTA: leaderboard (Muro de la Vergüenza) ────────────────────────────────
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  pr.id            AS user_id,
  pr.display_name,
  pr.avatar_url,
  pr.is_admin,
  COALESCE(SUM(s.points), 0)                           AS total_points,
  COUNT(*) FILTER (WHERE s.result_type = 'EXACTO')     AS exact_count,
  COUNT(*) FILTER (WHERE s.result_type = 'DIFERENCIA') AS diff_count,
  COUNT(*) FILTER (WHERE s.result_type = 'TENDENCIA')  AS trend_count,
  COUNT(*) FILTER (WHERE s.result_type = 'FALLO')      AS fail_count,
  COUNT(*) FILTER (WHERE s.points IS NOT NULL)         AS matches_scored
FROM public.profiles pr
LEFT JOIN public.scores s ON s.user_id = pr.id
GROUP BY pr.id, pr.display_name, pr.avatar_url, pr.is_admin
ORDER BY total_points DESC, exact_count DESC, diff_count DESC;
