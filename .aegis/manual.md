# Manual de operación de Aegis — quiniela-mundial-2026
> `aegis_version: 1.1` · Copia versionada de las Partes 2–3 de `USO_DIARIO.md` de master-framework.
> **Toda IA que trabaje en este proyecto debe leer este manual completo — es corto a propósito.** El CLAUDE.md del proyecto te manda leerlo.
> NO editar aquí: la fuente es `docs/aegis/USO_DIARIO.md` en master-framework; esta copia se refresca con el actualizador de Aegis.

---

# PARTE 2 — El operador (la IA): cómo funciona Aegis por dentro

Si eres el modelo trabajando en este proyecto Aegis, esto es lo que estás operando. El diseño
completo vive en `master-framework/docs/aegis/01_DISENO.md`; esto es la versión operativa.

## El principio que gobierna todo

**Separar el hacer del verificar; la verificación es mecánica donde más importa.** Tú escribes,
pero no certificas tu propio trabajo: los scripts verifican lo verificable, un par fresco verifica
lo que requiere juicio, y a JC solo le sube lo que requiere SU criterio (producto, UX,
aprobar/rechazar) — en español y sin tecnicismos, porque su única ventana al proyecto es lo que
tú le subes al chat.

## El mapa de piezas

| Pieza | Dónde vive | Qué hace |
|---|---|---|
| **Candados locales** (C1 secretos/gitleaks, C2 rama prod, C3 sello, C4 build, C7 watchdog) | `.aegis/hooks/` del repo, activos vía `core.hooksPath` | Git hooks que bloquean solos: tu feedback rápido. Gobiernan a TODO agente que comitee, tú incluido. |
| **Candados de servidor** | GitHub Actions + branch protection (workflow versionado en el repo) | La ley: re-corren gitleaks/lint/build en cada PR; prod solo acepta merges con checks verdes. Saltarte un candado local solo pospone el bloqueo al CI. |
| **Bóveda y runtime** | Doppler (secretos) + Sentry (errores en QA/prod) | Las llaves se inyectan por ambiente, no viven en archivos; los errores de producción avisan solos. |
| **C5 arranque / C6 guardia de agentes** | `.claude/settings.json` (hooks del harness) | C5 te inyecta rama+Tablero+deuda al arrancar y re-arma los candados. C6 frena agentes worktree sin confirmación. |
| **El Verificador** | Skill `aegis-verificar` | Subagente de contexto fresco: checklist de 5 puntos contra fuentes vivas → sello commiteado `.aegis/verified/<sha>`. Sin sello no hay prod (C3 local + check obligatorio en CI). Escala por severidad: críticos TODOS (≥3 = paran features); medios, los 2 mayores — el resto toma la opción segura + DEUDA. |
| **El Tablero** | `ESTADO / BACKLOG / LECCIONES / DECISIONES / DEUDA / EVIDENCIA` (.md, topados) | Tu memoria de trabajo. Se lee ENTERO al arrancar. Los topes los fuerza `cierre.py`, no tu buena voluntad. |
| **El Archivo** | `bitacora/` | Historia completa. Jamás se carga por defecto; se consulta con grep. Nada se borra: se mueve aquí. |
| **Config** | `.aegis/config.json` | Ramas, `check_command`, topes, `perfil_seguridad`, `aegis_version`. Las perillas ajustables viven aquí. |
| **Fuente canónica** | repo `master-framework`, carpeta `aegis/` + `docs/aegis/` | El framework versionado: diseño, plan, scripts plantilla, `VERSIONES.md`. Los proyectos llevan copias instaladas. |

## El flujo de una sesión (tu coreografía)

1. **Arranque**: C5 te inyectó rama, ESTADO, deuda y bypasses. Confirma que estás en staging. No
   re-leas el Archivo ni el diseño completo: el Tablero ES tu contexto.
2. **Trabajo**: JC pide en su idioma → propones → aprueba → implementas en staging. Los candados
   vigilan tus commits; si te bloquean, **arregla la causa, no el candado**.
3. **Pedido nuevo de JC**: clasifícalo en voz alta (proyecto / perilla / estructural —
   `04_EVOLUCION.md`) ANTES de actuar.
4. **Camino a prod**: nunca por tu cuenta. Verificador → sello → merge deliberado → push (C3 lo
   exige aunque lo olvides).
5. **Cierre** (JC dice "cerramos" o equivalente): redactas lo humano, `cierre.py` hace cumplir lo
   mecánico, emites el **Parte** (formato fijo del diseño §6).

## Situación → acción (la tabla que te salva)

| Si pasa esto | Haces esto |
|---|---|
| Un candado te bloquea | Explicas a JC qué atrapó y por qué, arreglas la causa. **Jamás lo puenteas ni lo desactivas.** |
| Necesitas saltarte un gate de verdad | PROPONES `/bypass` a JC con la razón. Solo él lo ordena. Sin su confirmación en ESTE chat, no existe. |
| JC pide algo que huele a cambiar Aegis | Paso 0 de `04_EVOLUCION.md`: clasificar en voz alta. Clase 3 JAMÁS se implementa en la sesión donde nació. |
| Encuentras un error tuyo, una confusión, o el sistema atrapó algo | Una línea etiquetada en `EVIDENCIA.md` (`[ERROR-IA] [CONFUSION] [GATE-ATRAPO] [BYPASS] [OPORTUNIDAD] [RADAR] [EVOLUCION]`). Sin novela. |
| Algo externo (schema, API, doc del harness) contradice un doc | La fuente viva manda. Corriges el doc o lo archivas. Los docs-espejo están prohibidos en el Tablero. |
| La sesión termina sin "cerramos" explícito pero JC se despide | El cierre corre igual (sus palabras-gatillo de siempre). Sesión sin cierre = memoria rota. |
| No sabes si algo es seguro / correcto | No certificas tú: es trabajo del Verificador o pregunta a JC con opciones. "Parece que está bien" no es un veredicto. |

## Tus reglas de oro (las 5 que no se negocian)

1. El diff manda, no tu memoria.
2. Nunca certificas tu propio trabajo.
3. A JC solo le subes lo que él puede accionar, en su idioma.
4. Verificación sobre apariencia: respuesta real, no suposición.
5. Ley anti-bloat: no añades gates, reglas ni archivos al framework fuera de `04_EVOLUCION.md`.

---

# PARTE 3 — Protocolo de visibilidad: Anuncio → Avance → Cierre

JC dirige sin leer código: su control ES la visibilidad. Toda ejecución de fase — y todo trabajo
de proyecto que vaya a tomar más de una interacción — sigue este ritmo:

## 1. Anuncio (antes de tocar NADA — esperas el "adelante" de JC)

≤15 líneas, en el idioma de JC:

```
ANUNCIO — [trabajo]
— Qué voy a hacer y para qué: …
— Qué voy a tocar: [archivos/sistemas, en términos que JC entienda]
— Qué NO voy a tocar: …
— Cómo lo verificarás TÚ al final: [la prueba en chat]
— Riesgos y reversa: [qué podría salir mal y cómo se deshace]
```

Sin "adelante" explícito de JC, no hay ejecución. Si JC pide cambios al Anuncio, se re-anuncia
corregido.

## 2. Avance (durante)

- Una línea al cruzar cada hito del Anuncio ("✔ candados instalados; sigo con el CI").
- **Si el plan cambia a medio camino, se anuncia el cambio** — nunca se improvisa en silencio.
  Desviarse sin avisar es la versión de proceso del "éxito falso".
- Si algo falla: se reporta con honestidad (qué, por qué, qué sigue), no se maquilla.

## 3. Cierre (al terminar)

- Se ejecuta la **Verificación de JC** y se espera su OK explícito.
- Lo aprendido que merezca memoria → `EVIDENCIA.md` / `LECCIONES.md` según toque.
- `cierre.py` hace cumplir los topes del Tablero y archiva el excedente en `bitacora/`.

Este protocolo aplica igual a fases de construcción y a operación diaria con trabajo grande. Para
microtareas (un fix de una línea), el sentido común manda: no se burocratiza lo trivial — pero
ante la duda, se anuncia.
