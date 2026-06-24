-- Cron para sincronizar goleadores/asistentes del torneo desde football-data.org.
-- Cada 6 horas (00, 06, 12, 18 UTC) — cubre todos los slots de partidos del Mundial.
-- Requiere que FOOTBALL_DATA_API_KEY esté seteado como secret en Supabase Functions.

SELECT cron.schedule(
  'sync-scorers',
  '0 */6 * * *',
  $$
    SELECT net.http_post(
      url  := 'https://wltltpzvscgpnfwvgfmt.supabase.co/functions/v1/sync-scorers',
      body := '{}'::jsonb
    )
  $$
);
