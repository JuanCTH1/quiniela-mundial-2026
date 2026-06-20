# Fase 1 — Esquema y Persistencia

**Estado:** Completado  
**Fecha:** 2026-06-20  
**Migraciones aplicadas en:** Supabase `wltltpzvscgpnfwvgfmt`

---

## Diagrama de tablas

```
auth.users (Supabase Auth — no tocamos directamente)
    │
    ├─ profiles          id FK→auth.users
    │                    display_name, avatar_url, is_admin
    │
    ├─ predictions       match_id FK→matches, user_id FK→auth.users
    │                    home_score, away_score, submitted_at
    │                    UNIQUE(match_id, user_id)
    │
    └─ audit_log         actor_id FK→auth.users, match_id FK→matches

matches                  external_id (football-data.org), stage, group_name
                         home_team, away_team, scheduled_time
                         home/away_score_fulltime, _regular, _quiniela
                         early_unlock_at, result_source, status

settings                 key-value: app_mode, bloqueo_minutos, mode_activated_*

reglas_puntuacion        etapa PK, corte (90/120/PENALTIES)
                         pts_exacto=4, pts_diferencia=3, pts_tendencia=2, pts_fallo=0

system_logs              log_type, message, details (jsonb), is_error

audit_log                actor_id, action_type, match_id, old_value, new_value, notes
```

## Vistas

### `scores`
Calcula puntos por (usuario × partido) en tiempo real — nunca guardado.

Lógica de puntuación con **diferencia con signo** (no absoluta):
1. `pred == resultado` exacto → `pts_exacto` (4)
2. `pred_home - pred_away == result_home - result_away` → `pts_diferencia` (3)
   - Cubre empates sin exacto (0==0 siempre es DIFERENCIA, nunca TENDENCIA)
3. `SIGN(pred_h - pred_a) == SIGN(res_h - res_a)` → `pts_tendencia` (2)
4. Else → `pts_fallo` (0)
5. Sin pronóstico → fila no existe → leaderboard cuenta como 0 (LEFT JOIN)

### `leaderboard`
LEFT JOIN desde `profiles` → `scores`. Orden: `total_points DESC, exact_count DESC, diff_count DESC`.

## Funciones helper

| Función | Descripción |
|---|---|
| `get_lock_time(match_id)` | `scheduled_time - bloqueo_minutos` — fuente de verdad del cierre |
| `is_match_locked(match_id)` | `now() >= get_lock_time(...)` — sin flags, sin cron |
| `prediction_count(match_id)` | Cuántos pronósticos tiene un partido (para liberación 6/6) |

## RLS — justificaciones

### `predictions` (lo más crítico)

| Operación | Política | Justificación |
|---|---|---|
| SELECT | Propias siempre; ajenas si `is_match_locked` o `early_unlock_at IS NOT NULL` | Privacidad hasta el cierre |
| INSERT | `user_id = auth.uid()` AND NOT locked AND status = SCHEDULED | Solo puedo poner la mía, solo antes del cierre |
| UPDATE | `user_id = auth.uid()` AND NOT locked | Puedo corregir hasta el cierre, nadie más |
| DELETE | **No hay política** → operación bloqueada para todos | Predicciones sagradas, inmutables |

**Nota de arquitectura:** `service_role` puede bypassear RLS por diseño de Supabase. La protección final de las predicciones en modo real es arquitectónica: los Server Actions de admin nunca hacen mutaciones sobre `predictions`. Esta decisión es explícita y está documentada aquí.

### `matches`

Solo `SELECT` para `authenticated`. INSERT/UPDATE exclusivo de `service_role` (cron + Server Actions de admin).

### `settings` y `reglas_puntuacion`

Admin puede editar solo en `app_mode = 'test'`. Las claves de modo (`app_mode`, `mode_activated_at`, `mode_activated_by`) solo son modificables cuando aún estamos en test — acción unidireccional.

### `audit_log`

SELECT público para todos los 6. INSERT solo vía `service_role` (no falsificable desde el cliente).

## Preguntas pendientes (pre-modo-real)

- [ ] **`corte` por etapa eliminatoria:** ¿90', 120', o penales? Configurable en `reglas_puntuacion.corte` por etapa.
- [ ] **`bloqueo_minutos`:** ¿cuántos minutos antes del kickoff? Default actual: 15.

## Tests unitarios de puntuación — resultados

| Escenario | Pronóstico | Resultado | Pts | Tipo | Test |
|---|---|---|---|---|---|
| Exacto | 2-1 | 2-1 | 4 | EXACTO | PASS |
| Diferencia | 3-1 | 2-0 | 3 | DIFERENCIA | PASS |
| Empate sin exacto | 1-1 | 0-0 | 3 | DIFERENCIA | PASS |
| Tendencia | 2-0 | 1-0 | 2 | TENDENCIA | PASS |
| Fallo total (volteado) | 2-0 | 0-2 | 0 | FALLO | PASS |
| Fallo signo incorrecto | 2-0 | 0-1 | 0 | FALLO | PASS |

**6/6 PASS**

## Archivos generados

- `supabase/migrations/00_drop_old_schema.sql`
- `supabase/migrations/01_profiles_settings_rules.sql`
- `supabase/migrations/02_matches_predictions_logs.sql`
- `supabase/migrations/03_functions_and_views.sql`
- `supabase/migrations/04_rls_policies.sql`
- `src/types/database.types.ts` — tipos TypeScript generados desde el esquema real
