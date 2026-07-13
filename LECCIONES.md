# Lecciones — quiniela-mundial-2026
> Lo aprendido que cambia cómo se trabaja aquí. Sembrado con las lecciones universales de JC (pagadas con sangre en proyectos anteriores). Tope: 120 líneas.
> Actualizar cuando: una sesión enseña algo reutilizable (no un hecho puntual — eso va a EVIDENCIA).

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
_(vacío — se llena conforme el proyecto enseña)_
