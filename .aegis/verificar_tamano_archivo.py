#!/usr/bin/env python3
"""Aegis — trinquete anti-monolito (tamaño de archivo).

Fuente canónica: master-framework/aegis/verificar_tamano_archivo.py
Se copia a .aegis/ al instalar (junto con los hooks). Se invoca desde
check_command (C4) — Ruff/ESLint miden COMPLEJIDAD dentro de una función;
ninguno de los dos trae de fábrica "este archivo completo es demasiado
grande", así que ese chequeo vive aquí, en ~60 líneas simples.

Solo CORTA: bloquea el build y dice qué archivo se pasó y por cuánto. No
decide cómo partirlo — eso es trabajo del humano o del agente, disparado
por el aviso, nunca automático.

Uso:  python verificar_tamano_archivo.py   (corre en la raíz del repo)
Config leída de .aegis/config.json -> "limite_archivo" (con defaults si falta).
"""
import json
import os
import subprocess
import sys

for _s in (sys.stdout, sys.stderr):  # Windows: consola cp1252 revienta con UTF-8
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

DEFAULTS = {
    "max_lineas": 500,
    "extensiones": [".py", ".js", ".ts", ".jsx", ".tsx"],
    "excluir": [],  # prefijos de ruta relativos al repo, ej. "migrations/"
}


def cargar_config():
    cfg_path = os.path.join(".aegis", "config.json")
    if not os.path.exists(cfg_path):
        return DEFAULTS
    with open(cfg_path, encoding="utf-8") as f:
        cfg = json.load(f).get("limite_archivo", {})
    return {**DEFAULTS, **cfg}


def archivos_versionados():
    """git ls-files: respeta .gitignore solo, sin walkear .venv/node_modules a mano."""
    r = subprocess.run(["git", "ls-files"], capture_output=True, text=True,
                        encoding="utf-8", errors="replace")
    if r.returncode != 0:
        print("✗ AEGIS: no se pudo listar archivos versionados (git ls-files falló).",
              file=sys.stderr)
        sys.exit(1)
    return r.stdout.splitlines()


def main():
    cfg = cargar_config()
    max_lineas = cfg["max_lineas"]
    exts = tuple(cfg["extensiones"])
    excluir = tuple(cfg["excluir"])

    violaciones = []
    for ruta in archivos_versionados():
        if not ruta.endswith(exts):
            continue
        if any(ruta.startswith(p) for p in excluir):
            continue
        try:
            with open(ruta, encoding="utf-8", errors="replace") as f:
                n = sum(1 for _ in f)
        except OSError:
            continue
        if n > max_lineas:
            violaciones.append((ruta, n))

    if violaciones:
        print("✗ AEGIS: trinquete de tamaño — archivo(s) por encima del límite "
              f"({max_lineas} líneas):", file=sys.stderr)
        for ruta, n in sorted(violaciones, key=lambda x: -x[1]):
            print(f"    {ruta}: {n} líneas", file=sys.stderr)
        print("  Esto NO se arregla solo: hay que partir el archivo (routers, "
              "módulos, componentes). Si es un caso legítimo, ajusta "
              "'limite_archivo' en .aegis/config.json con la razón.",
              file=sys.stderr)
        sys.exit(1)

    print(f"✔ AEGIS — trinquete de tamaño: todo por debajo de {max_lineas} líneas.")


if __name__ == "__main__":
    main()
