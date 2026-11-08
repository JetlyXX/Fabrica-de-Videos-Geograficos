#!/usr/bin/env python3
"""Fábrica de Videos: instala la fábrica la primera vez y le pasa las órdenes.

  arranque.py comprobar     ¿está todo lo necesario en este ordenador?
  arranque.py instalar      instala o actualiza (la primera vez tarda unos minutos)
  arranque.py <orden>       cualquier orden de la fábrica (abrir, pedido, nuevo, render…)

Se instala en la carpeta FabricaDeVideos de tu carpeta personal. Otra carpeta: variable FABRICA_HOME.
"""
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

for _f in (sys.stdout, sys.stderr):
    try:
        _f.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE = Path(__file__).resolve().parent
MOTOR = BASE / "motor"
CASA = Path(os.environ.get("FABRICA_HOME") or Path.home() / "FabricaDeVideos")
WINDOWS = os.name == "nt"
PYTHON_CASA = CASA / ".venv" / ("Scripts/python.exe" if WINDOWS else "bin/python")
MARCA = CASA / ".instalado"
VERSION = (BASE / "VERSION").read_text(encoding="utf-8").strip()


def comprobar():
    """Devuelve la lista de lo que falta."""
    faltan = []
    if sys.version_info < (3, 10):
        faltan.append(f"Python 3.10 o superior (tienes {sys.version.split()[0]}): https://www.python.org/downloads/")
    node = shutil.which("node")
    if not node:
        faltan.append("Node.js 18 o superior: https://nodejs.org/")
    else:
        salida = subprocess.run([node, "--version"], capture_output=True, text=True).stdout
        m = re.match(r"v(\d+)", salida.strip())
        if not m or int(m.group(1)) < 18:
            faltan.append(f"Node.js 18 o superior (tienes {salida.strip() or 'una versión desconocida'}): https://nodejs.org/")
    if not shutil.which("npm"):
        faltan.append("npm (viene con Node.js): https://nodejs.org/")
    libre = shutil.disk_usage(CASA.parent if CASA.parent.exists() else Path.home()).free / 1e9
    if libre < 3:
        faltan.append(f"Unos 3 GB libres en disco (tienes {libre:.1f} GB)")
    return faltan


def paso(texto):
    print(texto, flush=True)


def ejecutar(orden, **kw):
    r = subprocess.run([str(x) for x in orden], cwd=CASA, **kw)
    if r.returncode:
        sys.exit(f"✗ Falló este paso: {' '.join(str(x) for x in orden[:4])}\nVuelve a intentarlo; si repite, comprueba tu conexión a internet.")


def copiar_motor():
    """Solo reemplaza el código: proyectos, videos y cache del usuario no están en el motor y no se tocan."""
    CASA.mkdir(parents=True, exist_ok=True)
    for origen in MOTOR.iterdir():
        destino = CASA / origen.name
        if origen.name == "datos":  # solo la textura del papel: el resto se genera al instalar
            (CASA / "datos").mkdir(exist_ok=True)
            shutil.copy2(origen / "pergamino.jpg", CASA / "datos" / "pergamino.jpg")
        elif origen.is_dir():
            if destino.exists():
                shutil.rmtree(destino)
            shutil.copytree(origen, destino)
        else:
            shutil.copy2(origen, destino)


def instalar():
    faltan = comprobar()
    if faltan:
        sys.exit("✗ Antes de instalar la fábrica falta esto:\n  - " + "\n  - ".join(faltan))
    paso(f"Instalando la Fábrica de Videos en {CASA} (la primera vez, unos minutos)…")
    copiar_motor()
    if not PYTHON_CASA.exists():
        paso("1/4 Preparando Python…")
        subprocess.run([sys.executable, "-m", "venv", str(CASA / ".venv")], check=True)
    paso("2/4 Instalando transcripción y voz…")
    ejecutar([PYTHON_CASA, "-m", "pip", "install", "-q", "--disable-pip-version-check", "-r", CASA / "requirements.txt"])
    paso("3/4 Instalando el motor de video…")
    ejecutar([shutil.which("npm"), "ci", "--no-audit", "--no-fund", "--loglevel=error"])
    ejecutar([shutil.which("npm"), "run", "-s", "web"])
    paso("4/4 Preparando mapas, banderas y música…")
    ejecutar([PYTHON_CASA, CASA / "herramientas" / "crear_datos.py"])
    MARCA.write_text(VERSION, encoding="utf-8")
    paso(f"✓ Fábrica instalada (versión {VERSION}).")


def al_dia():
    return MARCA.is_file() and PYTHON_CASA.exists() and MARCA.read_text(encoding="utf-8").strip() == VERSION


if __name__ == "__main__":
    orden = sys.argv[1:]
    if orden[:1] == ["comprobar"]:
        faltan = comprobar()
        print("✓ Todo listo." if not faltan else "✗ Falta:\n  - " + "\n  - ".join(faltan))
        sys.exit(1 if faltan else 0)
    if orden[:1] == ["instalar"] or not al_dia():
        instalar()
        if orden[:1] == ["instalar"]:
            sys.exit(0)
    if not orden:
        orden = ["abrir"]
    sys.exit(subprocess.run([str(PYTHON_CASA), str(CASA / "estudio.py"), *orden], cwd=CASA).returncode)
