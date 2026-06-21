# Fase 2 — Automatización y Lógica de Negocio

**Estado:** Completado  
**Fecha:** 2026-06-20

---

## Flujo del cron

```
Railway scheduler (cada 2 min)
  → GET /api/cron/update-matches
      Authorization: Bearer $CRON_SECRET
        │
        ├─ 401 si token inválido (fin)
        │
        ├─ Leer matches WHERE status IN (SCHEDULED, IN_PROGRESS)
        │   AND scheduled_time <= now() + 30min
        │
        └─ Para cada partido:
             │
             ├─ fetchMatch(external_id) desde football-data.org
             │    └─ ERROR → log(ERROR) + errors++ → siguiente partido
             │
             ├─ Failsafe: IN_PROGRESS por > 3h → log(FAILSAFE_ALERT)
             │
             ├─ Resolver score de quiniela según corte de la etapa:
             │    duration=REGULAR → fullTime
             │    duration=EXTRA_TIME|PENALTY_SHOOTOUT + corte='90' → regularTime
             │
             ├─ Solo actualizar si score completo (evita nulos parciales)
             │
             └─ log(CRON_RUN) con resumen al final
```

## Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (respeta RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave admin (bypasea RLS) — solo en servidor |
| `FOOTBALL_DATA_API_KEY` | Token football-data.org |
| `CRON_SECRET` | Secreto aleatorio para autenticar llamadas del cron |
| `RESEND_API_KEY` | (Pendiente) Alertas por email al admin |

## Configuración Railway

El cron se configura en Railway como un servicio cron que llama al endpoint:

```
GET https://tu-app.railway.app/api/cron/update-matches
Authorization: Bearer $CRON_SECRET
```

Frecuencia recomendada: cada 2 minutos durante el torneo, cada 10 fuera de días con partidos.

## Casos de fallo probados (Fault Injection)

| Escenario | Resultado | Verificado |
|---|---|---|
| Token incorrecto | 401, sin efecto | ✅ |
| Sin token | 401, sin efecto | ✅ |
| external_id inexistente (400 API) | Error logueado, partido sin nulos, cron continúa | ✅ |
| Sin partidos candidatos | `ok: true, updated: 0` | ✅ |
| Partido IN_PROGRESS > 3h | FAILSAFE_ALERT en system_logs | (lógica lista, no se puede simular sin esperar) |

## Escenarios de concurrencia

**Upsert idempotente:** `seed-matches` usa `upsert` con `onConflict: 'external_id'`. Ejecutar dos veces el seed no duplica partidos.

**Cron concurrente:** si Railway lanza dos instancias simultáneas, ambas hacen `UPDATE ... WHERE id = ?` — PostgreSQL serializa el acceso por fila. No hay riesgo de double-write porque no usamos INSERT sino UPDATE.

## Modo Dios — Alcance y doble validación

```
adminUpdateMatchResult(matchId, homeScore, awayScore)
  1. createClient() → getUser() → verificar sesión activa
  2. profiles.is_admin === true → verificar en DB (no en JWT)
  3. createAdminClient() → UPDATE matches SET score, result_source='MANUAL_OVERRIDE'
  4. INSERT audit_log con old_value, new_value, actor_id
```

**Alcance explícito:** solo `home_score_quiniela`, `away_score_quiniela`, `result_source`. Nunca toca `predictions`.

## Liberación manual anticipada (6/6)

```
adminEarlyUnlock(matchId)
  1. requireAdmin() → doble validación
  2. rpc('prediction_count') → si < 6, throw error con mensaje claro
  3. UPDATE matches SET early_unlock_at = now()
  4. INSERT audit_log
```

Si alguien llama directamente a la función (bypass de UI), la validación server-side rechaza con `"Solo X/6 pronósticos enviados"`.

## Actualización de equipos placeholder

```
adminUpdatePlaceholderTeam(matchId, 'home_team'|'away_team', teamName)
  → UPDATE matches SET home_team|away_team = name, is_placeholder = false
  → INSERT audit_log
```

Se corre una vez por clasificado confirmado, al terminar la fase de grupos.

## Estado de la DB tras Fase 2

- 104 partidos sembrados (32 FINISHED, 72 SCHEDULED)
- 7 etapas en `reglas_puntuacion` incluyendo LAST_32 (ronda nueva del Mundial 2026 con 48 equipos)
- `system_logs` activos con cada corrida del cron

## Pendiente

- **RESEND_API_KEY**: para email de alerta en FAILSAFE_ALERT. La lógica en el cron ya escribe el log; cuando se configure Resend, se agrega el envío de email sin cambiar la lógica principal.
- **Variable CRON_SECRET en Railway**: agregar manualmente en el dashboard (producción y QA).
