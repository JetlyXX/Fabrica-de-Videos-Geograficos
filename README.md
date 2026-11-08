# Fábrica de Videos Geográficos

Crea videos verticales de mapas animados (1080×1920, para YouTube Shorts, TikTok o Reels) sobre el tema que quieras. Tú pones la idea y la voz; Claude comprueba los datos, escribe el guion y monta el video en tu propio ordenador.

## Qué hace

- Abre una página local en tu navegador para elegir el estilo y cómo poner la voz.
- Comprueba los datos del tema y escribe el guion.
- Sincroniza el mapa, los textos y los subtítulos con la voz, palabra a palabra.
- Genera el video y un `.txt` con el título, la descripción y los créditos.

**Estilos:** Historia de un lugar, Comparar tamaños, Fronteras curiosas, Rutas y viajes y Tema libre.

**Voz, tres opciones:**

| Opción | Cómo funciona |
|---|---|
| Ya tengo mi audio | Lo subes y el video sigue tu voz. |
| Escríbeme el guion | Claude lo escribe, tú lo grabas y lo subes en la misma página. |
| Voz automática | Para pruebas rápidas. |

## Qué necesitas

El programa es gratis y funciona en tu ordenador, pero necesita esto instalado:

| Requisito | Dónde conseguirlo |
|---|---|
| Claude Code o la app de escritorio de Claude (pestaña Code), con **tu propia cuenta de Claude** | [claude.com](https://claude.com) |
| Python 3.10 o superior | [python.org/downloads](https://www.python.org/downloads/) (en Windows, marca «Add python.exe to PATH») |
| Node.js 18 o superior | [nodejs.org](https://nodejs.org/) |
| Internet y unos 3 GB libres en el disco | La primera instalación descarga cerca de 1 GB |

Funciona en Windows y Mac.

## Instalación (solo una vez)

1. Pulsa el botón verde **Code** de esta página y luego **Download ZIP**.
2. Descomprime el ZIP.
3. Haz doble clic en el instalador:
   - **Windows:** `Instalar (Windows).cmd`. Si sale un aviso azul, pulsa «Más información» y «Ejecutar de todas formas».
   - **Mac:** `Instalar (Mac).command`. Si lo bloquea, ve a Ajustes del Sistema > Privacidad y seguridad > «Abrir igualmente».
4. Escribe `s` y pulsa Enter.

El instalador copia la skill en `.claude/skills/fabrica-de-videos`, dentro de tu carpeta personal.

## Cómo hacer tu primer video, paso a paso

1. Abre una sesión **nueva** de Claude y escribe:

   ```
   VIDEO NUEVO
   ```

2. Si Claude te pide permiso, pulsa «Permitir». La primera vez instala el motor en la carpeta `FabricaDeVideos`, y tarda unos minutos.
3. Se abre la fábrica en tu navegador. Elige un estilo y cómo poner la voz.
4. Escribe tu idea, por ejemplo: «¿Por qué Bolivia no tiene mar?».
5. Pulsa **Crear mi video** y espera. Ves el avance en la página. Un video de un minuto suele tardar unos minutos.
6. Tu video queda en `FabricaDeVideos/Videos listos`, con un `.txt` al lado.

## Antes de publicar un video

- Míralo entero y revisa los datos. Claude puede equivocarse y la responsabilidad es tuya.
- Copia los créditos del `.txt` en la descripción: el mapa de satélite los exige.
- Usa solo música sobre la que tengas permiso.

## Qué le puedes pedir a Claude

| Escribe | Para qué |
|---|---|
| `VIDEO NUEVO` | Empezar un video |
| `Abre la fábrica` | Ver tus videos y montar o retocar a mano |
| `Cambia el texto de la escena del segundo 20` | Retocar un video hecho |
| `Hazlo con este audio` y la ruta del archivo | Montar un video sobre un audio |
| `Apaga la fábrica` | Cerrarla cuando termines |

## Si algo falla

| Problema | Solución |
|---|---|
| «python no se reconoce» | Instala Python, marca «Add python.exe to PATH» y reinicia Claude. |
| «Falta Node.js» | Instala Node.js y reinicia Claude. |
| Claude no reacciona a `VIDEO NUEVO` | Abre una sesión nueva o escribe `/fabrica-de-videos`. |
| La página no se abre | Pídele a Claude «abre la fábrica» y entra en la dirección que te dé. |
| El mapa sale borroso | Pídele que aleje un poco la cámara. |
| Otro fallo | Copia el mensaje de error en el chat y pídele a Claude que lo arregle. |

## Privacidad

La fábrica se abre solo en tu ordenador y tu voz se transcribe ahí mismo. Salen a internet:

- Las peticiones de mapas (EOX) y los lugares que busques (Nominatim, OpenStreetMap).
- El guion, solo si usas la voz automática (servicio de Microsoft, a través de edge-tts).
- Lo que trabajes con Claude, según las condiciones de tu cuenta.

## Licencias

El código de este repositorio se publica con licencia MIT (ver `LICENSE`). Lo que se descarga al instalar mantiene sus propias licencias: Remotion, React, Leaflet, esbuild, faster-whisper (modelo Whisper), edge-tts, imageio-ffmpeg, Poppins y Playfair Display (SIL OFL), flag-icons (MIT), Natural Earth (dominio público) y Sentinel-2 cloudless de EOX (CC BY 4.0).

- **Remotion:** las empresas de cierto tamaño necesitan su licencia. Consulta [remotion.dev/license](https://www.remotion.dev/license).
- **Voz automática:** edge-tts es gratis y sin cuenta, pero no es un producto oficial de Microsoft. Podría dejar de funcionar o no servir para uso comercial. Para monetizar, usa tu propia voz.

Este proyecto es independiente y no está afiliado a Anthropic, YouTube, TikTok ni Meta.

## Desinstalar

Borra estas dos carpetas de tu carpeta personal. La primera contiene tus videos y proyectos:

- `FabricaDeVideos`
- `.claude/skills/fabrica-de-videos`
