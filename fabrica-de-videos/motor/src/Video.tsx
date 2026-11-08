import React from "react";
import { AbsoluteFill, Audio, cancelRender, continueRender, delayRender, Sequence, useCurrentFrame } from "remotion";
import "./fuentes";
import { aPantalla, camara, merc, tramosDe } from "./camara";
import { Papel, Paises, Satelite, Tintes } from "./Mapa";
import { Anio, Bandera, Cartela, EnPantalla, lin, Marcador, Rotulo, salto, suave, vis } from "./Piezas";
import { DibujoFigura, OjosBandera, PaisViajero, RutaDibujada } from "./Extras";
import { agrupar, Subtitulos } from "./Subtitulos";
import { duracionDe, Escena, FPS, PaisResaltado, PropsVideo, TipoMapa } from "./tipos";

const ESCENA_VACIA: Escena = {
  id: "vacia", inicio: 0, lon: 0, lat: 5, zoom: 3.1, movimiento: "acercar", mapa: "satelite", paises: [], texto: "", subtexto: "",
  tipoTexto: "cartela", colorTexto: "#ffc531", posTexto: "arriba", banderas: [], marcador: false,
};

const FUNDIDO_MAPA = 0.7;
const esPapel = (m: TipoMapa) => (m === "papel" ? 1 : 0);
const esSepia = (m: TipoMapa) => (m === "sepia" || m === "papel" ? 1 : 0);

// si la cámara no viaja, el texto entra enseguida; si viaja, espera a que llegue
const retraso = (lista: Escena[], k: number) => {
  if (k === 0) return 0.1;
  return lista[k - 1].lon === lista[k].lon && lista[k - 1].lat === lista[k].lat ? 0.12 : 0.45;
};
const tienePais = (x: Escena | undefined, p: PaisResaltado) => !!x && x.paises.some((q) => q.iso === p.iso && q.color === p.color);

let paisesCache: Paises | null = null;

export const Video: React.FC<PropsVideo> = ({ proyecto, base }) => {
  const [paises, setPaises] = React.useState<Paises | null>(paisesCache);
  const [espera] = React.useState(() => delayRender("letras y países"));
  React.useEffect(() => {
    const carga = paisesCache ? Promise.resolve(paisesCache) : fetch(`${base}/datos/paises.json`).then((r) => r.json() as Promise<Paises>);
    Promise.all([carga, document.fonts.load("800 60px Poppins", "ÁÑ"), document.fonts.load("800 60px 'Playfair Display'", "1659")])
      .then(([p]) => {
        paisesCache = p;
        setPaises(p);
        continueRender(espera);
      })
      .catch((e) => cancelRender(e));
  }, [base, espera]);

  const frame = useCurrentFrame();
  const t = frame / FPS;
  const dur = duracionDe(proyecto);

  const escenas = React.useMemo(() => {
    const lista = [...proyecto.escenas].sort((a, b) => a.inicio - b.inicio);
    return lista.length ? lista : [ESCENA_VACIA];
  }, [proyecto.escenas]);
  const tramos = React.useMemo(() => tramosDe(escenas, dur), [escenas, dur]);
  const grupos = React.useMemo(() => agrupar(proyecto.palabras, proyecto.subtitulos.porGrupo), [proyecto.palabras, proyecto.subtitulos.porGrupo]);

  const c = camara(t, tramos);
  let i = 0;
  escenas.forEach((e, k) => {
    if (k === 0 || t >= e.inicio) i = k;
  });
  const e = escenas[i];
  const inicio = i === 0 ? 0 : e.inicio;
  const fin = i + 1 < escenas.length ? escenas[i + 1].inicio : dur;
  const anterior = escenas[i - 1];

  const u = anterior ? suave(lin(t, inicio, inicio + FUNDIDO_MAPA)) : 1;
  const papel = anterior ? esPapel(anterior.mapa) * (1 - u) + esPapel(e.mapa) * u : esPapel(e.mapa);
  const sepia = anterior ? esSepia(anterior.mapa) * (1 - u) + esSepia(e.mapa) * u : esSepia(e.mapa);

  const siguiente = escenas[i + 1];
  const entra = inicio + retraso(escenas, i);
  const o = vis(t, entra, fin, 0.16);
  const s = salto(t, entra);
  // cada país se enciende y se apaga por su cuenta: si sigue en la escena de al lado, no parpadea
  const tinte = (p: PaisResaltado) => (tienePais(anterior, p) ? 1 : suave(lin(t, inicio + 0.15, inicio + 0.4))) * (tienePais(siguiente, p) ? 1 : 1 - suave(lin(t, fin - 0.25, fin)));
  const objetivo = aPantalla(c, merc(e.lon, e.lat));
  const hayMusica = proyecto.musica.archivo;
  const carpeta = `${base}/proyectos/${proyecto.id}`;
  const ultimoFotograma = Math.round(dur * FPS);
  const volMusica = (f: number) => proyecto.musica.volumen * (1 - suave(lin(f, ultimoFotograma - 45, ultimoFotograma)));

  return (
    <AbsoluteFill style={{ backgroundColor: "#0b1a2a", overflow: "hidden" }}>
      <Satelite c={c} sepia={sepia} base={base} />
      {paises ? <Papel c={c} opacidad={papel} paises={paises} base={base} /> : null}
      {paises ? e.paises.map((p) => <Tintes key={p.iso} c={c} f={tinte(p)} lista={[p]} paises={paises} enPapel={papel} />) : null}

      {paises
        ? e.paises.filter((p) => p.rotulo && paises[p.iso]).map((p) => {
            const [x, y] = aPantalla(c, merc(paises[p.iso].c[0], paises[p.iso].c[1]));
            return (
              <EnPantalla key={p.iso} x={x} y={y} o={tinte(p)} s={tienePais(anterior, p) ? 1 : s}>
                <Rotulo texto={paises[p.iso].n.toUpperCase()} tam={56} color={papel > 0.5 ? "#2d1c0d" : "#fff"} serif={papel > 0.5} />
              </EnPantalla>
            );
          })
        : null}

      {e.marcador ? (
        <EnPantalla x={objetivo[0]} y={objetivo[1]} o={o}>
          <Marcador t={t} color={e.colorTexto} />
        </EnPantalla>
      ) : null}

      {paises ? (e.comparar || []).map((x, k) => <PaisViajero key={k} comp={x} c={c} t={t} a={entra + k * 0.35} paises={paises} o={o} />) : null}
      {e.linea ? <RutaDibujada ruta={e.linea} c={c} t={t} a={0} b={1} o={1} fija /> : null}
      {e.ruta ? <RutaDibujada ruta={e.ruta} c={c} t={t} a={entra} b={inicio + (fin - inicio) * 0.82} o={o} /> : null}

      {/* texto, banderas y personajes de la escena */}
      {o > 0.001 && (e.texto || e.banderas.length || e.figuras?.length) ? (
        <div style={{ position: "absolute", left: 40, width: 970, top: e.posTexto === "arriba" ? 230 : 690, display: "flex", flexDirection: "column", alignItems: "center", gap: 34, opacity: o, transform: `scale(${s})` }}>
          {e.texto && e.tipoTexto === "cartela" ? <Cartela texto={e.texto} sub={e.subtexto} color={e.colorTexto} papel={papel > 0.5} /> : null}
          {e.texto && e.tipoTexto === "anio" ? <Anio texto={e.texto} sub={e.subtexto} color={e.colorTexto} /> : null}
          {e.texto && e.tipoTexto === "rotulo" ? <Rotulo texto={e.texto} tam={92} color={e.colorTexto} serif={papel > 0.5} /> : null}
          {e.banderas.length ? (
            <div style={{ display: "flex", gap: 30, justifyContent: "center", flexWrap: "wrap" }}>
              {e.banderas.map((b) => {
                const ancho = e.banderas.length > 2 ? 190 : 260;
                return (
                  <div key={b} style={{ position: "relative" }}>
                    <Bandera a2={b} base={base} ondea={t} ancho={ancho} />
                    {e.ojos ? <OjosBandera ancho={ancho} t={t} /> : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          {e.figuras?.length ? (
            <div style={{ display: "flex", gap: 24, justifyContent: "center", alignItems: "flex-end" }}>
              {e.figuras.map((f, k) => <DibujoFigura key={`${f}${k}`} tipo={f} t={t + k * 0.7} tam={e.figuras!.length > 2 ? 150 : 210} />)}
            </div>
          ) : null}
        </div>
      ) : null}

      <Subtitulos t={t} grupos={grupos} estilo={proyecto.subtitulos} />

      {proyecto.voz ? <Audio src={`${carpeta}/${proyecto.voz}`} /> : null}
      {hayMusica ? <Audio src={hayMusica.startsWith("biblioteca:") ? `${base}/datos/musica/${hayMusica.slice(11)}` : `${carpeta}/${hayMusica}`} volume={volMusica} loop /> : null}
      {proyecto.efectos
        ? escenas.map((x, k) => (
            <React.Fragment key={x.id}>
              {k > 0 && (escenas[k - 1].lon !== x.lon || escenas[k - 1].lat !== x.lat) ? (
                <Sequence from={Math.round(x.inicio * FPS)} durationInFrames={36}>
                  <Audio src={`${base}/datos/sfx/whoosh.mp3`} volume={0.35} />
                </Sequence>
              ) : null}
              {x.texto ? (
                <Sequence from={Math.round(((k === 0 ? 0 : x.inicio) + retraso(escenas, k)) * FPS)} durationInFrames={15}>
                  <Audio src={`${base}/datos/sfx/${x.tipoTexto === "anio" ? "golpe" : "pop"}.mp3`} volume={x.tipoTexto === "anio" ? 0.35 : 0.22} />
                </Sequence>
              ) : null}
            </React.Fragment>
          ))
        : null}
    </AbsoluteFill>
  );
};
