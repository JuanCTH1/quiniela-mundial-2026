# Estado del Proyecto — Quiniela Overrated 2026

> Actualizado: 2026-06-30 (cierre sesión)

## Estado general

**Fase activa: Torneo en curso — Ronda de 32 / inicio R16. Modo Real activo.**

App en prod con los 6 jugadores. Fase de grupos terminó Jun 27. R32 en curso. Timer en vivo OK. Drawer de análisis OK. Display de penales implementado en lista/detalle/banner (resultado a 120' + `(penH) X–Y (penA)`). `update-odds` ahora limpia equipos eliminados. 8/12 árbitros R32 cargados (resto los anuncia FIFA 24-48h antes). Alineación de marcador en card corregida (vertical + centrado mobile).

**Pendiente del grupo:** decisión sobre los 3pts de Javier por tendencia en Holanda-Marruecos (ganados por el bug de penales ya corregido).

## Usuarios en producción

| Jugador | Email | Display name | Estado |
|---|---|---|---|
| Juan Carlos (JCT, admin) | juancarlostatto@gmail.com | JCT | ✅ activo |
| Ernesto Inzunza | inzunza.ernesto@gmail.com | Ernesto | ✅ activo |
| Gustavo Inzunza | gustavoinzunza30@gmail.com | Gus | ✅ activo |
| Javier Emmanuel | (confirmar email) | Javier | ✅ activo |
| Manuel Rodríguez | (confirmar email) | Mani | ✅ activo |
| Jesús Tunal | jesus.tunaal@gmail.com | Chuy | ✅ activo |

## URLs

- **Prod:** https://quiniela-production-bdd7.up.railway.app
- **Supabase:** proyecto `wltltpzvscgpnfwvgfmt`
- **GitHub:** rama `master` → Railway auto-deploy

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
| `sync-fixtures` + `sync-fixtures-jul` | cada hora Jun 27–Jul 19 | Equipos reales en knockout |
| `generate-facts-r16` | Jul 3 14:00 UTC | Facts R16 |
| `generate-facts-qf` | Jul 8 14:00 UTC | Facts QF |
| `generate-facts-sf` | Jul 14 14:00 UTC | Facts SF |
| `generate-facts-final` | Jul 19 14:00 UTC | Facts Final |
| `sync-referees` | cada 3h | Árbitros |
| `sync-scorers` | cada 6h | Goleadores |
| `update-odds` | cada 2h | Cuotas Sorteo (500 req/mes). URL apunta a Edge Function Supabase (no Railway). |
| `health-check-daily` | 08:00 UTC | Alertas de salud + email Resend |

## Edge Functions en Supabase

| Función | Versión | Para qué |
|---|---|---|
| `generate-facts` | v4 | 3 facts/partido con Haiku + web_search. `reviewed: true` por default. |
| `health-check` | v2 | 5 checks, alerta 48h TBD, email Resend. |
| `update-odds` | v6 | Cuotas The-Odds-API → `team_odds`. Borra equipos eliminados (guardia ≤4 por ciclo). |

## Features en producción (Jun 28)

- **Timer en vivo**: `~45+5' · 1T` ticking — transiciona correctamente a MT, 2T, ET, PEN
- **Goles en vivo**: `⚽ 23' Scorer (og/p)` bajo banderas en lista y detalle
- **Auto-refresh lista**: cada 20s con partidos en vivo (LiveRefresher)
- **Banner en 5s**: poll 5s para goles en tiempo real
- **Drawer de análisis**: botón "📊 Análisis" en cada tarjeta → bottom sheet con contexto del partido (forma, H2H, sede, árbitro, DTs, goleadores, facts, momios)
- **Botón "↓ Siguiente partido"**: junto al h1 Partidos, scroll al próximo partido
- **Scroll restore**: back desde detalle regresa exactamente al scroll previo sin animación
- **Sync de fixtures knockout**: cada hora Jun 27–Jul 19
- **Sistema de salud**: health-check v2 + pg_cron diario + email Resend
- **Facts auto-aprobados**: generate-facts v4 con `reviewed: true`
- **Árbitros via web**: botón en AdminTools → Claude Haiku + web_search
- **Tab Sorteo en /ranking**: probabilidades de ganar el Mundial
- **Panel /admin**: ContextHealthPanel + AdminTools

## Pendientes técnicos

- **TEC-007**: verificar si `/matches/{id}` devuelve `goals` durante IN_PROGRESS con el próximo partido en vivo. Si `goals` sigue `[]`, cambiar a `/competitions/WC/matches?status=IN_PLAY`.
- **TEC-002**: árbitros R32 restantes (Jun 30–Jul 4) — FIFA anuncia 24-48h antes; usar botón "Buscar árbitros" en /admin.
- **TEC-006**: verificar que `generate-facts` loguea correctamente en `system_logs` en prod.
- **FEAT-001 UI**: selector de penales en `PredictionForm` — en pausa por decisión grupal pendiente.

## Pendientes grupales

- [ ] Resultado válido en eliminatorias: ¿90', 120' o penales? (FEAT-001 UI en pausa)
