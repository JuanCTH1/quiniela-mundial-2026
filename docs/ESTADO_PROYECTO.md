# Estado del Proyecto — Quiniela Overrated 2026

> Actualizado: 2026-06-25

## Estado general

**Fase activa: Torneo en curso / Modo Real pendiente — Ronda de 32 el 28 Jun**

La app está en producción con todos los jugadores onboardeados. El torneo empezó el 2026-06-11. La fase de grupos termina el 27 Jun; la Ronda de 32 inicia el 28 Jun. El sistema de fixtures automático (`sync-fixtures`) ya está activo y actualizó el primer R32 confirmado (Sudáfrica vs Canadá). Pending: activar "modo real" cuando el grupo esté listo.

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

## Features en producción (Jun 25)

- **Goles en vivo**: `⚽ 23' Vinícius Jr. (p)` bajo cada bandera en lista y detalle de partido.
- **Minuto en vivo**: `~47' · 2T` ticking cada 30s (estimado) o exacto cuando la API lo envía.
- **Auto-refresh lista de partidos**: cada 20s cuando hay partidos en vivo (LiveRefresher).
- **Banner actualiza en 5s**: poll de 5s (antes 12s) para goles en tiempo real.
- **Sync de fixtures knockout**: automático cada hora Jun 27–Jul 19; manual ya corrió y actualizó Sudáfrica vs Canadá.

## Crons activos y su cobertura del torneo

| Cron | Cuándo | Para qué |
|---|---|---|
| `update-matches-prod` | cada 2min | Marcadores en vivo |
| `sync-fixtures` + `sync-fixtures-jul` | cada hora Jun 27–Jul 19 | Equipos reales en knockout |
| `generate-facts-r32` | Jun 27 14:00 UTC | Facts R32 |
| `generate-facts-r16` | Jul 3 14:00 UTC | Facts R16 ← nuevo |
| `generate-facts-qf` | Jul 8 14:00 UTC | Facts QF ← adelantado |
| `generate-facts-sf` | Jul 14 14:00 UTC | Facts SF |
| `generate-facts-final` | Jul 19 14:00 UTC | Facts Final |
| `sync-referees` | cada 3h | Árbitros |
| `sync-scorers` | cada 6h | Goleadores |
| `update-odds-hourly` | cada hora | Cuotas Sorteo |

## Lo primero en próxima sesión

1. Activar "Modo Real" desde /admin cuando el grupo esté listo
2. Confirmar resultado válido en eliminatorias (pendiente grupal)
3. Verificar que sync-fixtures siga actualizando el bracket conforme cierran los grupos (27-28 Jun)

## Pendientes grupales (confirmar con el grupo)

- [ ] Resultado válido en eliminatorias: ¿90', 120' o penales?
- [ ] ¿Cuántos minutos de bloqueo antes del kickoff? (actualmente 15)
- [ ] ¿A partir de qué partido cuentan los pronósticos? (hay botón en /admin)
