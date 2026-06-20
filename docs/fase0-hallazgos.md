# Fase 0 — Hallazgos y Fundamentos

**Fecha de cierre parcial:** 2026-06-20  
**Estado:** Cerrada con 2 ítems diferidos (ver sección Pendientes)

---

## 1. Cobertura de la API — football-data.org

**Fecha:** 2026-06-20  
**Endpoint probado:** `GET /v4/competitions/WC/matches`  
**Token:** `7e1b6a464c584c39855bff759f64b5f0` (free tier)

**Conclusión:** El Mundial 2026 (WC) está completamente accesible en el plan gratuito. La API devuelve todos los partidos del torneo en curso, con resultados, estado y metadata correcta. No requiere upgrade para la fase de grupos.

**Respuesta de muestra (México vs Sudáfrica, Jornada 1):**
```json
{
  "id": 537327,
  "utcDate": "2026-06-11T19:00:00Z",
  "status": "FINISHED",
  "homeTeam": { "name": "Mexico" },
  "awayTeam": { "name": "South Africa" },
  "score": {
    "fullTime": { "home": 2, "away": 0 },
    "regularTime": null,
    "duration": "REGULAR"
  }
}
```

**Autenticación y límites:**
- Header `X-Auth-Token` funciona correctamente
- Límite de tasa confirmado: 10 req/min en free tier (documentado y verificado en práctica)

---

## 2. Campo `regularTime` — comportamiento observado

**Fecha:** 2026-06-20  
**Partidos analizados:** 5 partidos de fase de grupos del Mundial 2026

**Hallazgo crítico:** Para partidos de fase de grupos, el campo `regularTime` **no existe como clave en la respuesta JSON** (no es `null` — directamente ausente). Código que asuma su presencia fallará con `KeyError` / `TypeError`.

| Partido | Fecha | `fullTime` | `regularTime` | `duration` |
|---|---|---|---|---|
| México vs Sudáfrica | 2026-06-11 | `{2, 0}` | ausente | `REGULAR` |
| Corea del Sur vs Chequia | 2026-06-12 | `{2, 1}` | ausente | `REGULAR` |
| Canadá vs Bosnia | 2026-06-12 | `{1, 1}` | ausente | `REGULAR` |
| EUA vs Paraguay | 2026-06-13 | `{4, 1}` | ausente | `REGULAR` |
| Qatar vs Suiza | 2026-06-13 | `{1, 1}` | ausente | `REGULAR` |

**Implicación para el código:** usar `score.get('regularTime')` (Python) o `score?.regularTime` (TS). Para partidos `REGULAR`, el score a usar es `fullTime`. El campo `regularTime` solo se espera cuando `duration` es `EXTRA_TIME` o `PENALTY_SHOOTOUT`.

### ⏳ PENDIENTE — validación de `regularTime` en prórroga/penales
- Requiere un partido de eliminatoria del Mundial 2026 que llegue a prórroga o penales
- Qatar 2022 devuelve 403 en free tier (Tier 1)
- **Acción:** validar en el primer partido de ronda de 16 que vaya a prórroga (primera semana de julio 2026)
- **Riesgo si no se valida:** puntuación incorrecta en eliminatoria. Mitigación: campo `home_score_regular`/`away_score_regular` en tabla `matches` permite corregir sin cambiar el schema

---

## 3. Delay real de la API (free tier)

**Fecha:** 2026-06-20  
**Metodología:** comparar `utcDate` (kickoff) + ~2h (duración estimada) vs `lastUpdated` en respuesta de la API

| Partido | Kickoff (UTC) | Fin estimado | `lastUpdated` | Delta aprox |
|---|---|---|---|---|
| Uzbekistán vs Colombia | 02:00 | 04:00 | 08:25 (+0d) | ~4h25m |
| Chequia vs Sudáfrica | 16:00 | 18:00 | 03:25 (+1d) | ~9h25m |
| Suiza vs Bosnia | 19:00 | 21:00 | 03:25 (+1d) | ~6h25m |
| Canadá vs Qatar | 22:00 | 00:00 | 03:25 (+1d) | ~3h25m |
| **México vs Corea del Sur** | 01:00 | 03:00 | **03:25** | **~25 min** |
| EUA vs Australia | 19:00 | 21:00 | 08:25 (+1d) | ~11h25m |
| Escocia vs Marruecos | 22:00 | 00:00 | 08:25 (+1d) | ~8h25m |

**Interpretación:** `lastUpdated` NO representa cuándo el score se hizo disponible — es la última vez que football-data.org actualizó el registro (corre en batch ~03:25 UTC y ~08:25 UTC). El delay real de la API para scores finales en free tier probablemente es mucho menor (< 5 min según el patrón de México vs Corea del Sur).

### ⏳ PENDIENTE — delay real medido con precisión
- Requiere observar un partido en vivo y medir cuándo aparece el resultado final
- **Acción:** registrar manualmente en el primer partido que juguemos como quiniela (Mundial sigue en curso)
- **Impacto en el failsafe de 3h:** el failsafe es suficientemente holgado que incluso un delay de 60 min no rompe la experiencia. Se mantiene en 3h hasta medir el dato real.

**Criterio de activación del respaldo (API-Football):** intervención manual del admin vía Modo Dios. No hay failover automático. Apropiado para app de 6 usuarios.

---

## 4. Sistema de diseño

**Fuente:** `C:\Users\jtatto\Claude-Design-Assets\style.css` (proyecto Ecosistema Desarrollador)  
**Adaptación:** glassmorphism oscuro con paleta reemplazada a colores Mundial/México

| Token | Valor | Uso |
|---|---|---|
| `--mx-green` | `#006847` | Verde bandera México — acento primario |
| `--mx-red` | `#CE1126` | Rojo bandera México — acento secundario |
| `--gold` | `#D4AF37` | Primer lugar (Muro de la Vergüenza) |
| `--shame-red` | `#8B0000` | Último lugar (Muro de la Vergüenza) |
| `--bg-dark` | `#060c0a` | Fondo base oscuro |
| `--glass-bg` | `rgba(255,255,255,0.05)` | Cards glassmorphism |

**Tailwind v4:** tokens en `@theme inline {}` dentro de `globals.css`. Sin `tailwind.config.ts`.

**Estilos condicionales del Muro:**
- `.rank-first` → borde dorado (`--gold`), glow dorado
- `.rank-last` → fondo `--shame-red` con opacidad

**Mockups aprobados:** dashboard (3 estados de partido), Muro de la Vergüenza, formulario de pronóstico. Aprobados como "suficientes para continuar" en sesión de diseño (2026-06-20).

---

## 5. Insumos para fases siguientes

| Fase | Insumo de esta fase |
|---|---|
| **Fase 1** | Campo a guardar en `matches`: `home/away_score_fulltime`, `home/away_score_regular` (separados), y `home/away_score_quiniela` (el que se usa, determinado por `corte` de la etapa) |
| **Fase 2** | Failsafe: 3h desde `actual_start_time`. Cron solo consulta partidos SCHEDULED o IN_PROGRESS. |
| **Fase 3** | Sistema visual completo en `globals.css`. Componentes `.glass-card`, `.rank-first`, `.rank-last`, `.test-mode-banner`. |
