@AGENTS.md

# Quiniela Overrated 2026

## Qué es esto
App web privada para 6 jugadores que predicen resultados del Mundial 2026. No es un producto comercial; el listón es "cero fallos durante el torneo".

## Stack
- **Framework:** Next.js 16 (App Router) + TypeScript
- **DB / Auth:** Supabase
- **Deploy:** Railway
- **Estilos:** Tailwind CSS v4 (CSS-first, sin tailwind.config.ts) — tokens en `src/app/globals.css`
- **Fuente deportiva:** football-data.org (primaria) / API-Football (respaldo)
- **Emails:** Resend

## Documentación del producto
Toda la propuesta, reglas y checklist de fases vive en `docs/`:
- `docs/Propuesta_Producto_Actualizada.md` — spec completo
- `docs/Checklist_Fases_Quiniela.md` — gates por fase (leer ANTES de arrancar cualquier fase)
- `docs/Reglamento_La_Quiniela_Mundial2026.md` — reglas del juego para compartir con el grupo

## Principios que NO se negocian
1. **Las predicciones son sagradas:** bloqueadas = intocables para todos, incluyendo el admin.
2. **Las reglas son configuración, no código:** puntos y corte de etapa viven en tabla editable.
3. **Modo prueba / modo real:** el paso a real es deliberado, registrado e irreversible desde la app.
4. **Cálculo en vivo:** los puntos se calculan al momento desde los resultados, no se guardan en tabla.
5. **No avanzar de fase sin cumplir el 100% del checklist** de la fase anterior.

## Pendientes abiertos (confirmar con el grupo antes de modo real)
- Resultado válido en eliminatorias: 90', 120' o penales (y si es igual para todas las rondas).
- Minutos de bloqueo antes del kickoff.

## Notas de implementación
- Tailwind v4: la configuración de tokens va en `@theme inline {}` dentro de `globals.css`, no en `tailwind.config.ts`.
- Supabase: RLS es la capa de seguridad de predicciones, NO confiar solo en validaciones de frontend.
- Todo en UTC en base de datos; conversión de zona horaria solo en presentación.
- El cron de resultados solo consulta partidos en vivo o por iniciar, nunca el calendario completo.
