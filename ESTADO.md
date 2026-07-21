# Estado — quiniela-mundial-2026
> El primer archivo que se lee al arrancar. Tope: 60 líneas.
> Actualizar cuando: cierre de sesión (siempre).

**Ramas:** prod=`master` · staging=`develop`
**Prod:** https://quiniela-production-bdd7.up.railway.app · **Supabase:** `wltltpzvscgpnfwvgfmt`
**Detalle operativo vivo** (usuarios, crons, edge functions, features): `docs/referencia/OPERACION.md`
**Historia completa** (CHANGELOG, estados y backlog viejos, fases 0-2): `bitacora/`

## Dónde vamos
**Torneo en curso — R32/R16, Modo Real activo.** App en prod con los 6 jugadores.
Fase de grupos cerró Jun 27. Timer en vivo, drawer de análisis, penales y auditoría
de predicciones OK. Observabilidad Aegis (Sentry) viva en prod; Doppler es la fuente
de secretos. Adoptado a Aegis (FASE 2) y migrado de memoria (FASE 3) el 2026-07-13.
`aegis_version` en 1.3 (recibida desde master-framework, 2026-07-21) — Parte de
sesión ahora se persiste en `bitacora/parte-NNN.md`.

## Lo primero en próxima sesión
- **Decisión grupal abierta:** los 3 pts de Javier por el bug de penales (ya corregido)
  siguen sin resolverse con el grupo (afecta ranking real). Ver `BACKLOG.md` AUD-003.
- **Confirmar `bloqueo_minutos`** (corre en 15 default, nunca confirmado formalmente).
- Backlog técnico abierto (BUG/FEAT/TEC/UX): ver `BACKLOG.md`.
- **`/radar` 2026-07-21:** sin hallazgos accionables urgentes; Supabase avisó fin de
  legacy API keys "a finales de 2026" — verificar cuáles usa este proyecto antes de esa fecha.

## Pendientes grupales (decisión de JC + grupo)
- [ ] Resultado válido en eliminatorias: ¿90', 120' o penales? (FEAT-001 UI en pausa)
- [ ] Bonus por acertar clasificado en penales: ¿se da? ¿cuántos puntos?
