-- ── THROTTLE DEL CRON DE QA ──────────────────────────────────────────────────
-- update-matches-2min (QA) y update-matches-prod corrían ambos cada 2 min,
-- casi al mismo segundo, contra la misma cuota de football-data.org.
-- Resultado: ~1 partido con 429 por ciclo (colisión de rate-limit por minuto).
-- QA no necesita datos en vivo tan frescos como prod durante el torneo real,
-- así que se reduce su frecuencia a cada 10 min en vez de desactivarlo.
SELECT cron.alter_job(
  job_id   := (SELECT jobid FROM cron.job WHERE jobname = 'update-matches-2min'),
  schedule := '*/10 * * * *'
);
