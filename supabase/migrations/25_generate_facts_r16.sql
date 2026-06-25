-- Agrega generate-facts-r16 que faltaba (R16 inicia 4 Jul, facts el 3 Jul).
-- También adelanta generate-facts-qf al 8 Jul (un día antes del primer QF)
-- para evitar que dispare el mismo día que el partido.

SELECT cron.schedule(
  'generate-facts-r16',
  '0 14 3 7 *',
  $$
    SELECT net.http_post(
      url     := 'https://wltltpzvscgpnfwvgfmt.supabase.co/functions/v1/generate-facts',
      headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsdGx0cHp2c2NncG5md3ZnZm10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTU4MTYsImV4cCI6MjA5NzI5MTgxNn0.3aVFCvbzJcJjvqbMUZ98HmzNtbDbX3KhsMmI69wbhIg"}'::jsonb,
      body    := '{}'::jsonb
    )
  $$
);

-- Adelantar QF al 8 Jul (antes del primer partido del 9 Jul)
SELECT cron.unschedule('generate-facts-qf');
SELECT cron.schedule(
  'generate-facts-qf',
  '0 14 8 7 *',
  $$
    SELECT net.http_post(
      url     := 'https://wltltpzvscgpnfwvgfmt.supabase.co/functions/v1/generate-facts',
      headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsdGx0cHp2c2NncG5md3ZnZm10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTU4MTYsImV4cCI6MjA5NzI5MTgxNn0.3aVFCvbzJcJjvqbMUZ98HmzNtbDbX3KhsMmI69wbhIg"}'::jsonb,
      body    := '{}'::jsonb
    )
  $$
);
