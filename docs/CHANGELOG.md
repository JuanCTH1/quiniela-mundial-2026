# Changelog — Quiniela Overrated 2026

## [Pre-Real] — 2026-06-21

### Features
- **Borrar pronósticos anteriores a partido X** (`/admin`): dropdown con todos los partidos, seleccionas el primer partido que sí cuenta, botón con confirmación borra todo lo anterior. Permite definir el "inicio oficial" del torneo sin limpiar datos futuros.
- **Ojito toggle en campos de contraseña nueva** (`/perfil`): un botón de ojo muestra/oculta ambos campos de nueva contraseña simultáneamente.
- **Cambiar contraseña desde perfil**: sección dedicada en `/perfil` con validación de mínimo 6 caracteres y confirmación.
- **Mensaje claro en link de invitación expirado**: detecta el hash `#error_code=otp_expired` en la URL y muestra mensaje amigable en el login.

### Fixes
- **Banderas en Windows**: reemplazadas las banderas emoji Unicode (no soportadas en Windows) con imágenes SVG de Twemoji CDN. Componente `TeamFlag` centraliza la lógica.
- **Predicciones fantasma de usuarios QA**: filtro `profileMap.has(p.user_id)` en `partidos/page.tsx` y `partido/[id]/page.tsx` para excluir usuarios de prueba.
- **Invite link usando localhost**: `redirectTo` ahora usa `NEXT_PUBLIC_APP_URL` si está seteada (necesaria en Railway prod como build-time env var).
- **JSX inválido en ProfileForm**: dos `<form>` hermanos envueltos en `<div>` para pasar validación de Turbopack.
- **Status label del partido**: subido de 10px a 14px.
- **Filtro `is_test` en admin y ranking**: queries en `/admin` y `/ranking` excluyen usuarios de prueba en `NEXT_PUBLIC_APP_ENV=production`.

### Infraestructura
- **pg_cron prod**: añadido Job 3 `update-matches-prod` apuntando a la URL de producción (los jobs anteriores solo apuntaban a QA).
- **Ernesto Inzunza**: password seteado directamente via SQL (`crypt()`) tras confirmar que escáner de email de Outlook consume OTPs de un solo uso.
- **Gustavo / Jesús**: mismo patrón SQL. Jesús requirió además insertar en `auth.identities` y limpiar campos de token NULL (`confirmation_token`, `recovery_token`, etc.) que GoTrue no puede manejar como NULL.

### Docs
- `docs/Crear_Usuario_Prod.md`: protocolo completo de 3 pasos para crear usuarios manualmente (auth.users + auth.identities + limpiar NULLs). Incluye SQL exacto y mensaje de WhatsApp para compartir credenciales.

---

## [Beta 1.0] — pre 2026-06-21

Ver commits anteriores en git log.
