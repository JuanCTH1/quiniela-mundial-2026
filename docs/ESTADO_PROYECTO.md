# Estado del Proyecto — Quiniela Overrated 2026

> Actualizado: 2026-06-21

## Estado general

**Fase activa: Fase 3 completada / Pre-Modo Real**

La app está en producción con todos los jugadores onboardeados. El torneo ya empezó (2026-06-11). Pending: activar "modo real" cuando el grupo esté listo.

## Usuarios en producción

| Jugador | Email | Estado |
|---|---|---|
| Juan Carlos (admin) | juancarlostatto@gmail.com | ✅ activo |
| Ernesto Inzunza | inzunza.ernesto@gmail.com | ✅ password seteado por SQL |
| Gustavo Inzunza | gustavoinzunza30@gmail.com | ✅ password seteado por SQL |
| Jesús Tunal | jesus.tunaal@gmail.com | ✅ password seteado por SQL (bug auth.identities NULL resuelto) |
| (pendiente confirmar) | — | ¿queda alguien más? |

## URLs

- **Prod:** https://quiniela-production-bdd7.up.railway.app
- **QA:** (Railway QA env, rama develop)
- **Supabase:** proyecto `wltltpzvscgpnfwvgfmt`

## Lo primero en próxima sesión

1. Confirmar que Jesús Tunal puede entrar (último fix aplicado: auth.identities + NULL tokens)
2. Confirmar quiénes son todos los jugadores (¿hay alguien más además de los 4 registrados?)
3. Decidir a partir de qué partido cuentan los pronósticos (usar botón "Punto de inicio" en /admin)
4. Activar "Modo Real" desde /admin cuando el grupo esté listo

## Pendientes grupales (confirmar con el grupo)

- [ ] ¿A partir de qué partido cuentan los pronósticos? (hay botón en /admin para borrar anteriores)
- [ ] Resultado válido en eliminatorias: ¿90', 120' o penales?
- [ ] ¿Cuántos minutos de bloqueo antes del kickoff? (actualmente 15)
