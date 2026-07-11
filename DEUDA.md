# DEUDA — quiniela-mundial-2026

> Riesgos aceptados y deuda técnica con dueño y fecha de revisión.
> Origen de este archivo: Aegis FASE 0 (higiene de emergencia), 2026-07-05.

## Riesgos de seguridad aceptados

- **Barrido FASE 0: limpio.** No se encontraron secretos vivos en el árbol versionado ni en
  el historial reciente. Las únicas coincidencias fueron la palabra `service_role` en
  comentarios de código y docs (el concepto de Supabase, no un valor) — falsos positivos.

- ~~**`~/.claude/memory/tokens.md` en texto plano**~~ (riesgo a nivel usuario, no del repo) —
  **RESUELTO 2026-07-11 (Aegis FASE 1, Bloque C).** El archivo se borró tras migrar los
  secretos a Doppler y verificar por huella que los activos estaban espejados. El plaintext
  local dejó de existir; fuente de verdad = Doppler + Railway.
