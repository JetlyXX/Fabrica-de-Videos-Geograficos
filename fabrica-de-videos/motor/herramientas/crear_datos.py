"""Prepara una sola vez lo que usa el estudio (se ejecuta al instalar):
  - datos/paises.json : siluetas de todos los países (Natural Earth, dominio público)
  - datos/banderas/   : banderas de la librería flag-icons (licencia MIT)
  - datos/musica/     : tres músicas generadas aquí por código, sin muestras de terceros
  - datos/sfx/        : efectos generados aquí por código
"""
import json
import math
import shutil
import subprocess
import urllib.request
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np

RAIZ = Path(__file__).resolve().parents[1]
DATOS = RAIZ / "datos"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
SR = 44100
rng = np.random.default_rng(1856)


# ---------------------------------------------------------------- países
def merc(lon, lat):
    r = math.radians(max(-85, min(85, lat)))
    return (lon + 180) / 360 * 256, (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 256


def crear_paises():
    cache = RAIZ / "cache" / "ne10.geojson"
    if not cache.exists():
        url = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson"
        req = urllib.request.Request(url, headers={"User-Agent": "fabrica-de-videos/1.0"})
        cache.parent.mkdir(exist_ok=True)
        cache.write_bytes(urllib.request.urlopen(req, timeout=120).read())
    salida = {}
    for f in json.loads(cache.read_text(encoding="utf-8"))["features"]:
        pr = f["properties"]
        iso = pr.get("ADM0_A3")
        geo = f["geometry"]
        if not iso or not geo:
            continue
        polis = geo["coordinates"] if geo["type"] == "MultiPolygon" else [geo["coordinates"]]
        d, xs, ys = [], [], []
        for pol in polis:
            for anillo in pol:
                pts, ult = [], None
                for lon, lat in anillo:
                    if ult is None or abs(lon - ult[0]) + abs(lat - ult[1]) > 0.02:
                        x, y = merc(lon, lat)
                        pts.append(f"{x:.3f} {y:.3f}")
                        xs.append(x)
                        ys.append(y)
                        ult = (lon, lat)
                if len(pts) > 2:
                    d.append("M" + "L".join(pts) + "Z")
        if d:
            a2 = str(pr.get("ISO_A2_EH") or pr.get("ISO_A2") or "").lower()
            salida[iso] = {
                "n": pr.get("NAME_ES") or pr.get("NAME") or iso,
                "a2": a2 if len(a2) == 2 else "",
                "c": [round(pr.get("LABEL_X") or 0, 3), round(pr.get("LABEL_Y") or 0, 3)],
                "b": [round(min(xs), 3), round(min(ys), 3), round(max(xs), 3), round(max(ys), 3)],
                "d": "".join(d),
            }
    (DATOS / "paises.json").write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("países:", len(salida), f"({(DATOS / 'paises.json').stat().st_size / 1e6:.1f} MB)", flush=True)


def copiar_banderas():
    destino = DATOS / "banderas"
    destino.mkdir(exist_ok=True)
    for f in (RAIZ / "node_modules" / "flag-icons" / "flags" / "4x3").glob("*.svg"):
        shutil.copy(f, destino / f.name)
    shutil.copy(RAIZ / "node_modules" / "flag-icons" / "LICENSE", destino / "LICENSE-flag-icons.txt")
    print("banderas:", len(list(destino.glob("*.svg"))), flush=True)


# ---------------------------------------------------------------- sonido
def nota(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def pad(frec, dur):
    t = np.arange(int(dur * SR)) / SR
    s = np.zeros_like(t)
    for f in frec:
        for det, amp in ((0.998, 0.5), (1.002, 0.5), (2.001, 0.14), (3.0, 0.05)):
            s += amp * np.sin(2 * np.pi * f * det * t + rng.random() * 6.28)
    env = np.minimum(t / 0.9, 1) * np.minimum((dur - t) / 0.9, 1)
    return s * np.clip(env, 0, 1)


def pulsacion(f, dur=1.4):
    t = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) * np.exp(-t * 6) + 0.12 * np.sin(6 * np.pi * f * t) * np.exp(-t * 9)
    return s * np.exp(-t * 3.2) * np.minimum(t / 0.004, 1)


def pegar(pista, s, t, vol=1.0):
    i = int(t * SR)
    if 0 <= i < len(pista):
        f = min(len(s), len(pista) - i)
        pista[i:i + f] += s[:f] * vol


def paso_bajo(s, corte):
    a = np.exp(-2 * np.pi * corte / SR)
    y = np.zeros_like(s)
    v = 0.0
    for i in range(len(s)):
        v = (1 - a) * s[i] + a * v
        y[i] = v
    return y


def whoosh(dur=0.9):
    n = int(dur * SR)
    r = rng.standard_normal(n)
    t = np.linspace(0, 1, n)
    mezcla = (1 - t) * paso_bajo(r, 500) + t * paso_bajo(r, 3500)
    s = mezcla * np.sin(np.pi * t) ** 2
    return s / (np.abs(s).max() + 1e-9)


def pop():
    t = np.arange(int(0.14 * SR)) / SR
    f = 620 * np.exp(-t * 14) + 180
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 34)


def golpe():
    t = np.arange(int(0.75 * SR)) / SR
    f = 95 * np.exp(-t * 7) + 42
    cuerpo = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6.5)
    return cuerpo + paso_bajo(rng.standard_normal(len(t)), 2200) * np.exp(-t * 24) * 1.3


def guardar_mp3(mono, destino):
    mono = mono / (np.abs(mono).max() + 1e-9) * 0.85
    temporal = destino.with_suffix(".wav")
    with wave.open(str(temporal), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mono * 32000).astype(np.int16).tobytes())
    subprocess.run([FFMPEG, "-v", "error", "-y", "-i", str(temporal), "-b:a", "160k", str(destino)], check=True)
    temporal.unlink()


def crear_musica(nombre, acordes, bpm, patron, tambor, dur=180.0):
    n = int(dur * SR)
    base, arpa = np.zeros(n), np.zeros(n)
    pulso = 60 / bpm
    compas = pulso * 4
    t, i = 0.0, 0
    while t < dur:
        ac = acordes[i % len(acordes)]
        pegar(base, pad([nota(m) for m in ac], compas * 1.15), t, 0.1)
        pegar(base, pad([nota(ac[0] - 12)], compas * 1.1), t, 0.1)
        for j, p in enumerate(patron):
            pegar(arpa, pulsacion(nota(ac[p] + 12)), t + j * compas / len(patron), (0.8 if j % 4 == 0 else 0.5) * 0.11)
        if tambor:
            for g in (0, 1.5, 2):
                pegar(base, golpe(), t + g * pulso, 0.14)
        t += compas
        i += 1
    guardar_mp3(base + arpa, DATOS / "musica" / f"{nombre}.mp3")
    print("música:", nombre, flush=True)


if __name__ == "__main__":
    for carpeta in ("musica", "sfx"):
        (DATOS / carpeta).mkdir(parents=True, exist_ok=True)
    crear_paises()
    copiar_banderas()
    guardar_mp3(whoosh(), DATOS / "sfx" / "whoosh.mp3")
    guardar_mp3(pop(), DATOS / "sfx" / "pop.mp3")
    guardar_mp3(golpe(), DATOS / "sfx" / "golpe.mp3")
    crear_musica("curiosa", [[50, 57, 62, 65], [46, 53, 58, 62], [41, 53, 57, 60], [48, 55, 60, 64]], 92, [0, 2, 3, 2, 1, 3, 2, 3], False)
    crear_musica("intriga", [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 56]], 70, [0, 3, 1, 2], False)
    crear_musica("epica", [[43, 50, 55, 58], [39, 46, 51, 55], [46, 53, 58, 62], [41, 48, 53, 57]], 104, [0, 1, 2, 3, 2, 3, 1, 3], True)
    print("listo", flush=True)
