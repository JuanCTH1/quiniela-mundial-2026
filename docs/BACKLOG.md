# BACKLOG — Quiniela Overrated 2026

> Actualizado: 2026-06-28

## 🔴 BUGS (reparar antes del próximo partido)

### BUG-001 · Botón "Buscar árbitros" no funciona
**Archivo:** `src/app/api/admin/sync-referees-web/route.ts`  
**Síntoma:** El botón en AdminTools devuelve error o no actualiza árbitros.  
**Contexto:** Endpoint POST que llama Claude Haiku + `web_search_20250305` para cada partido próximo (7 días) sin árbitro asignado. Parsea `{"referee": "Name"}` y hace UPDATE en `matches.referee`.  
**Primera tarea de la siguiente sesión.** Debuggear: revisar logs de Railway, revisar que el header `anthropic-beta: web-search-2025-03-05` esté bien, revisar que el parsing del JSON funcione.

---

## 🟠 IMPORTANTE (próxima sesión, antes de Modo Real)

### FEAT-001 · Pronóstico de penales en eliminatorias con empate
**Qué:** Cuando un usuario pronostica empate en un partido de eliminatoria (LAST_32, ROUND_OF_16, QUARTER_FINALS, SEMI_FINALS, FINAL), mostrar un selector adicional: "¿Quién avanza?" con los dos equipos.

**Comportamiento actual:** El resultado válido es a 90' (`regularTime`). Si pronosticas 2-2 y el partido termina 2-2 en 90' antes de ir a penales → puntos completos. Pero no hay forma de pronosticar el clasificado.

**UX propuesta:**
- Al escribir un empate en un partido knockout → aparece un selector visual sencillo debajo del score (`[Equipo A] vs [Equipo B]`, tipo pill seleccionable)
- El selector solo aparece en stages ≠ GROUP/GROUP_STAGE
- Se guarda en `predictions` como columna nueva (ej. `penalty_winner`)
- Si el partido termina en penalties, comparar el clasificado real con `penalty_winner` → bonus de puntos o solo tracking visual (a definir con el grupo)

**Corte confirmado: `'120'`** — el resultado válido es el marcador final del partido, incluyendo prórroga. Se usa `fullTime` de la API (`src/lib/football-data.ts:121`).

**Los tres casos en eliminatorias:**
- `duration='REGULAR'` → fullTime = resultado (ej. 2-0). Sin empate posible.
- `duration='EXTRA_TIME'` → fullTime = resultado tras prórroga (ej. 2-1). Sin empate posible.
- `duration='PENALTY_SHOOTOUT'` → fullTime = **empate a 120'** (ej. 1-1). Alguien avanza por penales. **Este es el único caso donde FEAT-001 aplica.**

**FEAT-001 aplica solo cuando `duration='PENALTY_SHOOTOUT'`** — es decir, cuando el partido termina en empate después de 120' y se resuelve en penales. El marcador para puntuar es el empate (ej. 1-1), y el selector "¿quién avanza?" captura la dimensión extra.

**Pendiente confirmar con el grupo:**
- ¿Da puntos extra acertar el clasificado en penales? ¿Cuántos?
- ¿El selector es obligatorio cuando hay empate knockout, o se puede omitir?

**Impacto técnico:** Nueva columna `predictions.penalty_winner`, cambio en `PredictionForm.tsx` (mostrar selector cuando stage ≠ group Y score es empate), lógica en cálculo de puntos si se decide dar bonus.

---

## 🟡 PENDIENTES OPERATIVOS (antes de Modo Real)

### OP-001 · Backfill de scores jornada 1
**Qué:** 32 partidos de la jornada 1 (Jun 11–17) tienen `home_score_quiniela = null` porque el cron no estaba activo.  
**Cómo:** Botón en /admin → Herramientas de datos → "Backfill scores jornada 1". O SQL directo con datos de football-data.org.  
**Impacto:** Sin esto, "Resultados en el torneo" muestra menos datos de los que hay.

### OP-002 · Árbitros R32 restantes (Jun 30–Jul 4)
**Qué:** FIFA anuncia árbitros 24–48h antes del partido. Quedan ~12 partidos R32.  
**Cómo:** Una vez reparado BUG-001, usar el botón "Buscar árbitros". O insertar manualmente via SQL.

### OP-003 · Activar Modo Real
**Qué:** Switch en /admin → cambio de `app_mode = 'real'`. Irreversible.  
**Bloqueante:** Confirmar con el grupo: (a) resultado válido en eliminatorias (90'/120'/penales) y (b) minutos de bloqueo.  
**Pendiente grupal:** no hacer sin consenso.

---

## 🟢 MEJORAS (post-torneo o cuando haya tiempo)

### MEJ-001 · Backfill scores con SQL directo (retirar el botón)
**Qué:** El botón "Backfill scores jornada 1" en AdminTools es una operación de una sola vez. Una vez ejecutado, el botón no tiene razón de existir.  
**Acción:** Después de ejecutar el backfill, eliminar `<ActionButton label="🔄 Backfill scores jornada 1" ...>` de `AdminTools.tsx`.

### MEJ-002 · Árbitros: búsqueda automática más robusta
**Qué:** La búsqueda actual (Claude + web_search) es manual vía botón. Considerar integrar al cron de sync-referees si el botón funciona bien.

### MEJ-003 · generate-facts: logging a system_logs en producción
**Qué:** `generate-facts` v4 no tiene el bloque `system_logs` en la versión deployada (se perdió en el deploy de esta sesión — el archivo local tenía el return antes del insert).  
**Verificar:** Revisar si la Edge Function logea correctamente a `system_logs` después de generar facts.

### MEJ-004 · Modo Real: confirmar resultado válido en eliminatorias
**Qué:** Pendiente del grupo. Actualmente usa `duration=REGULAR → fullTime`, `EXTRA_TIME|PENALTY_SHOOTOUT + corte='90' → regularTime`. Si el grupo quiere penales como resultado válido, cambiar config en tabla `settings`.

---

## ✅ COMPLETADOS esta sesión (Jun 28)

- [x] Edge Function `health-check` v2 + pg_cron `health-check-daily` (08:00 UTC)
- [x] ContextHealthPanel en /admin con chips de estado por partido
- [x] AdminTools con botones de herramientas de datos
- [x] Facts auto-aprobados (`reviewed: true` en inserción + 120 existentes aprobados por SQL)
- [x] Alertas TBD reducidas de 7d → 48h (admin/page.tsx + health-check)
- [x] "Resultados en el torneo": bug fix `computeForm` + rename label
- [x] Espaciado TENDENCIA chip (marginTop: 8 en RankingPreview)
- [x] DT Senegal actualizado: Pape Thiaw (reemplazó a Aliou Cissé, Oct 2024)
- [x] generate-facts v4 deployada con `reviewed: true`
