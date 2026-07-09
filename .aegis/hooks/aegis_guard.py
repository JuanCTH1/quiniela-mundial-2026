#!/usr/bin/env python3
"""Aegis — guardia de candados locales (C1, C2, C4) + bypass provisional.

Fuente canónica: master-framework/aegis/hooks/aegis_guard.py
Se instala en cada repo bajo .aegis/hooks/ y se invoca desde los shims
pre-commit / pre-push (git core.hooksPath). No editar la copia del repo:
se sobrescribe al reinstalar/actualizar.

Uso (lo llaman los shims, no una persona):
    aegis_guard.py pre-commit
    aegis_guard.py pre-push  <remote_name> <remote_url>   (refs por stdin)

Candados:
    C1  secretos    -> gitleaks (motor de terceros; cero regex propia)
    C2  rama prod   -> prohíbe commit directo a prod salvo merge
    C4  build gate  -> check_command en pre-push a staging/prod
Bypass provisional (hasta FASE 5): archivo .aegis/BYPASS de un solo uso.
"""
import json
import os
import shutil
import subprocess
import sys

for _s in (sys.stdout, sys.stderr):  # Windows: consola cp1252 revienta con UTF-8
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ---------------------------------------------------------------- utilidades

def _run(cmd, **kw):
    """Ejecuta un comando y devuelve CompletedProcess (texto, sin lanzar)."""
    return subprocess.run(cmd, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", **kw)


def repo_root():
    r = _run(["git", "rev-parse", "--show-toplevel"])
    if r.returncode != 0:
        die("no estoy dentro de un repo git (git rev-parse falló).")
    return r.stdout.strip()


def load_config(root):
    path = os.path.join(root, ".aegis", "config.json")
    if not os.path.exists(path):
        die(f"falta .aegis/config.json en {root}. ¿Instalaste los candados? "
            "(aegis/instalar_candados.py)")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def die(msg, code=1):
    """Bloquea con explicación en el idioma de JC y sale con código != 0."""
    print("\n" + "═" * 64, file=sys.stderr)
    print("  AEGIS BLOQUEÓ ESTA OPERACIÓN", file=sys.stderr)
    print("═" * 64, file=sys.stderr)
    print(f"  {msg}", file=sys.stderr)
    print("═" * 64 + "\n", file=sys.stderr)
    sys.exit(code)


def ok(msg):
    print(f"  ✔ AEGIS: {msg}")


def current_branch():
    r = _run(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    return r.stdout.strip()


def log_evidencia(root, tag, texto):
    """Una línea etiquetada en EVIDENCIA.md (si el Tablero existe). Sin novela."""
    ev = os.path.join(root, "EVIDENCIA.md")
    try:
        from datetime import date
        linea = f"- {date.today().isoformat()} {tag} {texto}\n"
        with open(ev, "a", encoding="utf-8") as f:
            f.write(linea)
    except OSError:
        pass  # el Tablero puede no existir aún (llega en FASE 3); no es fatal


# ------------------------------------------------------------------- bypass

def check_bypass(root):
    """Bypass provisional de un solo uso (hasta que FASE 5 traiga /bypass).

    Si existe .aegis/BYPASS: lee la razón (1ª línea), lo REGISTRA, lo BORRA
    (un solo uso), y deja pasar. Provisional y a mano: documentado como tal.
    """
    path = os.path.join(root, ".aegis", "BYPASS")
    if not os.path.exists(path):
        return False
    try:
        with open(path, encoding="utf-8") as f:
            razon = (f.readline().strip() or "(sin razón)")
    except OSError:
        razon = "(no se pudo leer la razón)"
    os.remove(path)  # un solo uso: se consume
    log_evidencia(root, "[BYPASS]", f"candado saltado a mano — razón: {razon}")
    print(f"  ⚠ AEGIS: BYPASS de un solo uso consumido. Razón: {razon}",
          file=sys.stderr)
    print("  ⚠ Queda rastro en EVIDENCIA.md. El servidor (CI) NO se salta.",
          file=sys.stderr)
    return True


# ------------------------------------------------------------ C1 · secretos

def gitleaks_bin():
    b = shutil.which("gitleaks")
    if not b:
        die("gitleaks no está instalado o no está en el PATH.\n"
            "  Instálalo (Windows): winget install --id Gitleaks.Gitleaks\n"
            "  Un candado de secretos que 'pasa en silencio' no es un candado.")
    return b


def c1_secretos_staged(root):
    """C1 en pre-commit: escanea SOLO lo staged. Bloquea si hay secreto."""
    bin_ = gitleaks_bin()
    # 'gitleaks git' toma la ruta POSICIONAL (no -s, que es de los subcomandos viejos).
    r = _run([bin_, "git", "--staged", "--redact", "--no-banner",
              "--no-color", root])
    if r.returncode == 0:
        ok("C1 — sin secretos en lo que vas a commitear.")
        return
    detalle = (r.stdout or r.stderr or "").strip()
    log_evidencia(root, "[GATE-ATRAPO]", "C1 bloqueó un secreto en commit.")
    die("C1 — detecté un posible secreto en los cambios que ibas a commitear.\n"
        "  gitleaks marcó (valor censurado):\n"
        + "\n".join("    " + l for l in detalle.splitlines()[-12:]) +
        "\n  Saca el secreto del código y ponlo en Doppler. Si es falso "
        "positivo, añádelo con razón a .gitleaks.toml.")


def c1_secretos_rango(root, rango):
    """C1 en pre-push: escanea el rango de commits que se van a subir."""
    bin_ = gitleaks_bin()
    cmd = [bin_, "git", "--redact", "--no-banner", "--no-color", root]
    if rango:
        cmd += [f"--log-opts={rango}"]
    r = _run(cmd)
    if r.returncode == 0:
        ok("C1 — sin secretos en los commits que vas a subir.")
        return
    detalle = (r.stdout or r.stderr or "").strip()
    log_evidencia(root, "[GATE-ATRAPO]", "C1 bloqueó un secreto en push.")
    die("C1 — hay un secreto en el historial que ibas a subir.\n"
        + "\n".join("    " + l for l in detalle.splitlines()[-12:]) +
        "\n  El CI lo frenaría igual: arréglalo en origen (reescribe el commit "
        "o saca el secreto y ponlo en Doppler).")


# ---------------------------------------------------------- C2 · rama prod

def c2_guardia_rama(root, cfg):
    """C2 en pre-commit: prohíbe commit directo a prod salvo que sea un merge."""
    prod = cfg.get("ramas", {}).get("prod")
    if not prod:
        return
    if current_branch() != prod:
        return
    # Un merge en curso deja .git/MERGE_HEAD: esos SÍ se permiten.
    git_dir = _run(["git", "rev-parse", "--git-dir"]).stdout.strip()
    if os.path.exists(os.path.join(root, git_dir, "MERGE_HEAD")):
        ok(f"C2 — merge hacia '{prod}' permitido.")
        return
    log_evidencia(root, "[GATE-ATRAPO]", f"C2 bloqueó commit directo a '{prod}'.")
    die(f"C2 — estás commiteando DIRECTO a la rama de producción ('{prod}').\n"
        "  Prod solo se toca por merge/PR desde staging. Cambia de rama:\n"
        f"    git switch {cfg.get('ramas', {}).get('staging', 'dev')}")


# ------------------------------------------------------------- C4 · build

def c4_build_gate(root, cfg, ramas_destino):
    """C4 en pre-push: corre check_command si el push va a staging o prod.

    Ramas de feature: exentas del build (lint/secretos sí corren en todas).
    """
    prod = cfg.get("ramas", {}).get("prod")
    staging = cfg.get("ramas", {}).get("staging")
    criticas = {b for b in (prod, staging) if b}
    if not (ramas_destino & criticas):
        ok("C4 — rama de feature: build exento (secretos sí se revisaron).")
        return
    check = cfg.get("check_command", {})
    comando = check.get("comando")
    if not comando:
        ok("C4 — sin check_command configurado; nada que correr.")
        return
    timeout = int(check.get("timeout_seg", 300))
    destino = ", ".join(sorted(ramas_destino & criticas))
    print(f"  … AEGIS C4: build antes de subir a '{destino}' — "
          f"'{comando}' (máx {timeout}s)…")
    try:
        r = subprocess.run(comando, shell=True, cwd=root, timeout=timeout)
    except subprocess.TimeoutExpired:
        log_evidencia(root, "[GATE-ATRAPO]", f"C4 timeout ({timeout}s) en push.")
        die(f"C4 — el build superó el límite de {timeout}s y se cortó.\n"
            "  Sube el timeout en .aegis/config.json si es legítimo, o arregla "
            "lo que lo cuelga.")
    if r.returncode != 0:
        log_evidencia(root, "[GATE-ATRAPO]", "C4 bloqueó push con build roto.")
        die(f"C4 — el build/checks fallaron ('{comando}', código "
            f"{r.returncode}).\n  No se sube nada roto a '{destino}'. Arréglalo "
            "y reintenta el push.")
    ok(f"C4 — build en verde; push a '{destino}' permitido.")


# -------------------------------------------------------- lectura de refs

ZERO = "0" * 40


def parse_prepush_stdin():
    """Lee las líneas que git pasa a pre-push por stdin.

    Cada línea: <local_ref> <local_sha> <remote_ref> <remote_sha>
    Devuelve (ramas_destino:set, rangos:list) para C4 y C1.
    """
    ramas, rangos = set(), []
    for linea in sys.stdin:
        partes = linea.split()
        if len(partes) != 4:
            continue
        _lref, lsha, rref, rsha = partes
        if lsha == ZERO:
            continue  # borrado de rama: nada que revisar
        if rref.startswith("refs/heads/"):
            ramas.add(rref[len("refs/heads/"):])
        rangos.append(lsha if rsha == ZERO else f"{rsha}..{lsha}")
    return ramas, rangos


# ------------------------------------------------------------------- main

def main():
    modo = sys.argv[1] if len(sys.argv) > 1 else ""
    root = repo_root()
    cfg = load_config(root)

    if check_bypass(root):
        return  # bypass de un solo uso consumido; se deja pasar esta vez

    if modo == "pre-commit":
        c2_guardia_rama(root, cfg)
        c1_secretos_staged(root)
    elif modo == "pre-push":
        ramas, rangos = parse_prepush_stdin()
        for rango in rangos:
            c1_secretos_rango(root, rango)
        c4_build_gate(root, cfg, ramas)
    else:
        die(f"modo desconocido: '{modo}' (esperaba pre-commit | pre-push).")


if __name__ == "__main__":
    main()
