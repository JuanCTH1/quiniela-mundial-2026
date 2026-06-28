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

### BUG: Cronómetro de partido en vivo atascado en ~48' · 1T

**Síntoma:** El cronómetro del partido en vivo muestra `~48' · 1T` y queda congelado, sin seguir avanzando.

**Causa raíz:** En `src/lib/utils.ts:185`:
```ts
if (period === '1T') return Math.min(elapsed, 48)
```
El minuto aproximado del 1T está topado en 48. Cuando `elapsed > 48` (la API tarda en cambiar `period` de `'1T'` a `'MT'`), la función siempre devuelve 48 → el ticker muestra `~48' · 1T` sin cambiar.

**Fix propuesto:** En lugar de topar en 48, mostrar tiempo añadido con el formato `45+N'` cuando `elapsed > 48`:
```ts
if (period === '1T') {
  if (elapsed <= 48) return elapsed
  return -(elapsed - 45) // señal para que formatLivePeriod lo muestre como 45+N'
}
```
O más simple: en `approxLiveMinute`, cuando `period === '1T'` y `elapsed > 48`, devolver un valor que `computeLabel` en `LiveTimeLabel.tsx` formatee como `45+${elapsed-45}' · 1T`.

**Archivos relevantes:**
- `src/lib/utils.ts` — función `approxLiveMinute` (línea ~185)
- `src/components/LiveTimeLabel.tsx` — función `computeLabel`

**Nota:** El mismo tope existe para 2T en 97, ET1 en 108, ET2 en 122 — revisar si aplica el mismo fix para esos periodos.

---

### Auditar calendario y partidos disponibles en BD

**Objetivo:** Confirmar que los 110 partidos del Mundial 2026 están correctamente cargados en `matches`, sin huecos ni duplicados.

| Ronda | Partidos esperados |
|---|---|
| Fase de grupos | 48 |
| Ronda de 32 | 32 |
| Ronda de 16 | 16 |
| Cuartos de Final | 8 |
| Semis | 4 |
| Tercer lugar | 1 |
| Final | 1 |
| **Total** | **110** |

**Puntos a verificar:**
- Contar filas por `stage` y comparar contra la tabla.
- Los 48 partidos de grupos tienen `status = 'FINISHED'` y scores correctos.
- Los R32 con grupos cerrados ya tienen equipos reales (no placeholder).
- Los placeholders de R16 en adelante tienen `is_placeholder = true` y texto descriptivo.
- Buscar duplicados: `SELECT match_id, COUNT(*) FROM matches GROUP BY match_id HAVING COUNT(*) > 1`.
- Revisar `system_logs` de `sync-fixtures` para detectar fallos silenciosos.

---

### Facts interesantes para todos los partidos disponibles

> **Contingente a que la auditoría de calendario esté completa.**

- Auditar cuántos partidos ya tienen facts en `match_facts`.
- Listar partidos sin facts que ya tienen ambos equipos confirmados.
- Correr script de generación (Claude Haiku 4.5, 3 facts por partido).
- Revisar y aprobar facts en panel admin (`reviewed = true`) — **ningún fact generado sale sin ojo humano**.
- Verificar crons pendientes: `generate-facts-r16` (Jul 3), `generate-facts-qf` (Jul 8), `generate-facts-sf` (Jul 14), `generate-facts-final` (Jul 19).
- Confirmar que el hook de `sync-fixtures` encola generación cuando un cruce de eliminatoria queda definido.

---

### Verificar pipeline completo de contexto de partido

Estado estimado de los bloques de `MatchContext`:

| Bloque | Estado |
|---|---|
| Sede (venue_id) | Tablas creadas, 16 sedes cargadas — **falta asignar `venue_id` a cada partido** |
| Momios h2h | **Pendiente**: Edge function `update-match-odds` no desplegada |
| Datos curiosos | Pendiente (ver ítem de facts) |
| Árbitro | `sync-referees` corre cada 3h — verificar que persiste en `matches` |
| DTs / team_metadata | **Pendiente**: script de scraping no corrió |
| Forma reciente | TODO en `match-context.ts` |
| H2H | TODO en `match-context.ts` (migración h2h_history ya aplicada) |
| Goleadores clave | `sync-scorers` cada 6h — verificar acumulación |
| Stakes | Pendiente: aritmética de standings, sin IA |

Archivos clave: `src/lib/match-context.ts`, `src/components/MatchContext.tsx`, `src/app/(app)/admin/ContextHealthPanel.tsx`, `docs/Feature_Contexto_Partido.md`.

---

### Verificar goles en vivo en producción

Feature implementada (GoalList + goals JSONB — Jun 25). Este ítem es confirmación end-to-end:
- Goles aparecen bajo banderas en tarjeta de lista y en detalle del partido.
- Formato correcto: `⚽ 23' Scorer (og/p)`.
- Cron `update-matches-prod` popula `matches.goals` correctamente (revisar `system_logs`).
- `LiveRefresher` actualiza lista cada 20s sin recargar página.
- Banner del próximo partido se actualiza en ~5s.

---

### UX: Reemplazar autoscroll por botón "Siguiente partido"

**Problema:** `SwipeNav.tsx` hace scroll automático al próximo partido al cargar la página. Disruptivo — el usuario no controla cuándo moverse.

**Fix:** Quitar el `useEffect` de autoscroll (`SwipeNav.tsx` líneas 31–36) y crear un botón flotante `NextMatchButton`:
- Posición `fixed`, bottom sobre el `BottomNav`, pastilla semi-transparente con flecha ↓.
- Usa `IntersectionObserver` para ocultarse cuando `#next-match` ya es visible.
- Al pulsar: `scrollIntoView({ behavior: 'smooth' })`.

Archivos: `src/app/(app)/partidos/SwipeNav.tsx`, `src/app/(app)/partidos/page.tsx`, `src/components/NextMatchButton.tsx` (nuevo).

---

### UX: Restaurar scroll al dar back desde detalle de partido

**Problema:** Al navegar `/partidos` → `/partido/[id]` y dar back, el scroll vuelve al top.

**Fix (sessionStorage):**
1. En `MatchCard.tsx`, al hacer click guardar `sessionStorage.setItem('partidos-scroll', window.scrollY.toString())`.
2. En `SwipeNav.tsx`, al montar leer el valor, hacer scroll y limpiar la key.
3. Al navegar con swipe de fecha, limpiar la key para no restaurar en el contexto equivocado.

Archivos: `src/components/MatchCard.tsx`, `src/app/(app)/partidos/SwipeNav.tsx`.

---

### UX: Modal de contexto de partido desde la lista

**Objetivo:** Botón `ⓘ` en cada tarjeta que abre un bottom drawer con `MatchContext` sin salir de la lista.

**Requisitos:**
- Scroll interno del drawer independiente del fondo — **`body` bloqueado** (`overflow: hidden`) mientras el drawer está abierto.
- Cierre con swipe hacia abajo, botón ×, o tap en backdrop.
- Fetch lazy del contexto al abrir (no pre-cargar todo en la lista).

Archivos: `src/components/MatchContextDrawer.tsx` (nuevo), `src/components/MatchCard.tsx`, `src/app/api/match-context/[id]/route.ts` (nuevo o server action).

---

### NICE TO HAVE: Easter eggs

Ideas a confirmar con el grupo antes de implementar:
- Animación/confeti al acertar marcador exacto.
- Confeti en ranking cuando alguien llega al #1 por primera vez.
- Sonido/vibración en gol en vivo (con permiso del sistema).
- Referencia oculta al nombre "Overrated" en algún corner de la app.

No implementar durante el torneo sin probar en QA primero.

---

## Completado

- [x] Tab Sorteo en /ranking con probabilidades del Mundial (2026-06-22)
- [x] Edge Function update-odds + pg_cron + tabla team_odds (2026-06-22)
- [x] Display names actualizados para todos los jugadores reales (2026-06-22)
- [x] Borrar pronósticos anteriores a partido X desde /admin (2026-06-21)
- [x] Onboarding completo de los 6 jugadores en prod (2026-06-21)
- [x] pg_cron prod para update-matches (2026-06-21)
