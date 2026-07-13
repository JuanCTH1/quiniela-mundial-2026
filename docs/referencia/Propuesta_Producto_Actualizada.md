# La Quiniela — Propuesta de Producto (v3)
## Mundial 2026 · Aplicación cerrada para 6 usuarios

## 1. Visión y Alcance
Aplicación web privada para que 6 jugadores predigan resultados de los 104 partidos del Mundial 2026, con cálculo automático de puntos, tabla de posiciones, bloqueo de edición antes de cada partido, y mecanismos de respaldo si la automatización falla. No es un producto comercial: el listón de calidad es "cero fallos durante el torneo", no "lanzar rápido e iterar".

## 2. Stack Tecnológico
- **Frontend/Backend:** Next.js (App Router)
- **Base de Datos y Auth:** Supabase
- **Despliegue:** Railway
- **Estilos:** Tailwind CSS, partiendo del sistema visual importado del proyecto automation brain (ver Fase 0).
- **Fuente de datos deportivos (primaria):** football-data.org. Se eligió porque su API v4 incluye un campo `regularTime` diseñado explícitamente para reportar el resultado a los 90 minutos en partidos con prórroga o penales, eliminando la ambigüedad que otras APIs dejan abierta.
- **Fuente de datos deportivos (respaldo):** API-Football, a activar solo si la primaria falla o no cubre un caso necesario. El criterio exacto de cuándo cambiar a respaldo se define empíricamente en la Fase 0.

## 3. Principio rector: las reglas son configuración, no código
Las reglas de puntuación y el método de corte por etapa (90', 120' o penales) viven en datos editables, no incrustadas en el código. Cambiar una regla debe ser editar un valor, nunca reescribir y reprobar el sistema. Esto permite que el grupo ajuste las reglas antes del arranque real (incluyendo decisiones aún abiertas) sin que se rompa nada más. Una vez que el sistema pasa a modo real, las reglas se congelan.

## 4. Modo Prueba / Modo Real
El sistema nace con un switch global de modo:
- **Modo prueba:** se pueden borrar y recargar predicciones y resultados, reejecutar el cron sobre datos ficticios (Game Day), y editar libremente todas las reglas de puntuación y de corte. Sirve para todas las validaciones previas al torneo.
- **Modo real:** al activarlo (acción deliberada, registrada en el historial), se congelan las reglas de puntuación y de corte, se limpian los datos de prueba, y a partir de ese momento las predicciones de los jugadores son intocables. Los puntos nunca cambian solos; solo cambiarían si se editan reglas, cosa que en modo real ya no se permite.

## 5. Reglas de Negocio (Core)

**Usuarios:** 6, fijos durante todo el torneo, autenticación por email/password.

**Sistema de puntuación** (estándar de la industria de quinielas, validado contra Kicktipp):
- 4 puntos — marcador exacto
- 3 puntos — diferencia de gol correcta (incluye empate acertado sin marcador exacto: como la diferencia de un empate siempre es 0, entra por esta misma puerta)
- 2 puntos — tendencia correcta (ganador/perdedor sin acertar diferencia). No aplica a empates: un empate acertado siempre cae en 3 o 4, nunca en 2.
- 0 puntos — fallo total
- 0 puntos — si el jugador no envía pronóstico antes del bloqueo (nunca se asume un resultado por default, ni 0-0 ni ningún otro)

La diferencia de gol se calcula con signo (local menos visitante), no en valor absoluto: pronosticar 2-0 cuando el resultado fue 0-2 es fallo total, no diferencia correcta.

**Resultado válido para puntuar:** configurable por etapa, con opciones 90', 120' o penales. Valor por defecto sugerido: 90' en todas las etapas. Definición final pendiente de confirmación del grupo, ver sección 12. Por estar empaquetado como configuración, el grupo puede cambiarlo (incluso optar por penales en alguna ronda) antes del arranque real sin tocar código.

**Visibilidad y bloqueo de pronósticos:**
- Los pronósticos son secretos hasta que el partido se bloquea.
- El bloqueo se activa automáticamente X minutos antes de la hora programada del partido (no la hora real, ver sección 6). Valor de X pendiente, ver sección 12.
- Tras el bloqueo, los pronósticos de ese partido se vuelven públicos para todos.
- **Las predicciones son sagradas:** cada jugador solo puede editar las suyas, y únicamente antes del bloqueo. Tras el bloqueo nadie puede modificarlas, ni siquiera el Administrador desde la app o Modo Dios.
- **Liberación anticipada:** el Administrador puede hacer públicos los pronósticos de un partido antes del tiempo de bloqueo, pero únicamente si los 6 jugadores ya enviaron su pronóstico para ese partido. Si falta uno solo, esta opción no existe bajo ninguna circunstancia, ni siquiera por error del propio Administrador.

**Desempates en la tabla general** (en este orden, garantizando siempre un único ganador):
1. Mayor cantidad de marcadores exactos acertados.
2. Mayor cantidad de diferencias de gol correctas.
3. Si persiste el empate, sorteo.

## 6. Automatización, Failsafes y Redundancia
- **Motor principal:** cron que consulta football-data.org únicamente sobre partidos en vivo o por iniciar (no el calendario completo en cada ciclo), y al detectar el resultado oficial actualiza el resultado del partido en la base.
- **Los puntos son una vista en vivo, no una tabla almacenada:** se calculan al momento a partir de los resultados. No existe un proceso de "recálculo": corregir un marcador (sea por el cron o por Modo Dios) reordena la tabla automáticamente. Esto elimina toda una clase de bugs de puntos desincronizados.
- **Idempotencia:** cada corrida actualiza por partido (upsert), tolerante a reintentos o ejecuciones concurrentes sin duplicar datos.
- **Dos relojes distintos, a propósito:**
  - *Hora programada* del partido: se usa para el bloqueo de edición (hay que cerrar antes de que empiece).
  - *Hora real* de inicio reportada por la API: se usa para el failsafe de 3 horas (hay que saber cuándo empezó de verdad).
- **Estado "finalizado":** un partido se considera finalizado para la quiniela cuando el resultado de corte definido para su etapa (90', 120' o penales) está disponible, no necesariamente cuando el partido real termina del todo. En una eliminatoria que se va a prórroga, el resultado de 90' ya se conoce mientras el partido sigue jugándose.
- **Alerta de fallo:** si no hay resultado oficial 3 horas después de la hora real de inicio (considerando aplazamientos y suspensiones), el sistema no toca nada pero notifica por email vía Resend y muestra un banner de error en la UI.
- **Observabilidad incorporada desde el inicio:** toda corrida del cron, llamada a la API y actualización de resultado queda registrada en un log del sistema visible para el Administrador. El banner de error lee de este registro en tiempo real.
- **Modo Dios (Super Admin):** rol validado del lado del servidor (no una ruta oculta). Su alcance se limita estrictamente a forzar o corregir resultados de partidos; nunca puede tocar las predicciones de los jugadores. Cada acción queda en un historial de auditoría visible para los 6.
- **Equipos por definir en eliminatoria:** los cruces que dependen de los mejores terceros de grupo (desconocidos hasta que termina toda la fase de grupos) se modelan con marcadores de posición actualizables, no con un equipo fijo desde el inicio.

## 7. Interfaz y Experiencia (UI/UX)
- Sistema visual importado del proyecto automation brain, montado en Fase 0.
- Dashboard con partidos en sus tres estados: abierto, bloqueado, finalizado.
- "El Muro de la Vergüenza" (tabla de posiciones): avatares en Supabase Storage, marco dorado para el primer lugar, fondo rojo denigrante para el último, desempate visible cuando aplica.
- Banner de error reflejando el estado real del sistema según el registro de observabilidad.

## 8. Gobernanza y Confianza
El Administrador es uno de los 6 jugadores. Para que esto no comprometa la integridad del juego:
- Las predicciones de los jugadores son técnicamente intocables desde la app, incluso para el admin.
- Modo Dios solo puede corregir resultados de partidos, nunca predicciones.
- Toda acción administrativa queda registrada y es visible para los 6.
- El admin conserva la capacidad de modificar el código (es el dueño y necesita poder arreglar bugs), pero la app por diseño no le permite alterar lo sagrado.

## 9. Criterios de Aceptación
- Las políticas de seguridad de bloqueo y visibilidad se evalúan por tiempo en cada lectura/escritura, nunca dependen de que un cron haya corrido a tiempo.
- El cálculo es exacto y está probado unitariamente en los escenarios 4-3-2-0, incluyendo el caso especial de empate y el de "sin pronóstico".
- El sistema no colapsa ni escribe valores nulos ante errores de la API; ignora el ciclo fallido y reintenta.
- Ninguna funcionalidad de administrador depende de que la URL permanezca en secreto.
- Las predicciones bloqueadas no pueden alterarse desde la app por ningún rol.

## 10. Plan de Ejecución
Cinco fases con criterios de salida obligatorios. No se avanza sin cumplir el 100% del checklist correspondiente. Detalle en `Checklist_Fases_Quiniela.md`.

0. Pruebas Aisladas y Fundamentos de Diseño (Spike Testing + Design System)
1. Esquema y Persistencia (Supabase/SQL)
2. Lógica de Negocio y Automatización (Backend/Cron)
3. Interfaz (Frontend/UI)
4. Hardening, Validación y Pre-Lanzamiento

## 11. Estrategia de Uso de Modelos Claude
- **Arquitectura, esquema SQL, políticas RLS, planificación:** Claude Opus 4.8
- **Generación de código pesado** (componentes Next.js, backend, Tailwind): Claude Sonnet 4.6
- **Tareas repetitivas** (datos de prueba, JSONs, limpieza de textos): Claude Haiku 4.5

## 12. Pendientes Abiertos
Por diferencia de horario con el grupo, el desarrollo arranca sin todas las reglas confirmadas. Por eso se construyen empaquetadas y modificables (sección 3), y se confirman antes de pasar a modo real:

1. **Resultado para fase eliminatoria:** 90', 120' o penales, igual para todas las rondas o distinto por etapa.
2. **Minutos de bloqueo antes del kickoff** (`bloqueo_minutos`).

Mientras no se confirmen, el sistema usa los valores por defecto sugeridos y permite cambiarlos en modo prueba.

Versión a compartir y validar con el grupo: `Reglamento_La_Quiniela_Mundial2026.md`.
