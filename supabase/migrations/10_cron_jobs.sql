-- Cron jobs para el torneo.
-- update-match-odds: 3 veces al día (08:00, 14:00, 20:00 UTC).
-- Cuota The Odds API: ~90 requests/mes para esta función — dentro del free tier de 500/mes.
-- Las demás funciones ya tienen cron configurado (update-odds, update-matches).

SELECT cron.schedule(
  'update-match-odds',
  '0 8,14,20 * * *',
  $$
    SELECT net.http_post(
      url    := 'https://wltltpzvscgpnfwvgfmt.supabase.co/functions/v1/update-match-odds',
      body   := '{}'::jsonb
    )
  $$
);
