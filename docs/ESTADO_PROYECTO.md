# Estado del Proyecto — Quiniela Overrated 2026

> Actualizado: 2026-06-28

## Estado general

**Fase activa: Torneo en curso — Ronda de 32 en curso (28 Jun). Modo Real pendiente de activar.**

La app está en producción con todos los jugadores onboardeados. Fase de grupos terminó el 27 Jun. La Ronda de 32 inició el 28 Jun. Sistema de alertas de salud activo (pg_cron health-check diario 08:00 UTC + email Resend). Facts auto-aprobados, panel /admin sin ruido de alertas falsas.

## Usuarios en producción

| Jugador | Email | Display name | Estado |
|---|---|---|---|
| Juan Carlos (JCT, admin) | juancarlostatto@gmail.com | JCT | ✅ activo |
| Ernesto Inzunza | inzunza.ernesto@gmail.com | Ernesto | ✅ nombre actualizado vía SQL |
| Gustavo Inzunza | gustavoinzunza30@gmail.com | Gus | ✅ nombre actualizado vía SQL |
| Javier Emmanuel | (confirmar email) | Javier | ✅ nombre actualizado vía SQL |
| Manuel Rodríguez | (confirmar email) | Mani | ✅ nombre actualizado vía SQL |
| Jesús Tunal | jesus.tunaal@gmail.com | Chuy | ✅ nombre actualizado vía SQL |

## URLs

- **Prod:** https://quiniela-production-bdd7.up.railway.app
- **QA:** (Railway QA env, rama develop)
- **Supabase:** proyecto `wltltpzvscgpnfwvgfmt`
- **Edge Function:** `update-odds` — actualiza probabilidades de ganar el Mundial 2x/día (pg_cron)

## Feature Sorteo

Tab adicional en `/ranking?tab=sorteo`. Muestra probabilidad de ganar el Mundial por jugador, calculada desde cuotas de The-Odds-API (outright WC winner, mercado EU, normalizado para quitar margen de casa). Cards expandibles con los 8 equipos por jugador. Cron actual: 2x/día (8 AM + 8 PM UTC). Pendiente: mover a 1x/hora.

Asignación grupos:
- JCT: GROUP_L (England) + GROUP_K (Portugal)
- Ernesto: GROUP_E (Germany) + GROUP_G (Belgium)
- Javier: GROUP_B (Canada) + GROUP_I (France)
- Chuy: GROUP_C (Brazil) + GROUP_F (Netherlands)
- Mani: GROUP_J (Argentina) + GROUP_D (USA)
- Gus: GROUP_A (Mexico) + GROUP_H (Spain)

## Crons activos y su cobertura del torneo

| Cron | Cuándo | Para qué |
|---|---|---|
| `update-matches-prod` | cada 2min | Marcadores en vivo |
| `sync-fixtures` + `sync-fixtures-jul` | cada hora Jun 27–Jul 19 | Equipos reales en knockout |
| `generate-facts-r32` | Jun 27 14:00 UTC ✅ | Facts R32 (ejecutado, 48 facts generados) |
| `generate-facts-r16` | Jul 3 14:00 UTC | Facts R16 |
| `generate-facts-qf` | Jul 8 14:00 UTC | Facts QF |
| `generate-facts-sf` | Jul 14 14:00 UTC | Facts SF |
| `generate-facts-final` | Jul 19 14:00 UTC | Facts Final |
| `sync-referees` | cada 3h | Árbitros |
| `sync-scorers` | cada 6h | Goleadores |
| `update-odds-hourly` | cada hora | Cuotas Sorteo |
| `health-check-daily` | 08:00 UTC daily | Alertas de salud + email |

## Edge Functions en Supabase

| Función | versión | Para qué |
|---|---|---|
| `generate-facts` | v4 | Genera 3 facts/partido con Haiku + web_search. `reviewed: true` por default. |
| `health-check` | v2 | 5 checks de salud, alerta 48h TBD, email vía Resend si hay alertas. |
| `update-odds` | v1 | Cuotas The-Odds-API → `team_odds` |

## Features en producción (Jun 28)

- **Goles en vivo**: `⚽ 23' Vinícius Jr. (p)` bajo cada bandera en lista y detalle de partido.
- **Minuto en vivo**: `~47' · 2T` ticking cada 30s (estimado) o exacto cuando la API lo envía.
- **Auto-refresh lista de partidos**: cada 20s cuando hay partidos en vivo (LiveRefresher).
- **Banner actualiza en 5s**: poll de 5s (antes 12s) para goles en tiempo real.
- **Sync de fixtures knockout**: automático cada hora Jun 27–Jul 19; manual ya corrió y actualizó Sudáfrica vs Canadá.
- **Sistema de salud** (Jun 28): health-check Edge Function v2 + pg_cron `health-check-daily` 08:00 UTC + email Resend si hay alertas. Panel /admin con ContextHealthPanel.
- **Facts auto-aprobados** (Jun 28): generate-facts v4 inserta con `reviewed: true`. 120 facts existentes aprobados por SQL. Panel sin chip amarillo de "sin revisar".
- **Árbitros via web** (Jun 28): botón "Buscar árbitros" en AdminTools llama Claude Haiku + web_search para próximos 7 días.
- **Alertas TBD limitadas a 48h** (Jun 28): en `/admin` page.tsx y health-check Edge Function (antes 7 días → demasiado ruido).
- **Forma reciente → "Resultados en el torneo"** (Jun 28): `computeForm` usa `home_score_quiniela` (corrección de bug); label renombrado.

## Lo primero en próxima sesión

1. **Ejecutar backfill de scores** para los 32 partidos de jornada-1 con null (botón en /admin → Herramientas de datos → "Backfill scores jornada 1")
2. Árbitros R32 restantes (12 partidos Jun 30–Jul 4) — FIFA anuncia 24-48h antes; usar botón "Buscar árbitros"
3. Activar "Modo Real" desde /admin cuando el grupo esté listo
4. Confirmar resultado válido en eliminatorias (pendiente grupal)

## Pendientes grupales (confirmar con el grupo)

- [ ] Resultado válido en eliminatorias: ¿90', 120' o penales?
- [ ] ¿Cuántos minutos de bloqueo antes del kickoff? (actualmente 15)
- [ ] ¿A partir de qué partido cuentan los pronósticos? (hay botón en /admin)
