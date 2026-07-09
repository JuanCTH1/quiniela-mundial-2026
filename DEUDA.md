# DEUDA — quiniela-mundial-2026

> Riesgos aceptados y deuda técnica con dueño y fecha de revisión.
> Origen de este archivo: Aegis FASE 0 (higiene de emergencia), 2026-07-05.

## Riesgos de seguridad aceptados

- **Barrido FASE 0: limpio.** No se encontraron secretos vivos en el árbol versionado ni en
  el historial reciente. Las únicas coincidencias fueron la palabra `service_role` en
  comentarios de código y docs (el concepto de Supabase, no un valor) — falsos positivos.

- **`~/.claude/memory/tokens.md` en texto plano** (riesgo a nivel usuario, no del repo) —
  todos los secretos en un archivo del perfil. Patrón deliberado de JC. Riesgo aceptado.
  **Revisión trimestral: 2026-10-01.**
