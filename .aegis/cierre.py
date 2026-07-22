#!/usr/bin/env python3
"""Aegis — parte mecánica del cierre de sesión (FASE 3).

El modelo redacta lo humano; ESTE script hace cumplir lo mecánico y FALLA
RUIDOSAMENTE si algo no cuadra. El modelo NO puede dar el cierre por bueno si
este script salió con código ≠0.

Qué hace:
  1. "El diff manda": git log + diff --stat de la sesión (contra la rama prod).
  2. Topes del Tablero: cuenta líneas por archivo; el excedente (secciones más
     viejas) se MUEVE a bitacora/archivo-<archivo>-<fecha>.md. Nunca borra.
  3. Escribe bitacora/sesion-NNN.md desde el borrador que pasa el modelo.
  4. Escaneo de vigilancia (no bloqueante) de archivos peligrosos no versionados.
  5. Exige evidencia: si hubo bloqueo/bypass en la sesión, debe existir la línea
     [GATE-ATRAPO]/[BYPASS] en EVIDENCIA.md — si falta, falla.
  6. Validación diff-vs-Tablero (el candado de la memoria honesta): si el diff
     muestra endpoint nuevo / cambio de schema / señales de auth-secretos y
     ESTADO/DECISIONES/DEUDA no lo mencionan → falla ruidosamente.
  7. Arrastre de decisiones: una decisión pendiente ≥2 sesiones sin respuesta de
     JC → línea [RADAR] en EVIDENCIA.
  8. Parte de sesión persistido (v1.3): en la 1ª corrida escribe el ESQUELETO de
     las 6 cabeceras canónicas en bitacora/parte-NNN.md (la línea Seguridad la
     llena el script, no el modelo) y falla pidiendo rellenarlo; en la 2ª corrida
     valida por STRING EXACTO que estén las 6 cabeceras y no quede ningún
     [rellenar]. Hace auditable el criterio "Parte sostenido" de FASE_6.md.
  (Drift de despliegue: inerte hasta que FASE 4 provea el sello del Verificador.)

Uso:
  python cierre.py [--base <ref>] [--n <NNN>] [--sesion-draft <archivo>]
                   [--hubo-bloqueo] [--hubo-bypass]
  Corre en la raíz del repo. Sale ≠0 si algo falla.
"""
import argparse
import datetime
import json
import os
import re
import subprocess
import sys

for _s in (sys.stdout, sys.stderr):  # Windows: consola cp1252 revienta con UTF-8
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

HOY = datetime.date.today().isoformat()
TABLERO = ["ESTADO", "BACKLOG", "LECCIONES", "DECISIONES", "DEUDA", "EVIDENCIA"]
EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"  # git empty tree
DEFAULT_VIGILADOS = [".claude/settings.local.json",
                     os.path.expanduser("~/.claude/memory/tokens.md")]

TOPES_DEFAULT = {"ESTADO.md": 60, "BACKLOG.md": 100, "LECCIONES.md": 120,
                 "DECISIONES.md": 150, "DEUDA.md": 60, "EVIDENCIA.md": 200}

fallas = []  # se acumulan; el script sale ≠0 si hay alguna


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", **kw)


def cargar_config():
    path = os.path.join(".aegis", "config.json")
    if not os.path.exists(path):
        print("  · sin .aegis/config.json — usando defaults de topes.")
        return {"topes_tablero": TOPES_DEFAULT, "ramas": {"prod": "main"},
                "archivos_vigilados": DEFAULT_VIGILADOS}
    with open(path, encoding="utf-8") as f:
        cfg = json.load(f)
    cfg.setdefault("topes_tablero", TOPES_DEFAULT)
    cfg.setdefault("ramas", {"prod": "main"})
    cfg.setdefault("archivos_vigilados", DEFAULT_VIGILADOS)
    return cfg


def resolver_base(ref_arg, prod):
    """Devuelve la ref contra la cual medir el diff de la sesión."""
    if ref_arg:
        return ref_arg
    for cand in (f"origin/{prod}", prod):
        if run(["git", "rev-parse", "--verify", "--quiet", cand]).returncode == 0:
            return cand
    return EMPTY_TREE  # repo sin prod aún: la sesión es "todo"


# ---------- 1) el diff manda ----------
# La validación de memoria honesta mira CÓDIGO de producto, no la plumbing de
# Aegis ni los propios docs del Tablero (si no, el manual/cierre.py —que hablan
# de auth/tokens/endpoints— se autodelatan en cada cierre).
EXCL_PREFIJOS = (".aegis/", ".github/", ".claude/")
EXCL_EXACTOS = {".gitleaks.toml", ".gitignore"}


def _es_codigo(ruta):
    return (ruta and not ruta.startswith(EXCL_PREFIJOS)
            and ruta not in EXCL_EXACTOS and not ruta.endswith(".md"))


def diff_de_sesion(base):
    log = run(["git", "log", f"{base}..HEAD", "--oneline"]).stdout.strip()
    stat = run(["git", "diff", f"{base}..HEAD", "--stat"]).stdout.strip()
    nombres = run(["git", "diff", f"{base}..HEAD", "--name-only"]).stdout.splitlines()
    fuentes = [n for n in nombres if _es_codigo(n)]
    added_lines = ""
    if fuentes:
        added = run(["git", "diff", f"{base}..HEAD", "--unified=0", "--no-color",
                     "--"] + fuentes).stdout
        # solo líneas AÑADIDAS (empiezan con '+' pero no '+++')
        added_lines = "\n".join(l[1:] for l in added.splitlines()
                                if l.startswith("+") and not l.startswith("+++"))
    return log, stat, added_lines


# ---------- 2) topes + archivado ----------
def partir_secciones(texto):
    """Separa (encabezado, [secciones]). Sección = bloque que empieza con '## '."""
    lineas = texto.splitlines(keepends=True)
    idx = next((i for i, l in enumerate(lineas) if l.startswith("## ")), len(lineas))
    encabezado = lineas[:idx]
    secciones, actual = [], []
    for l in lineas[idx:]:
        if l.startswith("## ") and actual:
            secciones.append(actual)
            actual = []
        actual.append(l)
    if actual:
        secciones.append(actual)
    return encabezado, secciones


FECHA_ISO = re.compile(r"\b(20\d\d-\d\d-\d\d)\b")


def partir_items(lineas):
    """Para listas planas: (preámbulo, [ítems]). Ítem = desde una línea que abre
    con '- '/'* ' en COLUMNA 0 hasta el siguiente ítem; toda continuación (indentada
    o sin viñeta) viaja con su ítem (eval en frío 2026-07-22, nota 4)."""
    def _abre(l):
        return l.startswith("- ") or l.startswith("* ")
    idx = next((i for i, l in enumerate(lineas) if _abre(l)), len(lineas))
    preambulo = lineas[:idx]
    items, actual = [], []
    for l in lineas[idx:]:
        if _abre(l) and actual:
            items.append(actual)
            actual = []
        actual.append(l)
    if actual:
        items.append(actual)
    return preambulo, items


def _fecha_encabezado(bloque):
    """Fecha ISO de la PRIMERA línea con texto del bloque (el encabezado del ítem/
    sección) — NO del cuerpo, que puede citar fechas de 'gatillo' (eval en frío
    2026-07-22, cambio 2). None si no hay."""
    for linea in bloque:
        if linea.strip():
            m = FECHA_ISO.search(linea)
            return m.group(1) if m else None
    return None


def _normalizar_spec(spec):
    """topes_tablero acepta un entero (forma vieja → modo se infiere del nombre) o
    un objeto {tope, archivado} (v1.4). Devuelve (tope, modo|None)."""
    if isinstance(spec, dict):
        return spec.get("tope"), spec.get("archivado")
    return spec, None


def aplicar_topes(topes):
    for archivo, spec in topes.items():
        if archivo.startswith("_"):
            continue
        tope, modo = _normalizar_spec(spec)
        if tope is None or not os.path.exists(archivo):
            continue
        with open(archivo, encoding="utf-8") as f:
            texto = f.read()
        n = _contar(texto)
        if n <= tope:
            continue
        if modo is None:  # forma vieja (entero): heurística por nombre (legacy)
            modo = ("prioridad"
                    if os.path.basename(archivo).upper().startswith("BACKLOG")
                    else "cronologico")
        if modo == "manual":
            fallas.append(f"{archivo} excede el tope ({n}>{tope}) y su archivado es "
                          "'manual': ninguna sección es archivable a ciegas — podá a "
                          "mano las entradas viejas antes de cerrar.")
        elif modo == "cronologico":
            _archivar_cronologico(archivo, texto, tope, n)
        elif modo == "prioridad":
            _archivar_prioridad(archivo, texto, tope, n)
        else:
            fallas.append(f"{archivo}: modo de archivado '{modo}' desconocido "
                          "(usá cronologico/prioridad/manual, o un entero para el "
                          "modo legacy por nombre).")


def _archivar_cronologico(archivo, texto, tope, n):
    """Lo viejo arriba, lo nuevo al final → archiva desde ARRIBA. Opera por sección
    '## ' si las hay; si es lista plana, por ítem '- '. Antes de tocar nada, gate de
    sanidad de dirección (detector del caso frecuente, NO salvaguarda total: solo mira
    los extremos y necesita fecha en ambos)."""
    encabezado, secciones = partir_secciones(texto)
    if secciones:
        preambulo, elementos, unidad = encabezado, secciones, "sección"
    else:
        preambulo, elementos = partir_items(texto.splitlines(keepends=True))
        unidad = "ítem"
    if len(elementos) <= 1:
        fallas.append(f"{archivo} excede el tope ({n}>{tope}) pero no tiene "
                      "secciones '## ' ni ítems '- ' que archivar — podalo a mano.")
        return
    f_prim, f_ult = _fecha_encabezado(elementos[0]), _fecha_encabezado(elementos[-1])
    if f_prim and f_ult and f_prim > f_ult:
        fallas.append(
            f"{archivo}: convención cronológica ROTA — el elemento de arriba ({f_prim}) "
            f"es más nuevo que el de abajo ({f_ult}). cierre.py archiva desde arriba, "
            f"así que archivaría lo NUEVO. Volteá el archivo (lo viejo arriba, lo nuevo "
            f"al final) antes de cerrar. NO se archivó nada.")
        return
    movidas = []
    while len(elementos) > 1 and _contar(
            "".join(preambulo) + "".join("".join(e) for e in elementos)) > tope:
        movidas.append(elementos.pop(0))
    if movidas:
        _archivar(archivo, movidas)
        with open(archivo, "w", encoding="utf-8") as f:
            f.write("".join(preambulo) + "".join("".join(e) for e in elementos))
        print(f"  ✔ {archivo}: {len(movidas)} {unidad}(es) vieja(s) → bitacora/ "
              f"(ahora {_contar_archivo(archivo)}≤{tope} líneas)")


def _archivar_prioridad(archivo, texto, tope, n):
    """Lo importante arriba (## Alta…) → archiva desde el FINAL, POR ÍTEM: primero los
    ~~tachados~~ (resueltos) de las secciones de menor prioridad, luego ítems abiertos
    desde abajo. Las cabeceras '## ' se conservan siempre (no se pierde estructura)."""
    encabezado, secciones = partir_secciones(texto)
    if not secciones:
        fallas.append(f"{archivo} (prioridad) excede el tope ({n}>{tope}) pero no tiene "
                      "secciones '## ' — declaralo 'manual' o revisá su estructura.")
        return
    desc = []  # una entrada por sección, en orden original: {cab, items}
    for sec in secciones:
        j = next((k for k, l in enumerate(sec)
                  if l.startswith("- ") or l.startswith("* ")), len(sec))
        _, items = partir_items(sec[j:]) if j < len(sec) else ([], [])
        desc.append({"cab": sec[:j], "items": items})

    def total():
        partes = ["".join(encabezado)]
        for d in desc:
            partes.append("".join(d["cab"]))
            partes.extend("".join(it) for it in d["items"])
        return _contar("".join(partes))

    def _tachado(item):
        return any("~~" in l for l in item)

    movidas = []
    # Fase 1: tachados, de la sección de menor prioridad (más abajo) a la de mayor,
    # dentro de cada sección del último al primero.
    for d in reversed(desc):
        i = len(d["items"]) - 1
        while i >= 0 and total() > tope:
            if _tachado(d["items"][i]):
                movidas.append(d["items"].pop(i))
            i -= 1
    # Fase 2: ítems abiertos desde el final (última sección primero).
    for d in reversed(desc):
        while d["items"] and total() > tope:
            movidas.append(d["items"].pop())
        if total() <= tope:
            break
    if not movidas:
        fallas.append(f"{archivo} (prioridad) excede el tope ({n}>{tope}) y no tiene "
                      "ítems archivables — podá a mano.")
        return
    _archivar(archivo, movidas)
    partes = ["".join(encabezado)]
    for d in desc:
        partes.append("".join(d["cab"]))
        partes.extend("".join(it) for it in d["items"])
    with open(archivo, "w", encoding="utf-8") as f:
        f.write("".join(partes))
    print(f"  ✔ {archivo}: {len(movidas)} ítem(s) → bitacora/ "
          f"(ahora {_contar_archivo(archivo)}≤{tope} líneas)")
    if total() > tope:
        fallas.append(f"{archivo}: archivé todos los ítems archivables y AÚN excede el "
                      f"tope ({tope}) — quedan solo cabeceras '## '; podá a mano.")


def _contar(texto):
    return texto.count("\n") + (0 if texto.endswith("\n") or not texto else 1)


def _contar_archivo(path):
    with open(path, encoding="utf-8") as f:
        return _contar(f.read())


def _archivar(archivo, secciones):
    os.makedirs("bitacora", exist_ok=True)
    base = os.path.splitext(os.path.basename(archivo))[0]
    destino = os.path.join("bitacora", f"archivo-{base}-{HOY}.md")
    banner = f"\n<!-- archivado de {archivo} el {HOY} por cierre.py -->\n"
    with open(destino, "a", encoding="utf-8") as f:
        f.write(banner)
        for s in secciones:
            f.write("".join(s))


# ---------- 3) sesion-NNN.md ----------
def escribir_sesion(n, draft_path):
    if n is None or not draft_path:
        print("  · sin --n/--sesion-draft: no se escribe bitacora/sesion-NNN.md "
              "(pásalos para registrar la sesión).")
        return
    if not os.path.exists(draft_path):
        fallas.append(f"el borrador de sesión '{draft_path}' no existe.")
        return
    os.makedirs("bitacora", exist_ok=True)
    destino = os.path.join("bitacora", f"sesion-{int(n):03d}.md")
    with open(draft_path, encoding="utf-8") as f:
        contenido = f.read()
    with open(destino, "w", encoding="utf-8") as f:
        f.write(contenido)
    print(f"  ✔ bitacora/sesion-{int(n):03d}.md escrito.")


# ---------- 4) vigilancia ----------
def escaneo_vigilancia(vigilados):
    reporte = []
    for path in vigilados:
        if path.startswith("_"):
            continue
        if not os.path.exists(path):
            reporte.append(f"{path}: ausente (ok)")
            continue
        if not _which("gitleaks"):
            reporte.append(f"{path}: presente (gitleaks no disponible, sin escanear)")
            continue
        r = run(["gitleaks", "detect", "--source", path, "--no-git",
                 "--redact", "--exit-code", "1"])
        reporte.append(f"{path}: {'⚠ POSIBLE SECRETO' if r.returncode != 0 else 'limpio'}")
    return reporte


def _which(x):
    from shutil import which
    return which(x)


# ---------- 5) evidencia obligatoria ----------
def exigir_evidencia(hubo_bloqueo, hubo_bypass):
    if not (hubo_bloqueo or hubo_bypass):
        return
    ev = "EVIDENCIA.md"
    texto = ""
    if os.path.exists(ev):
        with open(ev, encoding="utf-8") as f:
            texto = f.read()
    if hubo_bloqueo and "[GATE-ATRAPO]" not in texto:
        fallas.append("hubo bloqueo de candado esta sesión pero EVIDENCIA.md no "
                      "tiene ninguna línea [GATE-ATRAPO]. Regístralo.")
    if hubo_bypass and "[BYPASS]" not in texto:
        fallas.append("hubo bypass esta sesión pero EVIDENCIA.md no tiene ninguna "
                      "línea [BYPASS]. Regístralo.")


# ---------- 6) validación diff-vs-Tablero ----------
PATRONES = {
    "endpoint/ruta nueva": (
        re.compile(r"@(app|router)\.(get|post|put|delete|patch)\(|"
                   r"\.route\(|app\.(get|post|put|delete|patch)\(|"
                   r"@(Get|Post|Put|Delete|Patch)Mapping", re.I),
        re.compile(r"endpoint|ruta|route|/api/|api ", re.I)),
    "cambio de schema": (
        re.compile(r"\b(CREATE|ALTER|DROP)\s+TABLE\b|\bADD\s+COLUMN\b|"
                   r"\bCREATE\s+INDEX\b", re.I),
        re.compile(r"schema|tabla|columna|migraci|base de datos|índice|indice", re.I)),
    "auth/permisos/secretos": (
        re.compile(r"\b(auth|login|password|permission|role|token|secret|jwt|"
                   r"rls|policy)\b", re.I),
        re.compile(r"auth|login|permis|rol|token|secreto|seguridad|jwt|rls|"
                   r"política|politica", re.I)),
}


def validar_diff_vs_tablero(added_lines):
    if not added_lines.strip():
        return
    fuentes = ""
    for f in ("ESTADO.md", "DECISIONES.md", "DEUDA.md", "BACKLOG.md"):
        if os.path.exists(f):
            with open(f, encoding="utf-8") as fh:
                fuentes += fh.read() + "\n"
    for nombre, (pat_diff, pat_tablero) in PATRONES.items():
        if pat_diff.search(added_lines) and not pat_tablero.search(fuentes):
            fallas.append(
                f"el diff muestra «{nombre}» pero ni ESTADO/DECISIONES/DEUDA/BACKLOG "
                f"lo mencionan. Actualiza el Tablero o explica la razón antes de cerrar.")


# ---------- 7) arrastre de decisiones ----------
def arrastre_decisiones():
    """Incrementa el contador de decisiones pendientes; ≥2 sesiones → [RADAR]."""
    path = os.path.join(".aegis", "decisiones_pendientes.json")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        pend = json.load(f)
    cambiado = False
    for d in pend:
        d["sesiones"] = d.get("sesiones", 0) + 1
        if d["sesiones"] >= 2 and not d.get("radar_escrito"):
            _linea_evidencia(f"[RADAR] decisión pendiente {d['sesiones']} sesiones "
                             f"sin respuesta de JC: {d['texto']}")
            d["radar_escrito"] = True
            cambiado = True
    if cambiado:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(pend, f, ensure_ascii=False, indent=2)


def _linea_evidencia(linea):
    ev = "EVIDENCIA.md"
    with open(ev, "a", encoding="utf-8") as f:
        f.write(f"- {HOY} {linea}\n")
    print(f"  ✔ EVIDENCIA.md += {linea}")


# ---------- 8) Parte de sesión persistido (v1.3) ----------
# Las 6 cabeceras canónicas del Parte (diseño §6). El match de validación es por
# STRING EXACTO, cero interpretación (bendición Fable 2026-07-21, condición b).
# Cambiar una cabecera aquí es cambiar el formato del Parte → es Clase 3.
PARTE_CABECERAS_MODELO = [   # las rellena el modelo
    "— Hecho:",
    "— Atrapado:",
    "— Tu decisión pendiente:",
    "— Deuda/bypasses abiertos:",
    "— Próxima sesión:",
]
PARTE_CAB_SEGURIDAD = "— Seguridad:"   # la llena el script, NO el modelo
RELLENAR = "[rellenar]"


def gestionar_parte(n, vig):
    """Persiste el Parte de sesión a bitacora/parte-NNN.md (Clase 3, v1.3).

    Dos fases en corridas sucesivas de cierre.py — mismo patrón fallar-y-reintentar
    que el resto del script (invariante #2: lo crítico se fuerza por mecanismo):
      - Si el archivo NO existe: escribe el esqueleto de las 6 cabeceras canónicas
        (el modelo NO las inventa → cero falsos negativos), con la línea Seguridad
        ya llena por el script; las otras 5 quedan como [rellenar]. Falla ruidoso.
      - Si existe: valida por string exacto que estén las 6 cabeceras y que ninguna
        siga en [rellenar]. Cero interpretación (condiciones a/b de la bendición).
    """
    if n is None:
        return  # sin --n no hay número de sesión (igual que escribir_sesion)
    os.makedirs("bitacora", exist_ok=True)
    destino = os.path.join("bitacora", f"parte-{int(n):03d}.md")
    seguridad = "; ".join(vig) if vig else "sin archivos vigilados"
    if not os.path.exists(destino):
        esqueleto = (
            f"# PARTE DE SESIÓN {int(n):03d} — {HOY}\n\n"
            f"— Hecho: {RELLENAR}\n"
            f"— Atrapado: {RELLENAR}\n"
            f"— Tu decisión pendiente: {RELLENAR}\n"
            f"— Deuda/bypasses abiertos: {RELLENAR}\n"
            f"{PARTE_CAB_SEGURIDAD} {seguridad}\n"
            f"— Próxima sesión: {RELLENAR}\n"
        )
        with open(destino, "w", encoding="utf-8") as f:
            f.write(esqueleto)
        fallas.append(
            f"escribí el esqueleto del Parte en {destino} (la línea Seguridad ya la "
            f"llené yo). Rellená las 5 secciones [rellenar] con el MISMO texto que le "
            f"emitís a JC en el chat y vuelve a correr cierre.py para validar.")
        return
    # el archivo existe → validar por string exacto
    with open(destino, encoding="utf-8") as f:
        parte = f.read()
    faltan = [c for c in (PARTE_CABECERAS_MODELO + [PARTE_CAB_SEGURIDAD])
              if c not in parte]
    if faltan:
        fallas.append(f"{destino} no tiene la(s) cabecera(s) exacta(s): "
                      f"{' | '.join(faltan)}. El Parte son 6 secciones fijas en su "
                      f"orden (diseño §6) — no se omite ni se renombra ninguna.")
    if RELLENAR in parte:
        fallas.append(f"{destino} todavía tiene sección(es) en {RELLENAR} sin "
                      f"rellenar. Complétalas antes de cerrar.")
    if not faltan and RELLENAR not in parte:
        print(f"  ✔ bitacora/parte-{int(n):03d}.md: Parte con las 6 secciones, validado.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base")
    ap.add_argument("--n")
    ap.add_argument("--sesion-draft")
    ap.add_argument("--hubo-bloqueo", action="store_true")
    ap.add_argument("--hubo-bypass", action="store_true")
    args = ap.parse_args()

    if run(["git", "rev-parse", "--is-inside-work-tree"]).returncode != 0:
        print("✗ cierre.py debe correr dentro de un repo git.", file=sys.stderr)
        sys.exit(2)

    cfg = cargar_config()
    prod = cfg["ramas"].get("prod", "main")
    rama = run(["git", "branch", "--show-current"]).stdout.strip()
    if rama == prod:
        print(f"  ⚠ estás en la rama prod '{prod}'. El cierre normal es en staging.")

    base = resolver_base(args.base, prod)
    log, stat, added = diff_de_sesion(base)

    print("→ Cierre Aegis — parte mecánica")
    print(f"  base de comparación: {base}")
    print("→ Topes del Tablero…")
    aplicar_topes(cfg["topes_tablero"])
    print("→ Registro de sesión…")
    escribir_sesion(args.n, args.sesion_draft)
    print("→ Validación diff-vs-Tablero (memoria honesta)…")
    validar_diff_vs_tablero(added)
    exigir_evidencia(args.hubo_bloqueo, args.hubo_bypass)
    arrastre_decisiones()
    print("→ Escaneo de vigilancia…")
    vig = escaneo_vigilancia(cfg["archivos_vigilados"])
    for r in vig:
        print(f"    {r}")

    print("\n===== DATOS PARA EL PARTE (el modelo redacta con esto) =====")
    print(f"Commits de la sesión:\n{log or '  (ninguno)'}")
    print(f"Archivos tocados:\n{stat or '  (ninguno)'}")
    print("Seguridad (archivos vigilados): " + "; ".join(vig))
    print("===========================================================\n")

    print("→ Parte de sesión (persistencia)…")
    gestionar_parte(args.n, vig)

    if fallas:
        print("✗ AEGIS cierre: NO se puede cerrar — corrige esto primero:",
              file=sys.stderr)
        for f in fallas:
            print(f"    • {f}", file=sys.stderr)
        sys.exit(1)
    print("✔ AEGIS cierre: parte mecánica OK. El modelo puede emitir el Parte.")


if __name__ == "__main__":
    main()
