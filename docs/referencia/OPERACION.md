# Operación — quiniela-mundial-2026 (referencia viva)
> Referencia operativa actual: URLs, usuarios en prod, crons, edge functions, features desplegadas.
> Rescatado del viejo `ESTADO_PROYECTO.md` en la migración de memoria Aegis (2026-07-13) para que
> siga siendo referencia consultable y no historia archivada. Actualizar cuando cambie la infra.

## URLs y accesos
- **Prod:** https://quiniela-production-bdd7.up.railway.app
- **Supabase:** proyecto `wltltpzvscgpnfwvgfmt`
- **GitHub:** rama `master` → Railway auto-deploy · staging: `develop`
- **Sentry:** `jcth-2v.sentry.io`, proyecto `quiniela` (observabilidad Aegis, no toca el flujo de juego)

## Usuarios en producción
| Jugador | Email | Display | Estado |
|---|---|---|---|
| Juan Carlos (admin) | juancarlostatto@gmail.com | JCT | ✅ |
| Ernesto Inzunza | inzunza.ernesto@gmail.com | Ernesto | ✅ |
| Gustavo Inzunza | gustavoinzunza30@gmail.com | Gus | ✅ |
| Javier Emmanuel | (confirmar email) | Javier | ✅ |
| Manuel Rodríguez | (confirmar email) | Mani | ✅ |
| Jesús Tunal | jesus.tunaal@gmail.com | Chuy | ✅ |

## Asignación de grupos por jugador
| Jugador | Grupos | Selecciones clave |
|---|---|---|
| JCT | GROUP_L + GROUP_K | England, Portugal |
| Ernesto | GROUP_E + GROUP_G | Germany, Belgium |
| Javier | GROUP_B + GROUP_I | Canada, France |
| Chuy | GROUP_C + GROUP_F | Brazil, Netherlands |
| Mani | GROUP_J + GROUP_D | Argentina, USA |
| Gus | GROUP_A + GROUP_H | Mexico, Spain |

## Crons activos
| Cron | Frecuencia | Para qué |
|---|---|---|
| `update-matches-prod` | cada 2min | Marcadores en vivo |
| `update-matches-2min` (QA) | cada 10min (bajado de 2min el 2026-07-03) | Marcadores en vivo QA |
| `sync-fixtures` + `sync-fixtures-jul` | cada hora Jun 27–Jul 19 | Equipos reales en knockout |
| `generate-facts-r16` / `-qf` / `-sf` / `-final` | fechas fijas 14:00 UTC | Facts por ronda |
| `sync-referees` | cada 3h | Árbitros |
| `sync-scorers` | cada 6h | Goleadores |
| `update-odds` | cada 2h | Cuotas (The-Odds-API, 500 req/mes). Apunta a Edge Function Supabase. |
| `health-check-daily` | 08:00 UTC | Alertas de salud + email Resend |

## Edge Functions en Supabase
| Función | Versión | Para qué |
|---|---|---|
| `generate-facts` | v4 | 3 facts/partido con Haiku + web_search. `reviewed: true` por default. |
| `health-check` | v2 | 5 checks, alerta 48h, email Resend. |
| `update-odds` | v6 | Cuotas The-Odds-API → `team_odds`. Borra equipos eliminados (guardia ≤4/ciclo). |

## Features en producción
- Timer en vivo (`~45+5' · 1T` → MT/2T/ET/PEN) · goles en vivo bajo banderas · auto-refresh 20s ·
  banner en 5s · drawer de análisis (forma, H2H, sede, árbitro, DTs, goleadores, facts, momios) ·
  botón "↓ Siguiente partido" · scroll restore · sync de fixtures knockout · health-check v2 +
  email Resend · facts auto-aprobados · árbitros vía web (Haiku + web_search) · tab Sorteo en
  /ranking · panel /admin (ContextHealthPanel + AdminTools) · display de penales en lista/detalle/banner.
