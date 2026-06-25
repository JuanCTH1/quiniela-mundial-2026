-- Cron para sincronizar fixtures de rondas eliminatorias cuando el bracket queda definido.
-- Corre cada hora desde el 27 Jun (antes de la Ronda de 32) hasta el 19 Jul (Final).
-- El endpoint es idempotente: skip si el partido sigue TBD en la API.
SELECT cron.schedule(
  'sync-fixtures',
  '0 * 27-30 6 *',
  $$
    SELECT net.http_get(
      url     := 'https://quiniela-production-bdd7.up.railway.app/api/cron/sync-fixtures',
      headers := '{"Authorization": "Bearer 339f61e0a9f49c56c865307d8ac362a3e772de98a282107abf85aa7ca7e9f452"}'::jsonb
    )
  $$
);

-- Julio: cubre R32, cuartos, semis y final
SELECT cron.schedule(
  'sync-fixtures-jul',
  '0 * 1-19 7 *',
  $$
    SELECT net.http_get(
      url     := 'https://quiniela-production-bdd7.up.railway.app/api/cron/sync-fixtures',
      headers := '{"Authorization": "Bearer 339f61e0a9f49c56c865307d8ac362a3e772de98a282107abf85aa7ca7e9f452"}'::jsonb
    )
  $$
);

-- Corregir fecha de generate-facts-r32: de 2 Jul a 27 Jun (día antes del primer R32)
SELECT cron.unschedule('generate-facts-r32');
SELECT cron.schedule(
  'generate-facts-r32',
  '0 14 27 6 *',
  $$
    SELECT net.http_post(
      url  := 'https://wltltpzvscgpnfwvgfmt.supabase.co/functions/v1/generate-facts',
      body := '{}'::jsonb
    )
  $$
);
