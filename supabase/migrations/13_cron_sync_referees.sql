-- Cron para actualizar árbitros desde football-data.org.
-- Cada 3 horas — FIFA los publica normalmente 24-48h antes del partido.
-- Usa endpoint bulk /competitions/WC/matches (1 request, sin rate-limit issues).

SELECT cron.schedule(
  'sync-referees',
  '0 */3 * * *',
  $$
    SELECT net.http_post(
      url  := 'https://wltltpzvscgpnfwvgfmt.supabase.co/functions/v1/sync-referees',
      body := '{}'::jsonb
    )
  $$
);
