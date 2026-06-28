# Changelog — Quiniela Overrated 2026

## [Salud + Facts Auto-Aprobados + UX Admin] — 2026-06-28

### Features
- **Sistema de alertas de salud**: Edge Function `health-check` v2 deployada en Supabase. 5 checks: (1) equipos TBD en knockout próximas 48h, (2) facts faltantes en 72h, (3) partidos FINISHED sin resultado, (4) momios faltantes, (5) árbitros faltantes. Envía email via Resend si hay alertas. Logs en `system_logs` con `log_type='HEALTH_CHECK'`.
- **pg_cron `health-check-daily`**: job #23, corre 08:00 UTC todos los días, llama Edge Function con `verify_jwt=false`.
- **ContextHealthPanel en /admin**: panel de salud con chips de estado por partido (Sede, Momios, Árbitro, DTs, Edad, Facts). Chips verde/rojo por campo, solo rojo si falta algo crítico.
- **AdminTools**: nueva sección "Herramientas de datos" en /admin con botones: "Backfill scores jornada 1" y "Buscar árbitros (7 días)".
- **Búsqueda de árbitros**: `/api/admin/sync-referees-web` llama Claude Haiku + web_search_20250305 para cada partido próximo sin árbitro; parsea JSON y actualiza `matches.referee`.

### Fixes
- **Facts auto-aprobados**: `generate-facts` v4 inserta con `reviewed: true`. Los 120 facts existentes aprobados con `UPDATE match_facts SET reviewed = true WHERE reviewed = false`.
- **Panel /admin sin ruido amarillo**: `ContextHealthPanel` ya no marca como roto por facts sin revisar. `healthAlerts` en `admin/page.tsx` ya no incluye alerta de "facts sin aprobar".
- **health-check v2**: eliminado check #3 (unreviewed facts) — ya no aplica porque todo se auto-aprueba.
- **Alertas TBD reducidas de 7d → 48h**: `admin/page.tsx` query y `health-check` Edge Function ahora solo alertan TBD en próximas 48h (antes 7 días = demasiado ruido con SF/QF/R16 aún no definidos).
- **"Forma reciente" renombrada**: label → "Resultados en el torneo". Bug fix: `computeForm` usaba `home_score_fulltime` (solo 40/72 partidos tenían dato) → cambiado a `home_score_quiniela` (columna correcta).
- **Espaciado TENDENCIA chip**: `marginTop: 8` en wrapper de `RankingPreview` en `MatchCard.tsx`.

### Datos insertados manualmente esta sesión
- **DT Senegal**: `Pape Thiaw` (reemplazó a Aliou Cissé, despedido Oct 2024)
- **Árbitros R32** confirmados por FIFA antes del 28 Jun: varios insertados en `matches.referee`

### Infraestructura
- `generate-facts` v4: `reviewed: true` en cada insert
- `health-check` v2: ventana TBD 48h, sin check de unreviewed
- pg_cron job #23: `health-check-daily` a las 08:00 UTC

---

## [Live + Knockout Sync] — 2026-06-25

### Features
- **`LiveTimeLabel` (client component)**: muestra el minuto aproximado del partido (`~47' · 1T`) ticking cada 30s cuando la API no envía `minute`. Cuando sí lo envía, muestra el valor exacto. Periodos fijos (MT, MTE, PEN) no tican.
- **`GoalList` (server component)**: muestra `⚽ 23' Vinícius Jr. (og/p)` debajo de cada bandera en tarjetas de partido y detalle. Aparece en partidos en vivo y finalizados.
- **`LiveRefresher` (client component)**: llama `router.refresh()` cada 20s cuando hay partidos en vivo, actualizando los datos server-rendered de la lista de partidos sin recargar la página.
- **Goals JSONB en la DB**: columna `goals` en `matches` almacena array de `GoalEntry` (`minute, injuryTime, scorer, side, type`). El cron la rellena vía `extractGoals()` en cada tick.
- **`extra_time_start_time`**: timestamp que registra cuándo arranca la prórroga para calcular minuto aproximado en ET1/ET2.

### Fixes
- **Banner de partido en vivo**: poll reducido de 12s → 5s para que los goles aparezcan más rápido.
- **Water-break en `derivePeriod`**: PAUSED con minuto <43 ya no devuelve 'MT' — se queda en el periodo actual (cooling/water break dentro del 1T).
- **`minute` en `ApiMatch`**: campo caído por merge automático; readded manualmente.

### Infraestructura — Knockout sync
- **Endpoint `/api/cron/sync-fixtures`**: actualiza `home_team`, `away_team`, `is_placeholder`, `scheduled_time` de partidos placeholder cuando la API confirma los equipos reales. Nunca toca scores ni predicciones.
- **pg_cron `sync-fixtures`**: corre cada hora Jun 27–30 Jun y 1–19 Jul. Primera corrida manual actualizó Sudáfrica vs Canadá (28 Jun 19:00 UTC).
- **`generate-facts-r32`**: corregido de Jul 2 → **Jun 27** (R32 empieza Jun 28).
- **`generate-facts-r16`**: **agregado** para Jul 3 (R16 empieza Jul 4 — faltaba completamente).
- **`generate-facts-qf`**: adelantado de Jul 9 → **Jul 8** (un día antes del primer QF).

### Migraciones
- `21_second_half_start_time.sql` — columna `second_half_start_time TIMESTAMPTZ`
- `22_extra_time_start_time.sql` — columna `extra_time_start_time TIMESTAMPTZ`
- `23_goals_column.sql` — columna `goals JSONB DEFAULT '[]'`
- `24_sync_fixtures_cron.sql` — crons sync-fixtures (Jun–Jul) + fix generate-facts-r32
- `25_generate_facts_r16.sql` — generate-facts-r16 (Jul 3) + generate-facts-qf a Jul 8

---

## [Sorteo] — 2026-06-22

### Features
- **Tab Sorteo en `/ranking`**: pill navigation Puntos | Sorteo. El tab Sorteo muestra un ranking paralelo basado en probabilidades de apuestas, independiente de la quiniela de marcadores.
- **SorteoCard expandible**: cada jugador tiene una card que se expande/contrae mostrando sus 8 equipos (4 por grupo) con probabilidad individual, barra visual proporcional, y equipos eliminados tachados con 💀.
- **Edge Function `update-odds`**: desplegada en Supabase, llama a The-Odds-API, normaliza el margen de la casa, y upsertea probabilidades en `team_odds`. Corre cada 2 horas via pg_cron (pendiente: mover a cada hora).
- **Tabla `team_odds`**: una fila por equipo, actualizada por el Edge Function.
- **Config `player-groups.ts`**: asignación oficial de grupos del Mundial 2026 por jugador (hardcodeada, derivada de la DB).

### Fixes
- **Display names de jugadores reales**: actualizados via SQL: Ña→Ernesto, gustavoinzunza30→Gus, javieremmanuel→Javier, manuelrodriguezorti→Mani, jesus.tunaal→Chuy.
- **`database.types.ts` regenerado**: incluye tabla `team_odds` (el build de Railway fallaba por tipo desconocido).
- **`tsconfig.json`**: excluir `supabase/functions/` del check de TypeScript (código Deno, incompatible con compilador Node).

### Infraestructura
- **The-Odds-API**: key configurada en Railway (prod + QA) y como secret en Supabase Edge Functions.
- **pg_cron `update-odds-daily`**: cron 2x/día (8 AM y 8 PM UTC). Pendiente migrar a `update-odds-hourly` (1x/hora, cabe en free tier dado reset mensual).

### Backlog generado
- Cambiar cron de odds a cada hora (chip creado, SQL listo).
- Minuto a minuto con API-Football antes de los 32avos (chip creado, diseño acordado).

---

## [Pre-Real] — 2026-06-21

### Features
- **Borrar pronósticos anteriores a partido X** (`/admin`): dropdown con todos los partidos, seleccionas el primer partido que sí cuenta, botón con confirmación borra todo lo anterior. Permite definir el "inicio oficial" del torneo sin limpiar datos futuros.
- **Ojito toggle en campos de contraseña nueva** (`/perfil`): un botón de ojo muestra/oculta ambos campos de nueva contraseña simultáneamente.
- **Cambiar contraseña desde perfil**: sección dedicada en `/perfil` con validación de mínimo 6 caracteres y confirmación.
- **Mensaje claro en link de invitación expirado**: detecta el hash `#error_code=otp_expired` en la URL y muestra mensaje amigable en el login.

### Fixes
- **Banderas en Windows**: reemplazadas las banderas emoji Unicode (no soportadas en Windows) con imágenes SVG de Twemoji CDN. Componente `TeamFlag` centraliza la lógica.
- **Predicciones fantasma de usuarios QA**: filtro `profileMap.has(p.user_id)` en `partidos/page.tsx` y `partido/[id]/page.tsx` para excluir usuarios de prueba.
- **Invite link usando localhost**: `redirectTo` ahora usa `NEXT_PUBLIC_APP_URL` si está seteada (necesaria en Railway prod como build-time env var).
- **JSX inválido en ProfileForm**: dos `<form>` hermanos envueltos en `<div>` para pasar validación de Turbopack.
- **Status label del partido**: subido de 10px a 14px.
- **Filtro `is_test` en admin y ranking**: queries en `/admin` y `/ranking` excluyen usuarios de prueba en `NEXT_PUBLIC_APP_ENV=production`.

### Infraestructura
- **pg_cron prod**: añadido Job 3 `update-matches-prod` apuntando a la URL de producción (los jobs anteriores solo apuntaban a QA).
- **Ernesto Inzunza**: password seteado directamente via SQL (`crypt()`) tras confirmar que escáner de email de Outlook consume OTPs de un solo uso.
- **Gustavo / Jesús**: mismo patrón SQL. Jesús requirió además insertar en `auth.identities` y limpiar campos de token NULL (`confirmation_token`, `recovery_token`, etc.) que GoTrue no puede manejar como NULL.

### Docs
- `docs/Crear_Usuario_Prod.md`: protocolo completo de 3 pasos para crear usuarios manualmente (auth.users + auth.identities + limpiar NULLs). Incluye SQL exacto y mensaje de WhatsApp para compartir credenciales.

---

## [Beta 1.0] — pre 2026-06-21

Ver commits anteriores en git log.
