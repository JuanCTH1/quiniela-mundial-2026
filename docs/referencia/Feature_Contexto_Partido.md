# Feature — Contexto del partido

Sección colapsable dentro de cada tarjeta de partido con info/contexto relevante
para cada juego (sede, momios, forma, H2H, árbitro, DTs, comparativas, jugadores
clave, datos curiosos). Inspirada en FotMob/SofaScore, adaptada a la quiniela.

> Estado: UI terminada y verificada (paso 5.4). Tablas YA aplicadas a la base real
> (proyecto wltltpzvscgpnfwvgfmt), 16 sedes cargadas y sus imágenes satelitales
> subidas al bucket `venues`. Falta el resto del pipeline (abajo). El código no se
> ha desplegado a Railway todavía.

---

## Decisiones tomadas

| Tema | Decisión | Razón |
|---|---|---|
| Imagen del estadio | Satélite de **ESRI World Imagery** (sin key), subida a Supabase Storage 1 vez | Sin Google Cloud, sin key que gestionar, sin capturas a mano |
| Botón "Ver en mapa" | Link plano `google.com/maps?q=lat,lng` | Cero dependencia, nunca falla |
| Momios | **The Odds API**, mercado `h2h` por partido (key ya configurada) | Cuotas reales = no sesgadas, a diferencia del Elo del sorteo |
| Datos curiosos | **Generados con Claude (Haiku 4.5)** antes del partido, guardados en DB | Latencia/costo cero en runtime; revisables |
| Revisión de facts | ~~Obligatoria~~ → **Auto-aprobado** (Jun 28) — `generate-facts` v4 inserta con `reviewed: true`. RLS sigue mostrando solo `reviewed = true`, pero ahora se aprueba en el momento de inserción. | Decisión: la calidad de Haiku + web_search fue suficientemente buena; el paso de revisión manual generaba ruido en /admin sin valor real. |
| Imágenes en bucket | Bucket `venues` **público** | Son fotos de estadios; `<img>` carga directo sin firmar URLs |
| Consenso de la quiniela | **Descartado** por ahora | — |
| Probabilidades del ranking de sorteo | **Backlog** | Sesga (Elo del sorteo) |

---

## Lo construido (esta sesión)

- `supabase/migrations/07_match_context.sql` — tablas `venues`, `team_metadata`,
  `match_facts`, `match_odds` + columna `matches.venue_id`. RLS aditiva. **Falta
  envolver en BEGIN/COMMIT antes de aplicar** (ver procedimiento abajo).
- `supabase/migrations/08_storage_venues.sql` — bucket público `venues`.
- `supabase/seed/venues.sql` — los 16 estadios con coordenadas reales.
- `src/components/MatchContext.tsx` — componente UI (client). Degrada elegante:
  oculta cada bloque faltante; si no hay nada, no renderiza.
- `src/lib/match-context.ts` — loader server-side. Cada bloque en try/catch → null.
- `src/app/dev/contexto-demo/page.tsx` — preview sin auth con datos de muestra.
- `src/proxy.ts` — `/dev` público SOLO fuera de producción (gate `NODE_ENV`).
- `src/types/database.types.ts` — tablas nuevas añadidas a mano (regenerar tras migración).
- Cableado en `src/app/(app)/partido/[id]/page.tsx`.

Verificado: `tsc --noEmit` exit 0; preview renderiza los 10 bloques en `/dev/contexto-demo`.

---

## Procedimiento seguro de migración (sin plan Pro / sin branching)

Las migraciones 07 y 08 son **estrictamente aditivas** (tablas/columnas/policies
nuevas; cero DROP, cero cambios a columnas existentes, cero mutación de datos).
Son seguras de aplicar sobre la DB en vivo. Pasos:

1. Envolver el cuerpo de 07 y 08 en `BEGIN; … COMMIT;` (todo-o-nada).
2. Probar local sin riesgo con Supabase CLI: `supabase start` levanta un Postgres
   local; aplicar las migraciones ahí y correr el seed.
3. Aplicar a prod cuando estés listo (SQL editor de Supabase o `supabase db push`).
4. Regenerar tipos: `supabase gen types typescript` → reemplazar las tablas que
   agregué a mano en `database.types.ts`.

---

## Pendiente — pipeline de datos (orden de ejecución)

Las keys ya están en `.env.local` (`ODDS_API_KEY`, `ANTHROPIC_API_KEY`,
`FOOTBALL_DATA_API_KEY`).

1. ~~**Aplicar migraciones 07 + 08** y correr seed de venues.~~ ✅ HECHO (vía MCP).
2. ~~**Imágenes de estadios** (ESRI → bucket `venues`).~~ ✅ HECHO —
   `scripts/seed-venue-images.mjs`, 16/16 subidas.
3. **match → venue** — falta asignar `matches.venue_id`. Necesita el calendario FIFA
   (qué partido en qué estadio). Sin esto, el bloque "Sede" no aparece en partidos reales.
4. **team_metadata** — script: por selección, leer `/v4/teams/{id}` de football-data
   (DT + plantel→edad promedio); altura desde API-Football si falta. Upsert.
4. **Facts con Claude** — script: 3 facts por partido (histórico/jugador/narrativo),
   Haiku 4.5, JSON. **Correr HOY** para los partidos ya definidos (estamos a medio
   torneo). Para eliminatorias: hook en el cron → al `FINISHED` del partido que define
   el cruce, encolar facts con delay **60 min** (margen para revisar).
5. **Edge function `update-match-odds`** — gemelo de `functions/update-odds`, mercado
   `h2h` de `soccer_fifa_world_cup`; upsert en `match_odds`. 1 request cubre toda la jornada.
6. ~~**Validación (cron diario 8am)**~~ ✅ **HECHO (Jun 28)** — Edge Function `health-check` v2. 5 checks: TBD equipos 48h, facts faltantes 72h, FINISHED sin score, momios 72h, árbitros 72h. pg_cron `health-check-daily` 08:00 UTC. Email Resend si hay alertas. Panel /admin con `ContextHealthPanel`.
7. ~~**Panel admin** para revisar/aprobar facts~~ ✅ **HECHO (Jun 28)** — Auto-aprobado en inserción. Panel muestra estado sin chip de "pendiente de revisión".

### Loader — TODOs marcados en `src/lib/match-context.ts`
- `stakes`: calcular desde standings del grupo (matemática pura, NO Claude).
- `referee`: football-data lo trae en el match; falta persistirlo. NO es Claude.
- `keyPlayers`: requiere acumular goleadores/asistentes del torneo en DB.

### Decisiones de frecuencia/fuente (confirmadas con el usuario)
- **Forma reciente NO debe salir de nuestra tabla `matches`** (solo Mundial → al inicio
  sería "G G G G G" sin sentido). Traer los últimos 5 de cada equipo desde
  football-data (incluye amistosos y eliminatorias, todas las competiciones).
- **Delay tras `FINISHED`**: esperar ~30–60 min antes de refrescar forma/standings/
  stats, para que el resultado oficial se asiente y no leer datos provisionales.
- **Momios**: cuota The Odds API = 48/500 usados este mes. El cron del sorteo
  (outright) ya corre diario (~30/mes). h2h por partido = 1 crédito/día (1 request
  cubre toda la jornada). Total ~60/mes → NO hace falta bajar la frecuencia del sorteo.
- **Solo los DATOS CURIOSOS usan Claude.** Árbitro = sports API. Validación "todo
  listo" = lógica/SQL + email Resend. Stakes = aritmética. Nada de eso es Claude.
- **Facts de eliminatorias**: generar cuando AMBOS equipos del cruce estén confirmados
  (al terminar el partido que define el slot), con delay de 60 min.

---

## Dudas pendientes (dejadas para confirmar)

- ¿Registrarse en **The Odds API** ya está hecho? La key está puesta; falta validar
  que cubra el mercado `h2h` (no solo `outrights`).
- ¿Los facts se revisan partido por partido en el panel, o aprobación en lote?

## Limpieza antes de producción

- Borrar o proteger `src/app/dev/contexto-demo/page.tsx` (el gate `NODE_ENV` ya lo
  bloquea en prod, pero mejor quitarlo).
- **Rotar** las keys que vivieron en el chat: `SUPABASE_SERVICE_ROLE_KEY`, Gmail App
  Password, `ODDS_API_KEY`, `ANTHROPIC_API_KEY`.
- Una vez con datos reales, el loader computa `form`/`h2h` desde `matches` (tabla
  existente): la sección aparecerá en prod en cuanto se despliegue, aun sin poblar
  las tablas nuevas. Esperado y aditivo.
