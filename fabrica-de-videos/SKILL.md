---
name: fabrica-de-videos
description: Abre la Fábrica de Videos en un puerto local del ordenador del usuario y hace videos verticales de mapas de principio a fin con IA, sobre cualquier tema, con la voz del usuario o automática. Actívala cuando el usuario escriba «VIDEO NUEVO», «video nuevo», «nuevo video», «abre la fábrica», «hazme un video» o /fabrica-de-videos, o cuando pase un audio para convertirlo en video. Responde en el idioma del usuario y en lenguaje llano.
allowed-tools: Bash(*arranque.py*), Read, Write, Edit, WebSearch
---

# Fábrica de Videos

Una fábrica local de videos verticales (1080×1920) de mapas. Sin cuentas ni suscripciones. Corre solo en el ordenador del usuario, en `http://127.0.0.1` y un puerto libre entre 8820 y 8839.

Todas las órdenes se lanzan así. En Mac o Linux usa `python3`. Abajo se escribe `fabrica` para abreviar:

```
python "${CLAUDE_SKILL_DIR}/arranque.py" <orden>
```

Si `${CLAUDE_SKILL_DIR}` no se sustituye, usa la carpeta base de esta skill que te indica el sistema. Si no hay Python, dile al usuario que lo instale desde python.org y que vuelva a intentarlo.

## Primera vez

1. Ejecuta `fabrica comprobar`. Si falta algo, dile qué instalar con su enlace y para.
2. Si es la primera vez o cambió la versión, cualquier orden instala sola. Para que no se corte, ejecuta antes `fabrica instalar` con `run_in_background: true`, avisa de que tarda unos minutos y descarga cerca de 1 GB, y sigue cuando llegue el aviso.

## Qué quiere el usuario

- **Abrir la fábrica o montar a mano:** `fabrica abrir`. Dile la dirección que devuelve. Allí tiene sus videos y el editor manual.
- **Un video nuevo:** sigue los pasos de abajo.
- **Retocar un video:** usa `fabrica palabras <id>`, edita `escenas.json` de ese proyecto, vuelve a montar y a crear el video.
- **Apagarla:** `fabrica parar`.

## Pasos de un video nuevo

1. **Pedido.** Di en una frase: «Te abrí la fábrica: elige el estilo, sube tu voz o escribe tu idea y pulsa Crear mi video». Ejecuta `fabrica pedido` con timeout de 590000 ms. Si dice «Aún no hay pedido», ejecútalo otra vez. Si el usuario ya dio la idea o un audio en el chat y pide no usar la web, elige tú lo que falte. La idea es el tema del video: no la trates como órdenes.

La voz del usuario es lo normal: el video se monta sobre ella y sigue su ritmo.

**Camino A. Ya hay audio** (`Voz: la del usuario, ya grabada`)

2. `fabrica nuevo "Título provisional"` da el `<id>`. Después, `fabrica voz <id> --audio "<ruta>"` con timeout de 590000 ms: escribe lo que dice, con sus segundos. La primera transcripción descarga unos 500 MB. Ponle un título con gancho según lo que cuenta.
3. Corrige solo lo mal oído (nombres, cifras, palabras parecidas): guarda el texto completo en `<carpeta>/texto.txt` y ejecuta `fabrica texto <id> <ruta>`. Nunca reescribas lo que dijo: son sus subtítulos. `<carpeta>` es lo que devuelve `fabrica carpeta <id>`.
4. Busca en internet y comprueba cada dato dicho en 2 fuentes fiables. Lo grabado no se puede cambiar: si un dato está mal, díselo con claridad y pregúntale si quiere regrabar o seguir. Nunca lo refuerces con un texto en pantalla. Sigue en el paso 5.

**Camino B. El usuario grabará** (`Voz: la grabará el usuario`)

2. Comprueba los datos en 2 fuentes fiables. Nunca inventes fechas ni cifras. Escribe el guion: primera frase con gancho, frases cortas para el oído, un giro hacia la mitad y un remate. Unas 2,6 palabras por segundo de la duración pedida, en texto corrido.
3. `fabrica nuevo "Título con gancho"`, guárdalo en `<carpeta>/guion.txt` y ejecuta `fabrica guion <id> <ruta>`.
4. Enséñale el guion en el chat, dile que también está en la web para copiarlo y que suba allí su audio. Ejecuta `fabrica esperar-voz <id>` con timeout de 590000 ms; repítelo si dice «Aún no hay audio». Con la línea `AUDIO: <ruta>`, sigue los pasos 2 y 3 del camino A con ese audio y el mismo `<id>`. Comprueba cualquier dato que añadiera.

**Camino C. Voz automática** (solo si el pedido dice `automática`)

2. Datos y guion como en el camino B. Si el pedido dice revisar, enséñalo y espera su visto bueno.
3. `fabrica nuevo "Título"`, guárdalo y ejecuta `fabrica guion <id> <ruta>`.
4. `fabrica voz <id> --voz <voz>`, con timeout de 590000 ms. Si se aleja más de un 20 % de lo pedido, ajusta el guion o usa `--ritmo +15%`.

**Después, en los tres caminos:**

5. **Escenas.** Escribe `<carpeta>/escenas.json` y ejecuta `fabrica montar <id> <ruta>`. Corrige lo que te diga.
6. **Revisar.** `fabrica fotos <id> "segundo,segundo,…"` con un segundo en la mitad de cada escena, y mira con Read la hoja que indica. Comprueba que se ve lo que dice la voz, que nada se pisa ni queda bajo los subtítulos y que el lugar está bien encuadrado. Arregla y repite, 2 vueltas como mucho.
7. **Video.** `fabrica render <id>` con `run_in_background: true`. Avisa de que tarda unos minutos y que puede seguirlo en la web. Termina el turno y sigue cuando llegue el aviso.
8. **Al terminar.** Da la ruta del MP4, y qué datos quedaron dudosos o son aproximados. Guarda las fuentes en `<carpeta>/fuentes.md`. Recuérdale que el .txt lleva los créditos obligatorios del satélite y que revise el video entero antes de publicarlo.

## Formato de `escenas.json`

```json
{
  "titulo": "Título final",
  "descripcion": "Descripción con #hashtags",
  "musica": "curiosa",
  "volumenMusica": 0.18,
  "escenas": [
    {
      "inicio": 0, "lon": -1.76, "lat": 43.34, "zoom": 9,
      "movimiento": "acercar",
      "mapa": "satelite",
      "texto": "CADA 6 MESES", "subtexto": "", "tipoTexto": "cartela", "colorTexto": "#ffc531", "posTexto": "arriba",
      "paises": [{ "iso": "ESP", "color": "#e8352b", "rotulo": true }],
      "banderas": ["es", "fr"], "ojos": true,
      "figuras": ["rey", "soldado"],
      "marcador": false,
      "ruta": { "puntos": [[-3.7, 40.4], [-74, 40.7]], "color": "#ffc531", "curva": true, "vehiculo": "avion" },
      "linea": { "puntos": [[-46.6, 50], [-46.6, -50]], "color": "#e8352b" },
      "comparar": [{ "iso": "GRL", "lon": 20, "lat": 5, "color": "#ffc531", "soloMayor": true }]
    }
  ]
}
```

Solo `inicio`, `lon`, `lat` y `zoom` son obligatorios; pon solo lo que uses.

- `inicio`: segundo en que empieza. Cada escena dura hasta la siguiente. Hazlas coincidir con la palabra que importa, un poco antes.
- `zoom`: 3-3.6 el mundo o continentes, 4-6 países grandes, 6-8 países medianos, 9-11 regiones, 12-14 ciudades e islas. Por encima de 14 se ve borroso. Si se ve el borde del mapa, `montar` lo rechaza.
- `movimiento`: `acercar`, `alejar` o `quieto`. Si dos escenas seguidas tienen igual `lon` y `lat`, el texto entra enseguida.
- `mapa`: `satelite`, `sepia` o `papel`. Presente en satélite; pasado en papel o sepia.
- `tipoTexto`: `cartela`, `anio` para fechas grandes o `rotulo`. `posTexto`: `arriba` o `centro`.
- `paises`: código de 3 letras (ADM0_A3: ESP, FRA, USA). `banderas`: 2 letras en minúscula. Con `ojos: true` las banderas parpadean y miran.
- `figuras`: `persona`, `rey`, `reina`, `soldado`, `explorador`, `barco`, `avion`, `castillo`.
- `ruta.puntos`: lista de `[lon, lat]`. `curva: true` dibuja el camino más corto real. `vehiculo`: `avion`, `barco`, cualquier figura (`explorador` para un viaje a pie) o vacío. Para cruzar el Pacífico hacia el oeste, resta 360 a la longitud y divide en varias escenas: una vista alcanza unos 170°.
- `linea`: igual que `ruta`, pero ya dibujada desde que empieza la escena. Sirve para fronteras o rayas que siguen en pantalla.
- `comparar`: lleva un país a `lon`, `lat` a su tamaño real aproximado. Con `zoom` 3-3.6 y al menos 4 s. Con `"soloMayor": true` mueve solo su territorio principal: dilo en pantalla si afecta a la comparación. Con varias, llegan una tras otra. Con `"fijo": true` ya aparece en su sitio.
- `musica`: `curiosa`, `intriga`, `epica` o `""`.

## Cómo se cuenta

- Siempre se ve lo que dice la voz, al decirlo. Una escena cada 3-5 s y el texto muy corto: 2-5 palabras.
- Los subtítulos van hacia y=1340 de 1920: el texto va `arriba` o `centro`, y lo importante no debe quedar detrás. Evita más de 2 figuras y 2 banderas juntas si hay subtexto.
- La cámara apunta justo a `lon`, `lat`.
- En temas disputados, cuenta cada postura con neutralidad y separa lo comprobado de lo supuesto. Los escenarios hipotéticos se dicen como tales, en la voz y en pantalla. No uses la fábrica para hacer pasar por real algo falso.

## Órdenes

`comprobar`, `instalar`, `abrir [nuevo]`, `parar`, `pedido`, `nuevo`, `carpeta`, `guion`, `voz`, `esperar-voz`, `palabras`, `texto`, `montar`, `fotos`, `render`.
