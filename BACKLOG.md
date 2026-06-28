# Backlog — Quiniela Overrated 2026

## Pendiente

### Cambiar cron de odds a 1x/hora
**Contexto:** Actualmente el cron `update-odds-daily` corre 2x/día (8 AM y 8 PM UTC). The-Odds-API free tier tiene 500 req/mes (reset mensual), lo que permite perfectamente actualizaciones cada hora.

**SQL a ejecutar en Supabase (SQL Editor o MCP execute_sql):**
```sql
SELECT cron.unschedule('update-odds-daily');
SELECT cron.schedule(
  'update-odds-hourly',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://wltltpzvscgpnfwvgfmt.supabase.co/functions/v1/update-odds',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```
**Cálculo de cuota:** ~456 req en julio (31 días × 24 horas menos ~264 ya usados en junio) — holgado dentro de los 500/mes.

---

### Minuto a minuto con API-Football (antes de 32avos)
**Contexto:** API-Football tiene 100 req/día en free tier. Con ≤4 partidos/día en fase de grupos y polling cada 5 minutos, son ~50 req/día — cabe en free tier sin pagar.

**Diseño acordado:**
- Evento: cuando un partido pasa a IN_PLAY, activar polling de `/fixtures/events?fixture={id}` cada 5 min
- Solo durante la duración del partido (~90-120 min por partido)
- Mostrar eventos de gol, tarjeta, cambio en UI del partido en tiempo real
- Implementar antes de que arranquen los 32avos de final (estimado: julio 2026)

**Key:** necesita API key de API-Football (confirmar si se usa free tier o se paga)

---

## Completado

- [x] Tab Sorteo en /ranking con probabilidades del Mundial (2026-06-22)
- [x] Edge Function update-odds + pg_cron + tabla team_odds (2026-06-22)
- [x] Display names actualizados para todos los jugadores reales (2026-06-22)
- [x] Borrar pronósticos anteriores a partido X desde /admin (2026-06-21)
- [x] Onboarding completo de los 6 jugadores en prod (2026-06-21)
- [x] pg_cron prod para update-matches (2026-06-21)
