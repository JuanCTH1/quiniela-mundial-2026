# Prioridades de verificación — quiniela-mundial-2026
> Matriz que el Verificador (FASE 4) usa para decidir qué bloquea, qué revisa y qué escala a JC. Sembrada con defaults; se ajusta con las respuestas de JC al adoptar/crear. Máx. ~40 líneas.
> Actualizar cuando: cambie qué es crítico para el negocio (no cada sesión — es estructural).

## Niveles (qué hace el Verificador con cada uno)
- **CRÍTICO** — bloquea prod SIEMPRE y escala a JC SIEMPRE. Nada crítico pasa sin su ojo.
- **ALTO** — el Verificador lo revisa siempre; escala solo si encuentra problema.
- **MEDIO** — spot-check; de los hallazgos, escala solo los 2 mayores, el resto toma la opción
  segura por defecto y queda anotado en `DEUDA.md` para revisión en lote.
- **BAJO** — se anota, no bloquea.

## Matriz (defaults — ajustar por proyecto)

| Área | Nivel | Nota |
|---|---|---|
| Secretos / credenciales expuestas | CRÍTICO | Ya cubierto por C1, pero el Verificador reconfirma en el diff. |
| Auth / permisos / control de acceso | CRÍTICO | Cualquier cambio que toque quién puede hacer qué. |
| Datos personales / sensibles (fuga, borrado) | CRÍTICO | Ver `perfil_seguridad` en config. |
| Migración de schema / integridad de datos | CRÍTICO | Irreversible en prod: se mira dos veces. |
| Contratos de API contra respuesta real | ALTO | Regla universal: no se confía en la doc. |
| Manejo de errores (fail loud, no silent) | ALTO | |
| Comportamiento con volumen (N, no 1) | ALTO | Requiere `seed_qa` con ≥100 registros. |
| Regresión visual en superficies frágiles | MEDIO | Ver `superficies_fragiles` en config. |
| Rendimiento / queries N+1 | MEDIO | Escala solo si es evidente. |
| Estilo / naming / formato | BAJO | Lint ya lo cubre; no escala. |
