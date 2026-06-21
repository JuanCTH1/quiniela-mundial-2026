# Checklist de Fases — La Quiniela
## Criterios de salida (gate) por etapa

**Regla general: ninguna fase comienza sin que la anterior tenga el 100% de su checklist cumplido y su documento de salida completo.** No hay excepciones por prisa de calendario; si el Mundial avanza más rápido que el checklist, se ajusta el alcance de la fase, no el criterio de salida.

---

## FASE 0 — Pruebas Aisladas y Fundamentos de Diseño
**Objetivo:** validar supuestos técnicos críticos y montar el sistema visual antes de comprometer cualquier arquitectura o UI.

### Checklist de salida — Pruebas técnicas
- [ ] Confirmado que el Mundial 2026 está disponible en el plan gratuito de football-data.org y que devuelve los partidos del torneo actual (no solo históricos).
- [ ] Confirmado que el campo `regularTime` devuelve correctamente el resultado a 90' en al menos 3 partidos históricos de eliminatoria que llegaron a penales (ej. octavos de Qatar 2022).
- [ ] Medido el delay real del plan gratuito en un partido recién finalizado (fin real del partido vs. disponibilidad del dato vía API), no asumido por documentación.
- [ ] Autenticación contra la API probada de forma funcional (token válido, límites de tasa confirmados en la práctica).
- [ ] Definido el criterio exacto de cuándo activar la fuente de respaldo (API-Football).
- [ ] Acceso de red resuelto: dominio en la whitelist de Claude, o script local funcionando con resultados compartidos y revisados.

### Checklist de salida — Fundamentos de Diseño
- [ ] Estilos del proyecto automation brain localizados e importados (tokens de color, tipografía, espaciados, componentes base).
- [ ] Sistema visual adaptado a Tailwind y documentado (paleta, tipografía, estados de componente).
- [ ] Definidos los estilos condicionales clave del Muro de la Vergüenza (marco dorado primer lugar, fondo rojo último lugar) a nivel de tokens, no improvisados en Fase 3.
- [ ] Mockup estático de las pantallas principales (dashboard, muro, formulario de pronóstico) aprobado, aunque sea sin datos reales.

### Documentación de salida
Archivo `fase0-hallazgos.md`: fecha de cada prueba, partidos usados, respuesta JSON relevante, conclusión sobre qué campo usar, delay medido, y el sistema de diseño documentado. **Insumo obligatorio para Fase 1** (qué campo guardar en `matches`), **Fase 2** (valor inicial del failsafe) y **Fase 3** (todo el sistema visual ya resuelto).

---

## FASE 1 — Esquema y Persistencia (Supabase/SQL)
**Objetivo:** modelo de datos sólido, seguridad basada en tiempo, reglas como configuración, predicciones blindadas.

### Checklist de salida
- [ ] Tablas creadas: `users`, `matches` (con soporte de equipos placeholder para eliminatoria), `predictions`, `settings`, `reglas_puntuacion` (configurables), `system_logs`, `audit_log`.
- [ ] Switch global de modo (prueba/real) implementado, con el paso a real como acción deliberada y registrada.
- [ ] Reglas de puntuación y método de corte por etapa almacenadas como configuración editable, no incrustadas en código. Soportan 90', 120' y penales como opciones.
- [ ] En modo real, las reglas quedan congeladas a nivel de base de datos (no editables desde la app).
- [ ] Vista de puntuación (no tabla estática) implementada, con diferencia de gol con signo y la regla de empate ya definida.
- [ ] Política RLS de bloqueo de edición basada en hora programada vs `bloqueo_minutos`, sin depender de un flag actualizado por cron.
- [ ] Predicciones blindadas: una vez bloqueadas, ninguna política permite editarlas, ni siquiera con rol admin.
- [ ] Política RLS de visibilidad basada en tiempo, más función de liberación manual que verifica conteo 6/6 antes de activarse.
- [ ] Rol de Administrador validado en servidor, con alcance limitado a resultados de partidos (nunca a predicciones).
- [ ] Política RLS del bucket de avatares probada explícitamente (un usuario no puede leer/escribir el avatar de otro).
- [ ] Pruebas unitarias de la vista de puntuación: los 4 escenarios, más empate y "sin pronóstico" = 0.
- [ ] Prueba de límite: insertar una predicción exactamente en el segundo del bloqueo y confirmar el comportamiento.

### Documentación de salida
Comentarios SQL en las migraciones, más `fase1-esquema.md` con diagrama de tablas y justificación de cada política RLS. **Insumo obligatorio para Fase 2 y Fase 4.**

---

## FASE 2 — Lógica de Negocio y Automatización (Backend/Cron)
**Objetivo:** integración con la API, cron idempotente, failsafes funcionando de verdad.

### Checklist de salida
- [ ] Integración con football-data.org usando el campo validado en Fase 0.
- [ ] Cron consultando solo partidos en vivo o por iniciar.
- [ ] Upsert por `match_id` probado bajo ejecución concurrente simulada.
- [ ] Manejo de error 500/timeout sin escribir nulos, con reintento documentado.
- [ ] Failsafe de 3 horas medido desde la hora real de inicio, considerando aplazamientos/suspensiones.
- [ ] Estado "finalizado" disparado por disponibilidad del resultado de corte de la etapa, no por el fin real del partido.
- [ ] Cada corrida del cron escribe en `system_logs`.
- [ ] Modo Dios con doble validación (rol de servidor + lógica de negocio) y alcance limitado a resultados.
- [ ] Función de liberación manual con validación server-side del conteo 6/6.
- [ ] Fault injection: simular 500, timeout y JSON malformado; confirmar que no colapsa y que el log lo refleja.
- [ ] Proceso de actualización de equipos placeholder una vez confirmados los clasificados de grupos.

### Documentación de salida
Archivo `fase2-automatizacion.md`: diagrama de flujo del cron, casos de fallo probados, variables de entorno necesarias. **Insumo obligatorio para Fase 3 y Fase 4.**

---

## FASE 3 — Interfaz (Frontend/UI)
**Objetivo:** UI que refleja fielmente las reglas, consumiendo el sistema visual de Fase 0, sin lógica duplicada.

### Checklist de salida
- [ ] UI construida sobre el sistema de diseño de Fase 0, sin estilos improvisados.
- [ ] Dashboard con los 3 estados de partido reflejando exactamente las políticas RLS de Fase 1.
- [ ] Formulario de pronóstico deshabilitado automáticamente al cruzar el bloqueo, sin refresco manual.
- [ ] Muro de la Vergüenza leyendo de la vista de puntuación, con desempate visualmente claro.
- [ ] Banner de error leyendo en tiempo real de `system_logs`.
- [ ] Permisos de Storage de avatares verificados también desde la UI.
- [ ] Botón de liberación manual visible solo para el admin, habilitado solo con 6/6 confirmado por backend, y que falle con gracia si se fuerza.
- [ ] Indicador visible de modo prueba vs modo real, para no confundir datos ficticios con reales.
- [ ] Probado en al menos un dispositivo móvil real.

### Checklist adicional — decisiones de diseño acordadas en sesión (Jun 2026)
Estos puntos son gates específicos de la implementación real, complementarios al checklist base de arriba.

#### Login
- [ ] Pantalla de login con diseño glassmorphism oscuro (glass-card, blobs de fondo, colores del token system).
- [ ] No hay registro público: el admin invita a cada jugador vía Supabase (invite email → link de primer acceso).
- [ ] Los 6 correos de los jugadores están registrados y probaron entrar con su link antes de modo real.
- [ ] Existe una cuenta QA del admin para probar sin afectar datos de jugadores reales.

#### Banner de próximo partido
- [ ] Siempre visible en la parte superior de la app (todas las pantallas autenticadas), excepto login.
- [ ] Muestra: bandera + nombre local, bandera + nombre visitante, hora del kickoff en la zona horaria del usuario.
- [ ] Muestra el pronóstico actual del usuario o advertencia "Sin pronóstico" si no ha capturado.
- [ ] Muestra countdown "Cierra en X" antes del bloqueo, o "Empieza en X" después del bloqueo.
- [ ] Es un link al detalle del partido.
- [ ] Si no hay próximo partido programado, el banner no aparece (no muestra error ni queda vacío feo).

#### Tarjetas de partido — 3 estados
- [ ] Estado ABIERTO: pronóstico editable inline en la tarjeta (sin modal), con countdown al cierre visible.
- [ ] Estado BLOQUEADO: todos los 6 pronósticos visibles con nombre + score, inputs deshabilitados.
- [ ] Estado FINALIZADO: resultado real + pronósticos con código de color (EXACTO, DIFERENCIA, TENDENCIA, FALLO) + puntos ganados por cada uno.
- [ ] La transición ABIERTO → BLOQUEADO ocurre automáticamente en la UI sin refresco manual (countdown llega a 0, UI actualiza).

#### Guardar pronóstico (UX)
- [ ] Botón "Guardar" con estado pending visible durante el server action.
- [ ] Cambio a "Editar" después de guardar exitosamente.
- [ ] Error visible inline (no toast) si falla.
- [ ] Si el partido ya está bloqueado, el form muestra "🔒 Cerrado para pronósticos" y no tiene inputs activos.

#### Vista de partido en vivo
- [ ] En partidos IN_PROGRESS, el marcador actual se actualiza via Supabase Realtime (postgres_changes en la tabla `matches`).
- [ ] Se muestran los pronósticos de todos + puntos tentativos con el marcador actual.
- [ ] Pequeño ranking tentativo visible (quién va ganando ahora mismo con este marcador).
- [ ] Indicador visual "● En juego" claramente distinguible.
- [ ] Aclarado con el grupo: el tier gratuito de football-data.org da actualizaciones IN_PROGRESS con ~5-15 min de delay — esto es aceptable para la quiniela.

#### Navegación de partidos
- [ ] Tabs de etapa: Grupos → 32avos → Octavos → Cuartos → Semis → 3er lugar → Final.
- [ ] Scroll horizontal de fechas visible en vista de Grupos (Hoy, Mañana, Lun 23, etc. en la zona horaria del usuario).
- [ ] En tabs de eliminatoria, desaparece el scroll de fechas.
- [ ] "Hoy" es la vista default.

#### El Ranking (antes "Muro de la Vergüenza")
- [ ] El leaderboard se llama **"El Ranking"** en la UI, no "Muro de la Vergüenza".
- [ ] Posición 1: título **"El Messias"** con corona 👑, color dorado, borde dorado en el card.
- [ ] Posición 2: **"El Escolta"** color neutro/plata.
- [ ] Posición 3: **"El de Bronce"** color neutro/cobre.
- [ ] Posición 4: **"El del Montón"** color gris.
- [ ] Posición 5: **"El Sparring"** color gris oscuro.
- [ ] Posición 6: **"El Analista de la FIFA"** (o equivalente de vergüenza), color shame-red, borde rojo en el card.
- [ ] Regla de desempate visible en la UI: exactos → diferencias → sorteo.
- [ ] Tu propia fila resaltada con fondo verde sutil (mx-green low-opacity).
- [ ] Avatar visible en cada fila del ranking.

#### Avatares
- [ ] Avatar muestra foto si existe, o círculo con iniciales si no.
- [ ] Borde dorado en avatar de #1, borde shame-red en avatar de #6.
- [ ] El usuario puede subir/cambiar su avatar desde /perfil.
- [ ] RLS de Storage: un usuario no puede leer ni escribir el avatar de otro (probado explícitamente).

#### Zona horaria por usuario
- [ ] Cada usuario elige su zona horaria en /perfil.
- [ ] Opciones incluyen: Ciudad de México, **Mazatlán (America/Mazatlan)**, Tijuana, Nueva York, Madrid, UTC.
- [ ] Todos los horarios de partidos en la UI se convierten a la zona del usuario (nunca se muestra UTC crudo).
- [ ] Toda la base de datos guarda en UTC; la conversión es solo en presentación.

#### Equipos placeholder
- [ ] Los partidos de eliminatoria con equipos "por definir" muestran texto descriptivo (e.g. "Ganador Grupo A").
- [ ] El cron de actualización detecta automáticamente cuando la API ya devuelve el nombre real y actualiza `matches`.
- [ ] Una vez actualizado, el banner y las tarjetas reflejan el nombre real sin intervención manual.

#### Flags
- [ ] Cada equipo muestra su bandera emoji en tarjetas, banner y detalle del partido.
- [ ] Si un equipo no tiene flag mapeado, muestra 🏳️ (no error, no roto).

#### Perfil (/perfil)
- [ ] Nombre para mostrar editable.
- [ ] Zona horaria seleccionable (dropdown).
- [ ] Botón de cerrar sesión.
- [ ] Badge "Admin" visible si el usuario es admin.

#### Panel Admin (/admin)
- [ ] Solo accesible si `is_admin = true` en la sesión del servidor (redirect a /partidos si no).
- [ ] Enlace visible en el BottomNav solo para admins.
- [ ] Selector de modo (prueba / real): el paso a real pide confirmación explícita y es irreversible.
- [ ] Config de minutos de bloqueo editable desde la UI.
- [ ] Invitación de nuevos jugadores por email desde la UI.
- [ ] Lista de jugadores registrados visible.
- [ ] Log de las últimas 50 entradas de `system_logs`, errores resaltados en rojo.
- [ ] Botón de liberación manual ("Liberar antes") visible en el detalle del partido, habilitado solo cuando el backend confirma 6/6 pronósticos, con validación server-side.

#### Diseño y sistema visual
- [ ] Todos los colores usan CSS variables (no hard-coded), definidas en `@theme inline {}` en `globals.css`.
- [ ] Colores temáticos del Mundial pero **cambiables via variables**: verde México (`--mx-green`), rojo México (`--mx-red`), dorado (`--gold`), vergüenza (`--shame-red`).
- [ ] Glassmorphism oscuro consistente en toda la app (`.glass-card`, blobs, backdrop-blur).
- [ ] Fuente Outfit en toda la app (Google Fonts, ya declarada en globals.css).
- [ ] BottomNav fijo con safe-area-inset para iPhones con notch.
- [ ] Banner de modo prueba visible y claramente diferenciado del modo real.
- [ ] Banner de alerta de sistema (errores recientes del cron) visible cuando aplica.

#### QA antes de producción
- [ ] Todo lo anterior probado en el entorno de QA de Railway antes de tocar producción.
- [ ] Probado en al menos un dispositivo móvil real (iOS o Android).
- [ ] Los 6 jugadores hicieron al menos un pronóstico de prueba y lo vieron reflejado correctamente en El Ranking.
- [ ] Confirmado que ningún jugador ve pronósticos ajenos antes de que el partido se bloquee.

### Documentación de salida
Archivo `fase3-interfaz.md`: capturas de cada estado y lista de componentes reutilizables. **Insumo obligatorio para Fase 4.**

---

## FASE 4 — Hardening, Validación y Pre-Lanzamiento
**Objetivo:** cero tolerancia a fallos antes de pasar a modo real.

### Checklist de salida
- [ ] Game Day completo en modo prueba: datos de un Mundial pasado de extremo a extremo (partido → cron → resultado → bloqueo → visibilidad → Modo Dios) sin intervención manual fuera de lo documentado.
- [ ] UAT con los 6 jugadores sobre un partido de prueba, confirmando que nadie ve pronósticos ajenos antes de tiempo.
- [ ] Prueba del paso de modo prueba a modo real: las reglas se congelan y los datos de prueba se limpian sin tocar nada que deba persistir.
- [ ] Registro de riesgos (FMEA) completo al 100%, cada fila con prueba ejecutada, fecha y resultado.
- [ ] Runbook de contingencia manual escrito y accesible sin depender de que el sistema funcione, cubriendo tanto fallo de la API como caída de plataforma (Supabase/Railway).
- [ ] Auditoría de zonas horarias: todo en UTC en base, conversión solo en presentación, verificado en cada franja horaria del Mundial.
- [ ] Prueba de saturación: simular un día con varios partidos simultáneos y confirmar que el cron no se queda sin cupo de API.

### Registro de Riesgos (FMEA) — 100% probado antes de pasar a modo real

| Riesgo | Disparador | Impacto | Validación requerida | Probado |
|---|---|---|---|---|
| Mundial 2026 no cubierto por el free tier | Fuente elegida sin confirmar cobertura | Todo el plan se cae | Confirmado en Fase 0 contra el torneo real | [ ] |
| Campo de resultado a 90' mal interpretado | Eliminatoria con prórroga | Puntos mal calculados | Confirmado en Fase 0 contra históricos | [ ] |
| Delay desconocido del plan gratuito | Partido recién terminado | Failsafe en falso o recálculo lento | Medido en Fase 0 | [ ] |
| Doble conteo por solape del cron | Reintentos o concurrencia | Datos duplicados | Test de idempotencia en Fase 2 | [ ] |
| Admin altera predicciones | Acción desde la app o Modo Dios | Se rompe lo más sagrado del juego | Intentar editar una predicción bloqueada con rol admin, debe ser imposible | [ ] |
| Liberación manual con jugador faltante | Bug de frontend o llamada directa | Se rompe "nunca si falta alguno" | Intentar liberar con 5/6 vía llamada directa, debe rechazar | [ ] |
| Escalación de privilegios en Modo Dios | JWT manipulado o llamada directa | Usuario normal corrige marcadores | Ejecutar función admin como no-admin, debe rechazar | [ ] |
| Edición de reglas en modo real | Cambio de configuración tras el arranque | Reglas mutan a mitad de torneo | Intentar editar reglas en modo real, debe estar bloqueado | [ ] |
| Paso a modo real borra datos que debían quedarse | Limpieza mal acotada | Pérdida de datos | Probar la transición con datos de prueba claramente marcados | [ ] |
| Drift de reloj entre Railway/Supabase | `now()` en el límite del bloqueo | Bloqueo se activa a destiempo | Insertar predicción justo en el segundo límite | [ ] |
| Confusión entre hora programada y hora real | Partido aplazado | Bloqueo o failsafe a destiempo | Probar un partido con inicio retrasado simulado | [ ] |
| Estado "finalizado" mal disparado en eliminatoria | Partido en prórroga | Puntos a destiempo | Probar un partido que pasa de 90' a prórroga | [ ] |
| Desempate sin resolver | Empate real en la tabla | Sin ganador único | Simular empate total hasta el sorteo | [ ] |
| Falla silenciosa del email de alerta | Resend mal configurado, va a spam | Admin no se entera del fallo | Forzar un envío de prueba | [ ] |
| Permisos mal configurados en avatares | RLS de Storage no probada | Un jugador toca el avatar de otro | Test explícito de RLS sobre el bucket | [ ] |
| Sin historial de acciones del admin | Corrección por error | Nadie ve qué cambió | Tabla de auditoría para cada acción de Modo Dios | [ ] |
| Saturación de la API en días pico | Varios partidos simultáneos | Cron se queda sin cupo | Stress test de un día pico real | [ ] |
| Equipos "por definir" en eliminatoria | Cruces con mejores terceros sin confirmar | `matches` sin equipo real hasta terminar grupos | Placeholders actualizables | [ ] |
| Caída de plataforma sin plan B | Supabase o Railway caen el día clave | App inservible sin protocolo | Runbook de contingencia probado | [ ] |

### Documentación de salida
Archivo `fase4-validacion.md`: certificado de cierre. Cada fila del FMEA con fecha, resultado y responsable. **Sin este archivo al 100%, el sistema no pasa a modo real.**
