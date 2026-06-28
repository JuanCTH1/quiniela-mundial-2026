# BACKLOG — Quiniela Overrated 2026

> Actualizado: 2026-06-28

---

## 🔴 BUGS (reparar antes del próximo partido)

### BUG-002 · Cronómetro atascado en ~48' · 1T

**Síntoma:** El cronómetro del partido en vivo muestra `~48' · 1T` y queda congelado, sin seguir avanzando.

**Causa raíz:** En `src/lib/utils.ts` — función `approxLiveMinute`:
```ts
if (period === '1T') return Math.min(elapsed, 48)
```
El minuto aproximado del 1T está topado en 48. Cuando `elapsed > 48` (la API tarda en cambiar `period` de `'1T'` a `'MT'`), la función siempre devuelve 48 → el ticker muestra `~48' · 1T` sin cambiar.

**Fix propuesto:** Cuando `period === '1T'` y `elapsed > 48`, mostrar tiempo añadido `45+N'`:
```ts
if (period === '1T') {
  if (elapsed <= 48) return elapsed
  return -(elapsed - 45) // señal para que formatLivePeriod lo muestre como 45+N'
}
```
O en `approxLiveMinute`, devolver un valor que `computeLabel` en `LiveTimeLabel.tsx` formatee como `45+${elapsed-45}' · 1T`.

**Nota:** El mismo tope existe para 2T en 97, ET1 en 108, ET2 en 122 — revisar si aplica el mismo fix.

**Archivos relevantes:**
- `src/lib/utils.ts` — función `approxLiveMinute` (~línea 185)
- `src/components/LiveTimeLabel.tsx` — función `computeLabel`

---

## 🟠 IMPORTANTE (próxima sesión)

### FEAT-001 · Pronóstico de penales en eliminatorias con empate

**Back-end listo (Jun 28):** columnas `predictions.penalty_winner`, `matches.duration`, `matches.penalty_winner` ya en DB. Cron `update-matches` ya guarda `penalty_winner` cuando `duration = PENALTY_SHOOTOUT`. Función `resolvePenaltyWinner` en `football-data.ts`.

**Pendiente:**
- UI: selector "¿quién avanza?" en `PredictionForm.tsx` — solo cuando stage ≠ GROUP y score es empate
- View `scores`: bonus por acertar `penalty_winner` (cuántos puntos — **pendiente decisión del grupo**)

**Pendiente confirmar con el grupo:**
- ¿Da puntos extra acertar el clasificado en penales? ¿Cuántos?
- ¿El selector es obligatorio cuando hay empate knockout, o se puede omitir?

**Impacto técnico restante:** cambio en `PredictionForm.tsx`, lógica en view `scores` si se decide dar bonus.

---

## 🟡 PENDIENTES TÉCNICOS

### TEC-001 · Cambiar cron de odds a 1x/hora

**Contexto:** Actualmente el cron `update-odds-daily` corre 2x/día (8 AM y 8 PM UTC). The-Odds-API free tier tiene 500 req/mes — permite actualizaciones cada hora holgadamente.

**SQL listo para ejecutar:**
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

### TEC-002 · Árbitros R32 restantes (Jun 30–Jul 4)

FIFA anuncia árbitros 24–48h antes del partido. Quedan ~12 partidos R32. Usar el botón "Buscar árbitros" en /admin (BUG-001 ya corregido).

### TEC-003 · Auditar calendario — 110 partidos en BD

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

- Contar filas por `stage` y comparar.
- Los 48 de grupos: `status = 'FINISHED'` y scores correctos.
- R32 con grupos cerrados: equipos reales (no placeholder).
- Placeholders R16+ con `is_placeholder = true`.
- Buscar duplicados: `SELECT external_id, COUNT(*) FROM matches GROUP BY external_id HAVING COUNT(*) > 1`.
- Revisar `system_logs` de `sync-fixtures` para fallos silenciosos.

### TEC-004 · Verificar pipeline contexto de partido

Estado de los bloques de `MatchContext`:

| Bloque | Estado |
|---|---|
| Sede (venue_id) | Tablas y sedes cargadas — falta asignar `venue_id` a cada partido |
| Momios h2h | Pendiente: Edge function `update-match-odds` no desplegada |
| Datos curiosos | Pendiente (ver facts) |
| Árbitro | `sync-referees` corre cada 3h — verificar persistencia |
| DTs / team_metadata | Pendiente: script de scraping no corrió |
| Forma reciente | TODO en `match-context.ts` |
| H2H | TODO en `match-context.ts` (migración h2h_history aplicada) |
| Goleadores clave | `sync-scorers` cada 6h — verificar acumulación |
| Stakes | Pendiente: aritmética de standings |

Archivos clave: `src/lib/match-context.ts`, `src/components/MatchContext.tsx`, `src/app/(app)/admin/ContextHealthPanel.tsx`, `docs/Feature_Contexto_Partido.md`.

### TEC-005 · Verificar goles en vivo en producción

Feature implementada Jun 25 (GoalList + goals JSONB). Verificar end-to-end:
- Goles aparecen bajo banderas en tarjeta y detalle.
- Formato correcto: `⚽ 23' Scorer (og/p)`.
- Cron `update-matches-prod` popula `matches.goals` correctamente (revisar `system_logs`).
- `LiveRefresher` actualiza lista cada 20s sin recargar.
- Banner se actualiza en ~5s.

### TEC-006 · generate-facts: verificar logging a system_logs en producción

`generate-facts` v4 deployada con `reviewed: true`. Verificar que el bloque `system_logs` está presente en la versión deployada (hubo un deploy donde el return estaba antes del insert).

---

## 🟣 UX (mejoras de experiencia)

### UX-001 · Reemplazar autoscroll por botón "Siguiente partido"

**Problema:** `SwipeNav.tsx` hace scroll automático al próximo partido al cargar la página. Disruptivo.

**Fix:** Quitar el `useEffect` de autoscroll (`SwipeNav.tsx` líneas 31–36) y crear `NextMatchButton`:
- `fixed`, bottom sobre `BottomNav`, pastilla semi-transparente con flecha ↓.
- `IntersectionObserver` para ocultarse cuando `#next-match` ya es visible.
- Al pulsar: `scrollIntoView({ behavior: 'smooth' })`.

Archivos: `src/app/(app)/partidos/SwipeNav.tsx`, `src/app/(app)/partidos/page.tsx`, `src/components/NextMatchButton.tsx` (nuevo).

### UX-002 · Restaurar scroll al dar back desde detalle de partido

**Problema:** Al navegar `/partidos` → `/partido/[id]` y dar back, el scroll vuelve al top.

**Fix (sessionStorage):**
1. En `MatchCard.tsx`, al hacer click: `sessionStorage.setItem('partidos-scroll', window.scrollY.toString())`.
2. En `SwipeNav.tsx`, al montar: leer el valor, hacer scroll, limpiar la key.
3. Al navegar con swipe de fecha, limpiar la key.

Archivos: `src/components/MatchCard.tsx`, `src/app/(app)/partidos/SwipeNav.tsx`.

### UX-003 · Modal de contexto de partido desde la lista

**Objetivo:** Botón `ⓘ` en cada tarjeta que abre un bottom drawer con `MatchContext` sin salir de la lista.

**Requisitos:**
- `body` bloqueado (`overflow: hidden`) mientras el drawer está abierto.
- Cierre con swipe hacia abajo, botón ×, o tap en backdrop.
- Fetch lazy del contexto al abrir.

Archivos: `src/components/MatchContextDrawer.tsx` (nuevo), `src/components/MatchCard.tsx`, `src/app/api/match-context/[id]/route.ts` (nuevo o server action).

---

## 🟢 FUTURO / NICE TO HAVE

### MEJ-001 · Backfill scores: retirar el botón tras ejecutar

El botón "Backfill scores jornada 1" en AdminTools es de una sola vez. Eliminar `<ActionButton label="🔄 Backfill scores jornada 1" ...>` de `AdminTools.tsx` después de ejecutarlo.

### MEJ-002 · Árbitros: búsqueda automática integrada al cron

La búsqueda actual (Claude + web_search) es manual vía botón. Considerar integrar al cron `sync-referees` si el botón funciona bien.

### MEJ-003 · Minuto a minuto con API-Football

API-Football tiene 100 req/día en free tier. Con ≤4 partidos/día y polling cada 5 min, son ~50 req/día.

**Diseño:**
- Cuando un partido pasa a IN_PLAY, activar polling de `/fixtures/events?fixture={id}` cada 5 min.
- Solo durante la duración del partido (~90-120 min).
- Mostrar goles, tarjetas, cambios en tiempo real.
- **Implementar antes de R16** (estimado: julio 2026).
- Requiere API key de API-Football (confirmar free tier o pago).

### MEJ-004 · Easter eggs

Confirmar con el grupo antes de implementar:
- Animación/confeti al acertar marcador exacto.
- Confeti en ranking cuando alguien llega al #1 por primera vez.
- Sonido/vibración en gol en vivo (con permiso del sistema).
- Referencia oculta al nombre "Overrated".

No implementar durante el torneo sin probar en QA primero.

---

## ✅ COMPLETADOS

- [x] BUG-001 · Botón "Buscar árbitros" — fix loop tool_use + catch con error real (Jun 28)
- [x] FEAT-001 back-end · Columnas `penalty_winner` en predictions y matches, `duration` en matches, función `resolvePenaltyWinner`, cron actualizado (Jun 28)
- [x] Edge Function `health-check` v2 + pg_cron `health-check-daily` 08:00 UTC (Jun 28)
- [x] ContextHealthPanel en /admin con chips de estado por partido (Jun 28)
- [x] AdminTools con botones de herramientas de datos (Jun 28)
- [x] Facts auto-aprobados (`reviewed: true` en inserción + 120 existentes aprobados por SQL) (Jun 28)
- [x] Alertas TBD reducidas de 7d → 48h (Jun 28)
- [x] "Resultados en el torneo": bug fix `computeForm` + rename label (Jun 28)
- [x] Espaciado TENDENCIA chip (Jun 28)
- [x] DT Senegal actualizado: Pape Thiaw (Jun 28)
- [x] generate-facts v4 deployada con `reviewed: true` (Jun 28)
- [x] Backfill de scores jornada 1 (32 partidos) (Jun 28)
- [x] Modo Real activado con puntos (anterior a Jun 28)
- [x] Tab Sorteo en /ranking con probabilidades del Mundial (Jun 22)
- [x] Edge Function update-odds + pg_cron + tabla team_odds (Jun 22)
- [x] Display names actualizados para todos los jugadores reales (Jun 22)
- [x] Borrar pronósticos anteriores a partido X desde /admin (Jun 21)
- [x] Onboarding completo de los 6 jugadores en prod (Jun 21)
- [x] pg_cron prod para update-matches (Jun 21)
- [x] Goles en vivo: GoalList + goals JSONB (Jun 25)
- [x] Minuto en vivo ticking + LiveRefresher + Banner 5s (Jun 25)
- [x] Sync de fixtures knockout automático (Jun 27)
