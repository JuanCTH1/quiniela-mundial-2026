# Estado del Proyecto — Quiniela Overrated 2026

> Actualizado: 2026-06-22

## Estado general

**Fase activa: Torneo en curso / Modo Real pendiente**

La app está en producción con todos los jugadores onboardeados. El torneo empezó el 2026-06-11. Feature "Sorteo" desplegada en prod (tab adicional en /ranking). Pending: activar "modo real" cuando el grupo esté listo.

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

## Lo primero en próxima sesión

1. Activar "Modo Real" desde /admin cuando el grupo esté listo
2. Cambiar cron de odds a 1x/hora (SQL listo, ver BACKLOG.md)
3. Confirmar resultado válido en eliminatorias (pendiente grupal)

## Pendientes grupales (confirmar con el grupo)

- [ ] Resultado válido en eliminatorias: ¿90', 120' o penales?
- [ ] ¿Cuántos minutos de bloqueo antes del kickoff? (actualmente 15)
- [ ] ¿A partir de qué partido cuentan los pronósticos? (hay botón en /admin)
