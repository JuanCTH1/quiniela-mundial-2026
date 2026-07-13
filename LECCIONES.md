# Lecciones — quiniela-mundial-2026
> Lo aprendido que cambia cómo se trabaja aquí. Sembrado con las lecciones universales de JC (pagadas con sangre en proyectos anteriores). Tope: 120 líneas.
> Actualizar cuando: una sesión enseña algo reutilizable (no un hecho puntual — eso va a EVIDENCIA).
> Detalle largo de cada lección del proyecto: snapshot en `bitacora/LESSONS_LEARNED_BETA.md`.

## Universales (heredadas — aplican a todo proyecto)
- **Los contratos de API se verifican contra la respuesta real**, no contra lo que dice la doc o
  lo que uno supone. "Debería devolver X" no es un contrato.
- **Fail loud, not silent.** Un error tragado en silencio es una bomba de tiempo; que truene
  fuerte y visible en el momento, no tres semanas después en prod.
- **Env var, no comentario.** La config sensible va en variable de entorno por ambiente, jamás
  hardcodeada ni "documentada" en un comentario.
- **Sufijo por ambiente desde el día 1.** Toda config que difiera entre QA y prod nace con su
  distinción explícita — nunca "ya lo separo después".
- **"Funciona con 1" ≠ "funciona con N".** Lo que anda con un registro puede reventar con cien;
  probar volumen, no el caso de juguete.
- **UTC en los datos, zona horaria solo en la presentación.** Guardar siempre en UTC; convertir
  únicamente al mostrar. Mezclarlo es garantía de bugs de fecha imposibles de rastrear.

## Del proyecto
- **Build antes de push (CRÍTICO).** `npm run build` local ANTES de pushear: los errores de tipo,
  exports faltantes y mismatches solo salen en build, no en dev. Sin esto, Railway falla en silencio.
- **Checkpoints con git tags.** Al cerrar un milestone estable, tag anotado (`git tag -a`) como
  punto de rollback que no depende de la memoria de nadie.
- **pg_cron > cron de Railway para jobs internos.** Los crons de Railway no alcanzaban la API;
  pg_cron corre dentro de Supabase con acceso garantizado a URLs públicas. Más confiable.
- **Regenerar tipos de Supabase tras cada cambio de schema.** `supabase gen types` después de todo
  ALTER TABLE; si no, el build truena y se cae en el `as any` que oculta errores reales.
- **Crear usuarios en Supabase: SQL directo, 3 pasos obligatorios.** El invite por email no sirve:
  los scanners de Outlook/Gmail pre-fetchean el link y consumen el OTP de un solo uso. Ver
  `docs/referencia/Crear_Usuario_Prod.md` (auth.users + auth.identities + limpiar NULLs o GoTrue da 500).
- **NUNCA mergear a master sin orden explícita.** Aunque JC diga "push", asumir develop. Solo ir a
  master/prod cuando la orden mencione explícitamente prod/master/producción.
- **Ventanas de alerta: confirmar el tamaño antes de implementar.** Una alerta de "próximos N días"
  con N mal puesto genera decenas de falsos positivos. Preguntar la ventana antes de hardcodear.
- **Botones de admin solo para operaciones recurrentes.** Lo que se hace una vez se hace con SQL
  directo, no con un endpoint + botón que luego hay que recordar borrar.
- **Upsert sin tocar la columna de auditoría: el timestamp miente.** En un UPDATE, Postgres solo
  cambia las columnas del payload; `submitted_at`/`updated_at` se queda con el valor del INSERT.
  Incluirla siempre en el payload o, mejor, un trigger `BEFORE UPDATE`.
- **Cron nuevo: sumar cuotas, no evaluar aislado.** Al agregar un job que llama un recurso externo
  con cuota, preguntar qué otros crons lo llaman y sumar las llamadas totales (caso 429 de 2 crons
  cada 2min contra la misma key de football-data.org, 2 semanas de fallo parcial silencioso).
- **Inputs controlados para comparar contra lo guardado.** El dirty-state ("✓ guardado" honesto)
  necesita inputs controlados desde el inicio; con `ref`/`defaultValue` la comparación es frágil.
- **Definir un sistema ≠ aplicarlo.** Definir temas (ThemeProvider, CSS vars, DB) es la fase fácil;
  conectar cada componente a las variables nuevas es la tediosa y la que de verdad se ve.
