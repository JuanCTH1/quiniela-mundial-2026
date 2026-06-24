-- Cron para generar datos curiosos automáticamente conforme se definen los matchups.
-- La función es idempotente: salta partidos que ya tienen facts.
-- Fechas calculadas para WC 2026 (zona UTC):
--   2 Jul  → Ronda de 32 (fase grupos termina ~30 Jun)
--   9 Jul  → Cuartos de final (R32 termina ~8 Jul)
--  14 Jul  → Semifinales (QF termina ~13 Jul)
--  19 Jul  → Final + 3er lugar (SF termina ~18 Jul)

SELECT cron.schedule(
  'generate-facts-r32',
  '0 14 2 7 *',
  $$
    SELECT net.http_post(
      url  := 'https://wltltpzvscgpnfwvgfmt.supabase.co/functions/v1/generate-facts',
      body := '{}'::jsonb
    )
  $$
);

SELECT cron.schedule(
  'generate-facts-qf',
  '0 14 9 7 *',
  $$
    SELECT net.http_post(
      url  := 'https://wltltpzvscgpnfwvgfmt.supabase.co/functions/v1/generate-facts',
      body := '{}'::jsonb
    )
  $$
);

SELECT cron.schedule(
  'generate-facts-sf',
  '0 14 14 7 *',
  $$
    SELECT net.http_post(
      url  := 'https://wltltpzvscgpnfwvgfmt.supabase.co/functions/v1/generate-facts',
      body := '{}'::jsonb
    )
  $$
);

SELECT cron.schedule(
  'generate-facts-final',
  '0 14 19 7 *',
  $$
    SELECT net.http_post(
      url  := 'https://wltltpzvscgpnfwvgfmt.supabase.co/functions/v1/generate-facts',
      body := '{}'::jsonb
    )
  $$
);
