-- Actualiza los crons de generate-facts para pasar Authorization header.
-- La función tiene verify_jwt=true (default), necesita un JWT válido.
-- Usa el anon key del proyecto (público, no sensible).

SELECT cron.schedule(
  'generate-facts-r32',
  '0 14 2 7 *',
  $$
    SELECT net.http_post(
      url     := 'https://wltltpzvscgpnfwvgfmt.supabase.co/functions/v1/generate-facts',
      headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsdGx0cHp2c2NncG5md3ZnZm10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTU4MTYsImV4cCI6MjA5NzI5MTgxNn0.3aVFCvbzJcJjvqbMUZ98HmzNtbDbX3KhsMmI69wbhIg"}'::jsonb,
      body    := '{}'::jsonb
    )
  $$
);

SELECT cron.schedule(
  'generate-facts-qf',
  '0 14 9 7 *',
  $$
    SELECT net.http_post(
      url     := 'https://wltltpzvscgpnfwvgfmt.supabase.co/functions/v1/generate-facts',
      headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsdGx0cHp2c2NncG5md3ZnZm10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTU4MTYsImV4cCI6MjA5NzI5MTgxNn0.3aVFCvbzJcJjvqbMUZ98HmzNtbDbX3KhsMmI69wbhIg"}'::jsonb,
      body    := '{}'::jsonb
    )
  $$
);

SELECT cron.schedule(
  'generate-facts-sf',
  '0 14 14 7 *',
  $$
    SELECT net.http_post(
      url     := 'https://wltltpzvscgpnfwvgfmt.supabase.co/functions/v1/generate-facts',
      headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsdGx0cHp2c2NncG5md3ZnZm10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTU4MTYsImV4cCI6MjA5NzI5MTgxNn0.3aVFCvbzJcJjvqbMUZ98HmzNtbDbX3KhsMmI69wbhIg"}'::jsonb,
      body    := '{}'::jsonb
    )
  $$
);

SELECT cron.schedule(
  'generate-facts-final',
  '0 14 19 7 *',
  $$
    SELECT net.http_post(
      url     := 'https://wltltpzvscgpnfwvgfmt.supabase.co/functions/v1/generate-facts',
      headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsdGx0cHp2c2NncG5md3ZnZm10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTU4MTYsImV4cCI6MjA5NzI5MTgxNn0.3aVFCvbzJcJjvqbMUZ98HmzNtbDbX3KhsMmI69wbhIg"}'::jsonb,
      body    := '{}'::jsonb
    )
  $$
);
