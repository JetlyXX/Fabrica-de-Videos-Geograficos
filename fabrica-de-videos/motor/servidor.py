"""Fábrica de Videos: servidor local. Solo escucha en este ordenador (127.0.0.1)."""
import difflib
import json
import mimetypes
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import unicodedata
import urllib.parse
import urllib.request
import uuid
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
PROYECTOS = RAIZ / "proyectos"
PAPELERA = RAIZ / "papelera"
LISTOS = RAIZ / "Videos listos"
TESELAS = RAIZ / "cache" / "teselas"
DATOS = RAIZ / "datos"
WEB = RAIZ / "web"
PY = sys.executable
UA = "fabrica-de-videos/1.0"
EOX = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg"
MAX_SUBIDA = 500 * 1024 * 1024
FORMATOS_AUDIO = {".mp3", ".wav", ".m4a", ".ogg", ".opus", ".aac", ".flac"}
EDITABLES = ("titulo", "guion", "descripcion", "idioma", "duracionManual", "musica", "efectos", "subtitulos", "escenas")
CREDITOS = (
    "Imágenes: Sentinel-2 cloudless – https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016), CC BY 4.0.\n"
    "Países: Natural Earth (dominio público)."
)
MUSICAS = [{"id": "biblioteca:curiosa.mp3", "nombre": "Curiosa"}, {"id": "biblioteca:intriga.mp3", "nombre": "Intriga"}, {"id": "biblioteca:epica.mp3", "nombre": "Épica"}]

ESTADO = RAIZ / "cache" / "servidor.json"
PEDIDO = RAIZ / "cache" / "pedido.json"
ESPERANDO = RAIZ / "cache" / "esperando"
PROGRESO = RAIZ / "cache" / "progreso.json"
ESTILOS = ("historia", "comparar", "fronteras", "rutas", "libre")

PUERTO = 0
trabajos = {}
candado_render = threading.Lock()
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("audio/mpeg", ".mp3")


def ffmpeg():
    import imageio_ffmpeg

    return imageio_ffmpeg.get_ffmpeg_exe()


def abrir_carpeta(carpeta_):
    if os.name == "nt":
        os.startfile(str(carpeta_))  # noqa
    else:
        subprocess.Popen(["open" if sys.platform == "darwin" else "xdg-open", str(carpeta_)])


# ---------------------------------------------------------------- proyectos
def carpeta(id_):
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,70}", id_ or ""):
        return None
    c = PROYECTOS / id_
    return c if (c / "proyecto.json").is_file() else None


def leer(c):
    return json.loads((c / "proyecto.json").read_text(encoding="utf-8"))


def guardar(c, p):
    temporal = c / f"proyecto.{uuid.uuid4().hex}.tmp"
    temporal.write_text(json.dumps(p, ensure_ascii=False, indent=1), encoding="utf-8")
    temporal.replace(c / "proyecto.json")


def sin_tildes(s):
    return "".join(ch for ch in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(ch) != "Mn")


def nuevo_proyecto(titulo):
    titulo = (titulo or "").strip()[:120] or "Mi video"
    limpio = re.sub(r"[^a-z0-9]+", "-", sin_tildes(titulo)).strip("-")[:50] or "video"
    id_ = f"{limpio}-{uuid.uuid4().hex[:5]}"
    c = PROYECTOS / id_
    c.mkdir(parents=True)
    p = {
        "id": id_, "titulo": titulo, "guion": "", "descripcion": "", "idioma": "es", "voz": None, "duracionVoz": None, "duracionManual": 20, "palabras": [],
        "musica": {"archivo": "biblioteca:curiosa.mp3", "volumen": 0.25}, "efectos": True,
        "subtitulos": {"mostrar": True, "color": "#ffc531", "fuente": "Poppins", "tam": 66, "y": 1340, "porGrupo": 4},
        "escenas": [{
            "id": uuid.uuid4().hex[:8], "inicio": 0, "lon": 0, "lat": 20, "zoom": 3.2, "movimiento": "acercar", "mapa": "satelite", "paises": [], "texto": "", "subtexto": "",
            "tipoTexto": "cartela", "colorTexto": "#ffc531", "posTexto": "arriba", "banderas": [], "marcador": False,
        }],
        "creado": time.time(),
    }
    guardar(c, p)
    return p


def lista_proyectos():
    salida = []
    for c in PROYECTOS.iterdir() if PROYECTOS.exists() else []:
        if (c / "proyecto.json").is_file():
            p = leer(c)
            salida.append({"id": p["id"], "titulo": p["titulo"], "creado": p.get("creado", 0), "escenas": len(p["escenas"]), "voz": bool(p.get("voz")), "duracion": p.get("duracionVoz") or p.get("duracionManual"), "video": p.get("video"), "modificado": (c / "proyecto.json").stat().st_mtime})
    return sorted(salida, key=lambda x: -x["modificado"])


def realinear(palabras, texto):
    """Pone el texto corregido sobre los tiempos que ya se habían oído."""
    nuevas = texto.split()
    normal = lambda w: re.sub(r"[^a-z0-9ñ]", "", sin_tildes(w))
    a, b = [normal(w) for w in nuevas], [normal(p["w"]) for p in palabras]
    tiempos = [None] * len(nuevas)
    for blq in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        for k in range(blq.size):
            tiempos[blq.a + k] = (palabras[blq.b + k]["a"], palabras[blq.b + k]["b"])
    final = palabras[-1]["b"] if palabras else 0.0
    i = 0
    while i < len(nuevas):
        if tiempos[i] is not None:
            i += 1
            continue
        j = i
        while j < len(nuevas) and tiempos[j] is None:
            j += 1
        t0 = tiempos[i - 1][1] if i else 0.0
        t1 = tiempos[j][0] if j < len(nuevas) else max(final, t0 + 0.3 * (j - i))
        paso = max(t1 - t0, 0.05) / (j - i)
        for k in range(i, j):
            tiempos[k] = (t0 + paso * (k - i), t0 + paso * (k - i + 1))
        i = j
    return [{"w": w, "a": round(t[0], 3), "b": round(t[1], 3)} for w, t in zip(nuevas, tiempos)]


# ---------------------------------------------------------------- trabajos largos
def nuevo_trabajo(tipo, funcion):
    id_ = uuid.uuid4().hex[:10]
    trabajos[id_] = {"id": id_, "tipo": tipo, "estado": "en marcha", "fase": "Empezando", "avance": 0, "error": None, "resultado": None}

    def correr():
        try:
            trabajos[id_]["resultado"] = funcion(trabajos[id_])
            trabajos[id_].update(estado="listo", avance=1)
        except Exception as e:  # el error se le enseña al usuario en la página
            trabajos[id_].update(estado="error", error=str(e)[-800:])

    threading.Thread(target=correr, daemon=True).start()
    return trabajos[id_]


def ejecutar(orden, **kw):
    r = subprocess.run(orden, capture_output=True, text=True, encoding="utf-8", errors="replace", creationflags=0x08000000 if os.name == "nt" else 0, **kw)
    if r.returncode:
        raise RuntimeError(r.stderr.strip() or r.stdout.strip() or "falló un paso")
    return r


def trabajo_voz(c, original):
    def hacer(tr):
        tr["fase"] = "Preparando el audio"
        ejecutar([ffmpeg(), "-v", "error", "-y", "-i", str(original), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-b:a", "192k", str(c / "voz.mp3")])
        tr.update(fase="Escuchando cada palabra (puede tardar un par de minutos)", avance=0.15)
        salida = c / "palabras.tmp.json"
        ejecutar([PY, str(RAIZ / "herramientas" / "transcribir.py"), str(c / "voz.mp3"), str(salida), leer(c).get("idioma", "es")])
        dato = json.loads(salida.read_text(encoding="utf-8"))
        salida.unlink()
        p = leer(c)
        p.update(voz="voz.mp3", duracionVoz=dato["duracion"], palabras=dato["palabras"])
        guardar(c, p)
        return {"palabras": len(dato["palabras"]), "duracion": dato["duracion"]}

    return nuevo_trabajo("voz", hacer)


def trabajo_render(c, borrador):
    def hacer(tr):
        if not candado_render.acquire(blocking=False):
            raise RuntimeError("Ya se está creando otro video. Espera a que termine.")
        try:
            p = leer(c)
            LISTOS.mkdir(exist_ok=True)
            salida_dir = RAIZ / "cache" / "render"
            salida_dir.mkdir(parents=True, exist_ok=True)
            bruto = salida_dir / f"{p['id']}.mp4"
            with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
                json.dump({"proyecto": p, "base": f"http://127.0.0.1:{PUERTO}"}, f, ensure_ascii=False)
            proc = subprocess.Popen(
                ["node", str(RAIZ / "herramientas" / "render.mjs"), f.name, str(bruto), "0.5" if borrador else "1"],
                cwd=RAIZ, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace", creationflags=0x08000000 if os.name == "nt" else 0,
            )
            errores = []
            hilo = threading.Thread(target=lambda: errores.extend(proc.stderr.readlines()), daemon=True)
            hilo.start()
            for linea in proc.stdout:
                try:
                    d = json.loads(linea)
                    preparando = d["fase"] == "Preparando"
                    tr.update(fase=d["fase"], avance=(d["avance"] * 0.08 if preparando else 0.08 + d["avance"] * 0.87))
                except (ValueError, KeyError):
                    pass
            proc.wait()
            hilo.join(timeout=5)
            os.unlink(f.name)
            if proc.returncode:
                raise RuntimeError("".join(errores)[-800:] or "No se pudo crear el video.")
            tr.update(fase="Ajustando el volumen", avance=0.96)
            r = subprocess.run([ffmpeg(), "-hide_banner", "-i", str(bruto), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace", creationflags=0x08000000 if os.name == "nt" else 0)
            m = json.loads(r.stderr[r.stderr.rindex("{"): r.stderr.rindex("}") + 1])
            filtro = f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
            nombre = re.sub(r'[\\/:*?"<>|]', "", p["titulo"]).strip()[:90] or p["id"]
            if borrador:
                nombre += " (borrador)"
            final = LISTOS / f"{nombre}.mp4"
            ejecutar([ffmpeg(), "-v", "error", "-y", "-i", str(bruto), "-c:v", "copy", "-af", filtro, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", str(final)])
            bruto.unlink(missing_ok=True)
            texto = f"{p['titulo']}\n\n{p.get('descripcion', '').strip()}\n\n{CREDITOS}\n"
            final.with_suffix(".txt").write_text(texto, encoding="utf-8")
            p2 = leer(c)
            p2["video"] = final.name
            guardar(c, p2)
            return {"video": final.name, "descripcion": texto}
        finally:
            candado_render.release()

    return nuevo_trabajo("render", hacer)


# ---------------------------------------------------------------- mapas
def tesela(z, x, y):
    destino = TESELAS / str(z) / str(x) / f"{y}.jpg"
    if destino.is_file():
        return destino
    for intento in range(3):
        try:
            req = urllib.request.Request(EOX.format(z=z, x=x, y=y), headers={"User-Agent": UA})
            contenido = urllib.request.urlopen(req, timeout=30).read()
            destino.parent.mkdir(parents=True, exist_ok=True)
            temporal = destino.with_suffix(f".{uuid.uuid4().hex}.tmp")
            temporal.write_bytes(contenido)
            temporal.replace(destino)
            return destino
        except Exception:
            time.sleep(0.4 * (intento + 1))
    return None


TESELA_VACIA = b'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#16324f"/></svg>'


def buscar_lugar(q):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({"q": q[:120], "format": "jsonv2", "limit": 6, "accept-language": "es"})
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    datos = json.loads(urllib.request.urlopen(req, timeout=15).read())
    return [{"nombre": d["display_name"], "lat": float(d["lat"]), "lon": float(d["lon"]), "caja": [float(v) for v in d["boundingbox"]]} for d in datos]


# ---------------------------------------------------------------- servidor
class Manejador(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):
        pass

    def origen_local(self):
        o = self.headers.get("Origin")
        if o and re.fullmatch(r"http://(127\.0\.0\.1|localhost)(:\d+)?", o):
            return o
        return None

    def cabeceras_comunes(self):
        o = self.origen_local()
        if o:  # el motor de vídeo se abre en otro puerto de este mismo ordenador
            self.send_header("Access-Control-Allow-Origin", o)
            self.send_header("Vary", "Origin")

    def host_correcto(self):
        return self.headers.get("Host") in (f"127.0.0.1:{PUERTO}", f"localhost:{PUERTO}")

    def responder(self, codigo, cuerpo, tipo="application/json; charset=utf-8"):
        if isinstance(cuerpo, (dict, list)):
            cuerpo = json.dumps(cuerpo, ensure_ascii=False).encode("utf-8")
        self.send_response(codigo)
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(cuerpo)))
        self.send_header("Cache-Control", "no-store")
        self.cabeceras_comunes()
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(cuerpo)

    def archivo(self, ruta, cachear=False):
        tam = ruta.stat().st_size
        tipo = mimetypes.guess_type(ruta.name)[0] or "application/octet-stream"
        rango = re.fullmatch(r"bytes=(\d*)-(\d*)", self.headers.get("Range") or "")
        a, b = 0, tam - 1
        if rango and (rango.group(1) or rango.group(2)):
            if rango.group(1):
                a = int(rango.group(1))
                b = min(int(rango.group(2)), tam - 1) if rango.group(2) else tam - 1
            else:
                a = max(0, tam - int(rango.group(2)))
            if a > b:
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{tam}")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {a}-{b}/{tam}")
        else:
            self.send_response(200)
        self.send_header("Content-Type", tipo)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(b - a + 1))
        self.send_header("Cache-Control", "public, max-age=604800" if cachear else "no-store")
        self.cabeceras_comunes()
        self.end_headers()
        if self.command == "HEAD":
            return
        try:
            with open(ruta, "rb") as f:
                f.seek(a)
                resta = b - a + 1
                while resta > 0:
                    trozo = f.read(min(1 << 20, resta))
                    if not trozo:
                        break
                    self.wfile.write(trozo)
                    resta -= len(trozo)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def servir_de(self, base, relativa, cachear=False):
        try:
            f = (base / urllib.parse.unquote(relativa)).resolve()
            f.relative_to(base.resolve())
        except (ValueError, OSError):
            return self.responder(404, {"error": "no existe"})
        if f.is_file():
            return self.archivo(f, cachear)
        return self.responder(404, {"error": "no existe"})

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Content-Length", "0")
        self.cabeceras_comunes()
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Range")
        self.end_headers()

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        if not self.host_correcto():
            return self.responder(403, {"error": "acceso no permitido"})
        partes = urllib.parse.urlsplit(self.path)
        ruta = partes.path
        if ruta == "/":
            return self.archivo(WEB / "index.html")
        if ruta == "/nuevo":
            return self.archivo(WEB / "nuevo.html")
        if ruta == "/api/hola":
            return self.responder(200, {"raiz": str(RAIZ)})
        if ruta == "/api/conexion":
            conectado = ESPERANDO.exists() and time.time() - ESPERANDO.stat().st_mtime < 10
            return self.responder(200, {"claude": conectado})
        if ruta == "/api/progreso":
            return self.archivo(PROGRESO) if PROGRESO.is_file() else self.responder(200, {"paso": -1})
        m = re.fullmatch(r"/t/(\d{1,2})/(\d{1,6})/(\d{1,6})\.jpg", ruta)
        if m:
            f = tesela(*map(int, m.groups()))
            if f:
                return self.archivo(f, True)
            return self.responder(200, TESELA_VACIA, "image/svg+xml")
        if ruta == "/api/proyectos":
            return self.responder(200, lista_proyectos())
        if ruta == "/api/musicas":
            return self.responder(200, MUSICAS)
        m = re.fullmatch(r"/api/proyectos/([^/]+)", ruta)
        if m:
            c = carpeta(m.group(1))
            return self.responder(200, leer(c)) if c else self.responder(404, {"error": "no existe"})
        m = re.fullmatch(r"/api/trabajos/([a-f0-9]+)", ruta)
        if m:
            tr = trabajos.get(m.group(1))
            return self.responder(200, tr) if tr else self.responder(404, {"error": "no existe"})
        if ruta == "/api/buscar":
            q = urllib.parse.parse_qs(partes.query).get("q", [""])[0].strip()
            try:
                return self.responder(200, buscar_lugar(q) if q else [])
            except Exception:
                return self.responder(502, {"error": "No se pudo buscar. Comprueba tu conexión."})
        for prefijo, base in (("/web/", WEB), ("/datos/", DATOS), ("/videos/", LISTOS)):
            if ruta.startswith(prefijo):
                return self.servir_de(base, ruta[len(prefijo):], prefijo == "/datos/")
        m = re.fullmatch(r"/proyectos/([^/]+)/([^/]+)", ruta)
        if m and carpeta(m.group(1)) and m.group(2) != "proyecto.json":
            return self.servir_de(carpeta(m.group(1)), m.group(2))
        self.responder(404, {"error": "no existe"})

    def cuerpo(self):
        largo = int(self.headers.get("Content-Length") or 0)
        if largo > MAX_SUBIDA:
            self.close_connection = True
            raise ValueError("El archivo es demasiado grande (máximo 500 MB).")
        return self.rfile.read(largo) if largo else b""

    def peticion_valida(self):
        """Bloquea peticiones que vengan de otras páginas web abiertas en el navegador."""
        o = self.headers.get("Origin")
        return self.host_correcto() and (o is None or o in (f"http://127.0.0.1:{PUERTO}", f"http://localhost:{PUERTO}"))

    def json_cuerpo(self):
        return json.loads(self.cuerpo().decode("utf-8") or "{}")

    def do_POST(self):
        if not self.peticion_valida():
            return self.responder(403, {"error": "acceso no permitido"})
        partes = urllib.parse.urlsplit(self.path)
        ruta = partes.path
        try:
            if ruta == "/api/proyectos":
                return self.responder(200, nuevo_proyecto(self.json_cuerpo().get("titulo")))
            if ruta == "/api/pedido/audio":
                nombre = urllib.parse.parse_qs(partes.query).get("nombre", ["audio.mp3"])[0]
                ext = Path(nombre).suffix.lower()
                contenido = self.cuerpo()
                if ext not in FORMATOS_AUDIO:
                    return self.responder(400, {"error": "Ese archivo no es un audio compatible (MP3, WAV, M4A, OGG, FLAC)."})
                destino = RAIZ / "cache" / f"pedido_audio{ext}"
                # a un nombre temporal primero: quien espera el audio nunca ve un archivo a medias
                temporal = RAIZ / "cache" / f"subida_{uuid.uuid4().hex}.tmp"
                temporal.write_bytes(contenido)
                for viejo in (RAIZ / "cache").glob("pedido_audio.*"):
                    viejo.unlink()
                temporal.replace(destino)
                return self.responder(200, {"audio": str(destino)})
            if ruta == "/api/pedido":
                d = self.json_cuerpo()
                idea = str(d.get("idea", "")).strip()[:3000]
                audio = str(d.get("audio", ""))
                # solo vale el audio que acaba de subirse aquí, no una ruta cualquiera
                if audio and (Path(audio).parent != RAIZ / "cache" or not Path(audio).name.startswith("pedido_audio.") or not Path(audio).is_file()):
                    return self.responder(400, {"error": "No encuentro tu audio. Súbelo otra vez."})
                if d.get("voz") == "audio" and not audio:
                    return self.responder(400, {"error": "Elige tu audio."})
                if not idea and not audio:
                    return self.responder(400, {"error": "Escribe tu idea."})
                if d.get("estilo") not in ESTILOS:
                    return self.responder(400, {"error": "Elige un estilo."})
                pedido = {k: str(d.get(k, ""))[:300] for k in ("estilo", "duracion", "voz", "mapa", "musica")}
                pedido.update(idea=idea, audio=audio, revisar=bool(d.get("revisar")))
                temporal = PEDIDO.with_suffix(".tmp")
                temporal.write_text(json.dumps(pedido, ensure_ascii=False, indent=1), encoding="utf-8")
                temporal.replace(PEDIDO)
                PROGRESO.write_text(json.dumps({"paso": 0}), encoding="utf-8")
                conectado = ESPERANDO.exists() and time.time() - ESPERANDO.stat().st_mtime < 10
                return self.responder(200, {"claude": conectado})
            if ruta == "/api/apagar":
                threading.Thread(target=srv.shutdown, daemon=True).start()
                return self.responder(200, {"ok": True})
            if ruta == "/api/abrir-videos":
                LISTOS.mkdir(exist_ok=True)
                abrir_carpeta(LISTOS)
                return self.responder(200, {"ok": True})
            m = re.fullmatch(r"/api/proyectos/([^/]+)/(voz|musica|texto|render)", ruta)
            c = carpeta(m.group(1)) if m else None
            if not c:
                return self.responder(404, {"error": "no existe"})
            accion = m.group(2)
            if accion in ("voz", "musica"):
                nombre = urllib.parse.parse_qs(partes.query).get("nombre", ["audio.mp3"])[0]
                ext = Path(nombre).suffix.lower()
                if ext not in FORMATOS_AUDIO:
                    self.cuerpo()
                    return self.responder(400, {"error": "Ese archivo no es un audio compatible (MP3, WAV, M4A, OGG, FLAC)."})
                contenido = self.cuerpo()
                if accion == "musica":
                    destino = f"musica_propia{ext}"
                    (c / destino).write_bytes(contenido)
                    return self.responder(200, {"archivo": destino})
                original = c / f"voz_original{ext}"
                original.write_bytes(contenido)
                return self.responder(200, trabajo_voz(c, original))
            if accion == "texto":
                p = leer(c)
                p["palabras"] = realinear(p["palabras"], str(self.json_cuerpo().get("texto", "")))
                guardar(c, p)
                return self.responder(200, {"palabras": p["palabras"]})
            return self.responder(200, trabajo_render(c, bool(self.json_cuerpo().get("borrador"))))
        except ValueError as e:
            return self.responder(400, {"error": str(e)})

    def do_PUT(self):
        if not self.peticion_valida():
            return self.responder(403, {"error": "acceso no permitido"})
        m = re.fullmatch(r"/api/proyectos/([^/]+)", self.path)
        c = carpeta(m.group(1)) if m else None
        if not c:
            return self.responder(404, {"error": "no existe"})
        try:
            cambios = self.json_cuerpo()
        except ValueError:
            return self.responder(400, {"error": "datos no válidos"})
        p = leer(c)
        # La voz y las palabras solo las cambia el servidor: así el guardado automático no las pisa
        p.update({k: cambios[k] for k in EDITABLES if k in cambios})
        guardar(c, p)
        self.responder(200, {"ok": True})

    def do_DELETE(self):
        if not self.peticion_valida():
            return self.responder(403, {"error": "acceso no permitido"})
        m = re.fullmatch(r"/api/proyectos/([^/]+)", self.path)
        c = carpeta(m.group(1)) if m else None
        if not c:
            return self.responder(404, {"error": "no existe"})
        PAPELERA.mkdir(exist_ok=True)  # no se borra: va a la carpeta «papelera»
        shutil.move(str(c), str(PAPELERA / f"{c.name}-{int(time.time())}"))
        self.responder(200, {"ok": True})


class Servidor(ThreadingHTTPServer):
    daemon_threads = True

    def server_bind(self):  # sin búsqueda de nombre: puede tardar en algunas redes
        import socketserver

        socketserver.TCPServer.server_bind(self)
        self.server_name, self.server_port = "127.0.0.1", self.server_address[1]


def puerto_libre():
    for p in range(8820, 8840):
        with socket.socket() as s:
            try:
                s.bind(("127.0.0.1", p))
                return p
            except OSError:
                continue
    sys.exit("No hay ningún puerto libre entre 8820 y 8839.")


if __name__ == "__main__":
    PROYECTOS.mkdir(exist_ok=True)
    ESTADO.parent.mkdir(exist_ok=True)
    # si ya está encendido, no se abre otro: solo se muestra la página
    try:
        vivo = json.loads(ESTADO.read_text(encoding="utf-8"))["puerto"]
        with urllib.request.urlopen(f"http://127.0.0.1:{vivo}/api/hola", timeout=2) as r:
            if json.loads(r.read())["raiz"] == str(RAIZ):
                if "--sin-abrir" not in sys.argv:
                    webbrowser.open(f"http://127.0.0.1:{vivo}/")
                print(f"La fábrica ya estaba encendida en http://127.0.0.1:{vivo}/", flush=True)
                sys.exit(0)
    except (OSError, ValueError, KeyError):
        pass
    PUERTO = puerto_libre()
    srv = Servidor(("127.0.0.1", PUERTO), Manejador)
    ESTADO.write_text(json.dumps({"puerto": PUERTO}), encoding="utf-8")
    url = f"http://127.0.0.1:{PUERTO}/"
    print(f"Fábrica de Videos está en {url}\nDeja esta ventana abierta mientras lo uses; ciérrala para apagarlo.", flush=True)
    if "--sin-abrir" not in sys.argv:
        webbrowser.open(url)
    srv.serve_forever()
