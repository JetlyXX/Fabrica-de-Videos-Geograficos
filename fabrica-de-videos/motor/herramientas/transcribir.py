"""Saca de un audio el momento exacto de cada palabra (Whisper, en este ordenador).
Uso: transcribir.py <audio> <salida.json> <idioma>"""
import json
import sys
from pathlib import Path

import av
import numpy as np
from faster_whisper import WhisperModel


def leer_audio(ruta):
    # Decodifica a mono, 16 kHz, en números de -1 a 1
    trozos = []
    with av.open(str(ruta)) as c:
        res = av.AudioResampler(format="s16", layout="mono", rate=16000)
        for frame in c.decode(audio=0):
            for f in res.resample(frame):
                trozos.append(f.to_ndarray().flatten())
        for f in res.resample(None):
            trozos.append(f.to_ndarray().flatten())
    return np.concatenate(trozos).astype(np.float32) / 32768.0


audio, salida, idioma = sys.argv[1:4]
modelo = WhisperModel("small", device="cpu", compute_type="int8")
segmentos, info = modelo.transcribe(leer_audio(audio), language=idioma or None, word_timestamps=True, beam_size=5)
palabras = [{"w": w.word.strip(), "a": round(w.start, 3), "b": round(w.end, 3)} for s in segmentos for w in (s.words or []) if w.word.strip()]
Path(salida).write_text(json.dumps({"duracion": round(info.duration, 2), "palabras": palabras}, ensure_ascii=False), encoding="utf-8")
print(len(palabras), "palabras")
