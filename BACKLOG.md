# Backlog — quiniela-mundial-2026
> Qué falta, ordenado por urgencia. Tope: 100 líneas.
> Detalle completo (código, SQL, snippets) de cada ítem: snapshot en `bitacora/BACKLOG.md`.

## 🔎 Hallazgos de auditoría (2026-07-04)
- **AUD-001 · FMEA de Fase 4 incompleto:** el registro de riesgos de seguridad (RLS avatares,
  escalación en Modo Dios, edición de reglas en modo real, doble conteo de cron…) tiene la
  mayoría de filas sin marcar "probado" y la app ya está en Modo Real. Repasar/probar las críticas.
- **AUD-002 · `as any` como workaround de tipos Supabase:** oculta errores de tipo reales.
  Regenerar tipos (`supabase gen types`) y quitar los `as any` restantes.
- **AUD-003 · Decisión de datos (social):** los 3 pts de Javier por el bug de penales corregido
  siguen sin cerrarse con el grupo. Afecta el ranking real.

## 🔴 BUGS
- **BUG-002 · Cronómetro atascado en ~48' · 1T:** `approxLiveMinute` topa el 1T en 48; con
  `elapsed>48` (API tarda en cambiar period) se congela. Fix: mostrar `45+N'`. Mismo tope en
  2T(97)/ET1(108)/ET2(122). Archivos: `src/lib/utils.ts`, `src/components/LiveTimeLabel.tsx`.

## 🟠 IMPORTANTE
- **FEAT-001 · Pronóstico de penales (empate knockout):** back-end listo. Falta UI (selector
  "¿quién avanza?" en `PredictionForm.tsx`) + bonus en view `scores`. **Bloqueado por decisión
  grupal:** ¿da puntos extra?, ¿cuántos?, ¿selector obligatorio u opcional?

## 🟡 PENDIENTES TÉCNICOS
- **TEC-001 · Cron de odds a 1x/hora** (hoy 2x/día; free tier 500 req/mes lo permite). SQL listo.
- **TEC-002 · Árbitros R32 restantes:** FIFA anuncia 24-48h antes; botón "Buscar árbitros" en /admin.
- **TEC-003 · Auditar calendario (110 partidos en BD):** contar por `stage`, buscar duplicados,
  revisar `system_logs` de `sync-fixtures`.
- **TEC-004 · Pipeline de contexto de partido:** varios bloques pendientes (venue_id, momios h2h,
  DTs, forma, H2H, stakes). Ver `docs/referencia/Feature_Contexto_Partido.md`.
- **TEC-005 · Verificar goles en vivo en prod** end-to-end (formato, cron `update-matches-prod`).
- **TEC-006 · `generate-facts`: verificar logging a `system_logs`** en la versión deployada.
- **TEC-007 · `/matches/{id}` y `goals` durante IN_PROGRESS:** si sigue vacío, cambiar a
  `/competitions/WC/matches?status=IN_PLAY`.
- **TEC-008 · ¿QA y prod comparten API key de football-data.org?** El throttle de QA a 10min
  mitiga pero no elimina el 429 si comparten cuota. Confirmar en Railway; evaluar key separada.

## 🟣 UX
- **UX-001 · Autoscroll → botón "Siguiente partido"** (`SwipeNav.tsx`). *(hecho Jun 28, verificar)*
- **UX-002 · Restaurar scroll al dar back** desde detalle (sessionStorage). *(hecho Jun 28, verificar)*
- **UX-003 · Modal de contexto desde la lista** (bottom drawer lazy). *(hecho Jun 28, verificar)*

## 🟢 FUTURO / NICE TO HAVE
- **MEJ-001 · Retirar botón "Backfill scores jornada 1"** de AdminTools (era de una sola vez).
- **MEJ-002 · Árbitros: búsqueda automática integrada al cron** `sync-referees`.
- **MEJ-003 · Minuto a minuto con API-Football** (100 req/día free; polling 5min en IN_PLAY).
- **MEJ-004 · Easter eggs** (confeti en exacto, corona al líder, streak…). No tocar en torneo sin QA.
