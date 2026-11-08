import React from "react";
import { createRoot } from "react-dom/client";
import { Player, PlayerRef } from "@remotion/player";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@fontsource/poppins/400.css";
import "./estilos.css";
import { Video } from "../src/Video";
import { duracionDe, Escena, Figura, fotogramasDe, FPS, PaisResaltado, Proyecto, TipoMapa } from "../src/tipos";

type Resumen = { id: string; titulo: string; escenas: number; voz: boolean; duracion: number; video?: string };
type Pais = { iso: string; n: string; a2: string };
type Trabajo = { id: string; estado: string; fase: string; avance: number; error: string | null; resultado: any };
type Lugar = { nombre: string; lat: number; lon: number; caja: number[] };

const FIGURAS: Figura[] = ["persona", "rey", "reina", "soldado", "explorador", "barco", "avion", "castillo"];
const COLORES = ["#e8352b", "#2b6be8", "#2fae66", "#ffc531", "#a64bd6", "#ff8a2b"];
const NOMBRE_MAPA: Record<TipoMapa, string> = { satelite: "Satélite", papel: "Papel antiguo", sepia: "Satélite sepia" };
const EDITABLES = ["titulo", "guion", "descripcion", "idioma", "duracionManual", "musica", "efectos", "subtitulos", "escenas"] as const;
const ZOOM_MAPA_A_VIDEO = 2; // el mapa pequeño mide 1/4 del vídeo: son 2 niveles de zoom

const api = async (ruta: string, opciones?: RequestInit) => {
  const r = await fetch(ruta, opciones);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Algo ha fallado");
  return d;
};
const conJson = (metodo: string, cuerpo: unknown): RequestInit => ({ method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
const reloj = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const idNuevo = () => Math.random().toString(16).slice(2, 10);
const esperarTrabajo = async (id: string, alCambiar: (t: Trabajo) => void): Promise<Trabajo> => {
  for (;;) {
    const t: Trabajo = await api(`/api/trabajos/${id}`);
    alCambiar(t);
    if (t.estado === "listo") return t;
    if (t.estado === "error") throw new Error(t.error || "Algo ha fallado");
    await new Promise((r) => setTimeout(r, 700));
  }
};

const Aviso: React.FC<{ texto: string | null; cerrar: () => void }> = ({ texto, cerrar }) => {
  React.useEffect(() => {
    if (!texto) return;
    const h = setTimeout(cerrar, 7000);
    return () => clearTimeout(h);
  }, [texto, cerrar]);
  return texto ? <div className="aviso" role="alert" onClick={cerrar}>{texto}</div> : null;
};

// ---------------------------------------------------------------- inicio
const Inicio: React.FC<{ abrir: (id: string) => void }> = ({ abrir }) => {
  const [lista, setLista] = React.useState<Resumen[] | null>(null);
  const [titulo, setTitulo] = React.useState("");
  const [aviso, setAviso] = React.useState<string | null>(null);
  const cargar = () => api("/api/proyectos").then(setLista).catch((e) => setAviso(e.message));
  React.useEffect(() => void cargar(), []);
  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const p = await api("/api/proyectos", conJson("POST", { titulo }));
      abrir(p.id);
    } catch (err: any) {
      setAviso(err.message);
    }
  };
  const borrar = async (ev: React.MouseEvent, r: Resumen) => {
    ev.stopPropagation();
    if (!window.confirm(`¿Quitar «${r.titulo}»? Se guardará en la carpeta «papelera».`)) return;
    await api(`/api/proyectos/${r.id}`, { method: "DELETE" }).catch((e) => setAviso(e.message));
    cargar();
  };
  return (
    <div className="inicio">
      <section className="heroe">
        <div className="mosaico" aria-hidden>
          {[2, 3, 4].flatMap((y) => [0, 1, 2, 3, 4, 5, 6, 7].map((x) => <img key={`${x}-${y}`} src={`/t/3/${x}/${y}.jpg`} alt="" />))}
        </div>
        <div className="velo" />
        <div className="contenido">
          <h1>Fábrica de Videos</h1>
          <p>Pídele el video a Claude con tu idea y tu voz, o móntalo tú mismo aquí: escenas, mapas, rutas, música y subtítulos.</p>
          <p style={{ margin: "0 0 14px" }}><a className="btn oro" style={{ textDecoration: "none", display: "inline-block" }} href="/nuevo">Video nuevo con Claude</a></p>
          <form className="nuevo" onSubmit={crear}>
            <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="O escribe un título y móntalo tú…" aria-label="Título del video nuevo" maxLength={120} />
            <button className="btn fuerte">Montarlo yo</button>
          </form>
        </div>
      </section>
      <section className="seccion">
        <div className="cabeza">
          <h2>Mis videos</h2>
          <button className="btn" onClick={() => api("/api/abrir-videos", { method: "POST" })}>Abrir carpeta de videos</button>
        </div>
        {lista && !lista.length ? <div className="vacio">Aún no tienes videos. Escribe un título arriba para empezar.</div> : null}
        <div className="tarjetas">
          {(lista || []).map((r) => (
            <div key={r.id} className="tarjeta" role="button" tabIndex={0} onClick={() => abrir(r.id)} onKeyDown={(e) => e.key === "Enter" && abrir(r.id)}>
              <b>{r.titulo}</b>
              <button className="borrar" title="Quitar" aria-label={`Quitar ${r.titulo}`} onClick={(e) => borrar(e, r)}>×</button>
              <div className="datos">
                {r.escenas} {r.escenas === 1 ? "escena" : "escenas"} · {reloj(r.duracion)} {r.voz ? "· con voz" : "· sin voz"}
                {r.video ? <div className="hecho">Video creado</div> : null}
              </div>
            </div>
          ))}
        </div>
      </section>
      <Aviso texto={aviso} cerrar={() => setAviso(null)} />
    </div>
  );
};

// ---------------------------------------------------------------- mapa para encuadrar
const MapaEncuadre: React.FC<{ escena: Escena; alMover: (v: { lon: number; lat: number; zoom: number }) => void; caja: number[] | null }> = ({ escena, alMover, caja }) => {
  const el = React.useRef<HTMLDivElement>(null);
  const mapa = React.useRef<L.Map | null>(null);
  const actual = React.useRef(escena);
  const mover = React.useRef(alMover);
  actual.current = escena;
  mover.current = alMover;

  React.useEffect(() => {
    const m = L.map(el.current!, { zoomSnap: 0.25, zoomDelta: 0.5, wheelPxPerZoomLevel: 140, minZoom: 0, maxZoom: 13, zoomControl: true });
    L.tileLayer("/t/{z}/{x}/{y}.jpg", { maxNativeZoom: 13, minNativeZoom: 0, attribution: "Sentinel-2 cloudless by EOX" }).addTo(m);
    m.setView([actual.current.lat, actual.current.lon], actual.current.zoom - ZOOM_MAPA_A_VIDEO, { animate: false });
    m.on("moveend", () => {
      const c = m.getCenter();
      const v = { lon: +c.lng.toFixed(5), lat: +c.lat.toFixed(5), zoom: +(m.getZoom() + ZOOM_MAPA_A_VIDEO).toFixed(2) };
      const e = actual.current;
      if (Math.abs(v.lon - e.lon) > 1e-4 || Math.abs(v.lat - e.lat) > 1e-4 || Math.abs(v.zoom - e.zoom) > 0.01) mover.current(v);
    });
    mapa.current = m;
    return () => {
      m.remove();
    };
  }, []);

  React.useEffect(() => {
    mapa.current?.setView([escena.lat, escena.lon], escena.zoom - ZOOM_MAPA_A_VIDEO, { animate: false });
  }, [escena.id]);

  React.useEffect(() => {
    if (caja) mapa.current?.fitBounds([[caja[0], caja[2]], [caja[1], caja[3]]], { maxZoom: 11, animate: false, padding: [20, 20] });
  }, [caja]);

  return (
    <div className="lienzo">
      <div className="mapa" ref={el} />
      <div className="mira" />
    </div>
  );
};

const Buscador: React.FC<{ elegir: (l: Lugar) => void }> = ({ elegir }) => {
  const [q, setQ] = React.useState("");
  const [res, setRes] = React.useState<Lugar[] | null>(null);
  const [error, setError] = React.useState("");
  const [buscando, setBuscando] = React.useState(false);
  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setBuscando(true);
    setError("");
    try {
      setRes(await api(`/api/buscar?q=${encodeURIComponent(q)}`));
    } catch (err: any) {
      setError(err.message);
      setRes(null);
    }
    setBuscando(false);
  };
  return (
    <form onSubmit={buscar} style={{ marginBottom: 12 }}>
      <div className="fila">
        <input className="crece" type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca un lugar: Chile, río Nilo, Isla de Pascua…" aria-label="Buscar un lugar" />
        <button className="btn" disabled={buscando}>{buscando ? "…" : "Ir"}</button>
      </div>
      {error ? <div className="ayuda" style={{ color: "#ff9d87", marginTop: 4 }}>{error}</div> : null}
      {res && !res.length ? <div className="ayuda" style={{ marginTop: 4 }}>No he encontrado ese lugar. Prueba con otro nombre o muévete por el mapa.</div> : null}
      {res && res.length ? (
        <div className="resultados">
          {res.map((l, i) => <button type="button" key={i} onClick={() => { elegir(l); setRes(null); }}>{l.nombre}</button>)}
        </div>
      ) : null}
    </form>
  );
};

const Segmentos = <T extends string>({ valor, opciones, cambiar }: { valor: T; opciones: [T, string][]; cambiar: (v: T) => void }) => (
  <div className="segmentos">
    {opciones.map(([v, t]) => <button type="button" key={v} className={v === valor ? "on" : ""} aria-pressed={v === valor} onClick={() => cambiar(v)}>{t}</button>)}
  </div>
);

// ---------------------------------------------------------------- una escena
const EditorEscena: React.FC<{
  e: Escena; primera: boolean; paises: Pais[]; dur: number;
  cambiar: (c: Partial<Escena>) => void; duplicar: () => void; quitar: (() => void) | null;
}> = ({ e, primera, paises, dur, cambiar, duplicar, quitar }) => {
  const [caja, setCaja] = React.useState<number[] | null>(null);
  const [resaltar, setResaltar] = React.useState("");
  const [bandera, setBandera] = React.useState("");
  const buscarPais = (nombre: string) => paises.find((p) => p.n.toLowerCase() === nombre.trim().toLowerCase());
  const nombreDe = (iso: string) => paises.find((p) => p.iso === iso)?.n || iso;
  const ponPais = (v: string) => {
    setResaltar(v);
    const p = buscarPais(v);
    if (p && !e.paises.some((x) => x.iso === p.iso)) {
      cambiar({ paises: [...e.paises, { iso: p.iso, color: COLORES[e.paises.length % COLORES.length], rotulo: false }] });
      setResaltar("");
    }
  };
  const ponBandera = (v: string) => {
    setBandera(v);
    const p = buscarPais(v);
    if (p?.a2 && !e.banderas.includes(p.a2)) {
      cambiar({ banderas: [...e.banderas, p.a2] });
      setBandera("");
    }
  };
  const cambiarPais = (iso: string, c: Partial<PaisResaltado>) => cambiar({ paises: e.paises.map((x) => (x.iso === iso ? { ...x, ...c } : x)) });
  return (
    <div className="escena">
      <div>
        <MapaEncuadre escena={e} caja={caja} alMover={(v) => cambiar(v)} />
        <div className="ayuda" style={{ marginTop: 6, maxWidth: 270 }}>Mueve y haz zoom: este encuadre es lo que se verá en la escena.</div>
      </div>
      <div className="form">
        <Buscador elegir={(l) => setCaja([...l.caja])} />
        <div className="dos">
          <label className="campo"><span>Empieza en (segundos)</span>
            <input type="number" min={0} max={dur} step={0.1} disabled={primera} value={primera ? 0 : e.inicio} onChange={(ev) => cambiar({ inicio: Math.max(0, +ev.target.value || 0) })} />
          </label>
          <label className="campo"><span>Cámara</span>
            <select value={e.movimiento} onChange={(ev) => cambiar({ movimiento: ev.target.value as Escena["movimiento"] })}>
              <option value="acercar">Se acerca</option><option value="alejar">Se aleja</option><option value="quieto">Quieta</option>
            </select>
          </label>
        </div>
        <div className="rotulo">Tipo de mapa</div>
        <div style={{ marginBottom: 12 }}><Segmentos<TipoMapa> valor={e.mapa} opciones={[["satelite", "Satélite"], ["sepia", "Sepia"], ["papel", "Papel antiguo"]]} cambiar={(mapa) => cambiar({ mapa })} /></div>

        <label className="campo"><span>Texto en pantalla</span>
          <input type="text" value={e.texto} maxLength={70} onChange={(ev) => cambiar({ texto: ev.target.value })} placeholder="Ej.: LA ISLA MÁS LEJANA" />
        </label>
        <label className="campo"><span>Texto pequeño (opcional)</span>
          <input type="text" value={e.subtexto} maxLength={70} onChange={(ev) => cambiar({ subtexto: ev.target.value })} placeholder="Ej.: 3.700 km de la costa" />
        </label>
        <div className="dos">
          <div><div className="rotulo">Estilo del texto</div><Segmentos valor={e.tipoTexto} opciones={[["cartela", "Cartel"], ["anio", "Fecha"], ["rotulo", "Rótulo"]]} cambiar={(tipoTexto) => cambiar({ tipoTexto })} /></div>
          <div><div className="rotulo">Posición</div><Segmentos valor={e.posTexto} opciones={[["arriba", "Arriba"], ["centro", "Centro"]]} cambiar={(posTexto) => cambiar({ posTexto })} /></div>
        </div>
        <div className="fila" style={{ margin: "12px 0" }}>
          <input type="color" value={e.colorTexto} onChange={(ev) => cambiar({ colorTexto: ev.target.value })} aria-label="Color del texto" />
          <span className="ayuda crece">Color del texto y del marcador</span>
          <label className="check" style={{ margin: 0 }}><input type="checkbox" checked={e.marcador} onChange={(ev) => cambiar({ marcador: ev.target.checked })} /> Marcador</label>
        </div>

        <label className="campo"><span>Resaltar países</span>
          <input type="text" list="lista-paises" value={resaltar} onChange={(ev) => ponPais(ev.target.value)} placeholder="Escribe un país…" />
          <div className="chips">
            {e.paises.map((x) => (
              <span className="chip" key={x.iso}>
                <input type="color" value={x.color} onChange={(ev) => cambiarPais(x.iso, { color: ev.target.value })} aria-label={`Color de ${nombreDe(x.iso)}`} />
                {nombreDe(x.iso)}
                <button type="button" className={`rot${x.rotulo ? " on" : ""}`} title="Escribir el nombre sobre el mapa" aria-pressed={x.rotulo} onClick={() => cambiarPais(x.iso, { rotulo: !x.rotulo })}>nombre</button>
                <button type="button" className="x" aria-label={`Quitar ${nombreDe(x.iso)}`} onClick={() => cambiar({ paises: e.paises.filter((y) => y.iso !== x.iso) })}>×</button>
              </span>
            ))}
          </div>
        </label>
        <label className="campo"><span>Banderas</span>
          <input type="text" list="lista-paises" value={bandera} onChange={(ev) => ponBandera(ev.target.value)} placeholder="Escribe un país…" />
          <div className="chips">
            {e.banderas.map((b) => (
              <span className="chip" key={b}>
                <img src={`/datos/banderas/${b}.svg`} alt="" />{paises.find((p) => p.a2 === b)?.n || b}
                <button type="button" className="x" aria-label="Quitar bandera" onClick={() => cambiar({ banderas: e.banderas.filter((y) => y !== b) })}>×</button>
              </span>
            ))}
          </div>
        </label>
        <label className="check"><input type="checkbox" checked={!!e.ojos} onChange={(ev) => cambiar({ ojos: ev.target.checked })} /> Banderas con ojos</label>
        <div className="rotulo">Personajes y objetos</div>
        <div className="chips" style={{ marginBottom: 12 }}>
          {FIGURAS.map((f) => {
            const puesta = (e.figuras || []).includes(f);
            return <button type="button" key={f} className={`btn chico${puesta ? " oro" : ""}`} aria-pressed={puesta} onClick={() => cambiar({ figuras: puesta ? (e.figuras || []).filter((x) => x !== f) : [...(e.figuras || []), f] })}>{f}</button>;
          })}
        </div>
        <div className="fila">
          <button type="button" className="btn chico" onClick={duplicar}>Duplicar escena</button>
          {quitar ? <button type="button" className="btn chico peligro" onClick={quitar}>Quitar escena</button> : null}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- panel izquierdo
const PanelVoz: React.FC<{ p: Proyecto; cambiar: (c: Partial<Proyecto>) => void; recargar: () => Promise<void>; ahora: number; escena: Escena | undefined; alPalabra: (s: number) => void; avisar: (t: string) => void }> = ({ p, cambiar, recargar, ahora, escena, alPalabra, avisar }) => {
  const [trabajo, setTrabajo] = React.useState<Trabajo | null>(null);
  const [editando, setEditando] = React.useState<string | null>(null);
  const subir = async (f: File | undefined) => {
    if (!f) return;
    try {
      const t = await api(`/api/proyectos/${p.id}/voz?nombre=${encodeURIComponent(f.name)}`, { method: "POST", body: f });
      setTrabajo(t);
      await esperarTrabajo(t.id, setTrabajo);
      await recargar();
    } catch (e: any) {
      avisar(e.message);
    }
    setTrabajo(null);
  };
  const guardarTexto = async () => {
    try {
      await api(`/api/proyectos/${p.id}/texto`, conJson("POST", { texto: editando }));
      await recargar();
      setEditando(null);
    } catch (e: any) {
      avisar(e.message);
    }
  };
  const copiar = () => navigator.clipboard.writeText(p.guion).catch(() => avisar("No se pudo copiar. Selecciona el texto a mano."));
  return (
    <>
      <label className="campo"><span>Guion (para ti: no sale en el video)</span>
        <textarea rows={5} value={p.guion} onChange={(e) => cambiar({ guion: e.target.value })} placeholder="Escribe aquí lo que vas a contar. Cópialo a tu web de voz o léelo tú." />
      </label>
      <button className="btn chico" onClick={copiar} disabled={!p.guion} style={{ marginBottom: 14 }}>Copiar guion</button>
      <label className="campo"><span>Idioma de la voz</span>
        <select value={p.idioma} onChange={(e) => cambiar({ idioma: e.target.value })}>
          <option value="es">Español</option><option value="en">Inglés</option><option value="pt">Portugués</option><option value="fr">Francés</option><option value="it">Italiano</option><option value="de">Alemán</option>
        </select>
      </label>
      {trabajo ? (
        <div className="caja-subir" style={{ cursor: "default" }}>
          <div className="ayuda">{trabajo.fase}</div>
          <div className="barra-avance"><i style={{ width: `${Math.round(trabajo.avance * 100)}%` }} /></div>
        </div>
      ) : (
        <label className="caja-subir">
          <input type="file" accept=".mp3,.wav,.m4a,.ogg,.opus,.aac,.flac,audio/*" onChange={(e) => subir(e.target.files?.[0])} />
          <b>{p.voz ? "Cambiar la voz" : "Sube tu voz"}</b>
          <div className="ayuda">{p.voz ? `Voz actual: ${reloj(p.duracionVoz || 0)}` : "MP3, WAV o M4A. Se generan los subtítulos solos."}</div>
        </label>
      )}
      {!p.voz ? (
        <label className="campo"><span>Duración sin voz (segundos)</span>
          <input type="number" min={2} max={600} value={p.duracionManual} onChange={(e) => cambiar({ duracionManual: Math.min(600, Math.max(2, +e.target.value || 2)) })} />
        </label>
      ) : null}
      {p.palabras.length ? (
        editando === null ? (
          <>
            <div className="fila" style={{ marginBottom: 5 }}>
              <span className="rotulo crece" style={{ margin: 0 }}>Palabras</span>
              <button className="btn chico" onClick={() => setEditando(p.palabras.map((x) => x.w).join(" "))}>Corregir texto</button>
            </div>
            <div className="palabras">
              {p.palabras.map((w, i) => (
                <button key={i} title={`${w.a.toFixed(1)} s`} className={`${ahora >= w.a && ahora < w.b ? "ahora" : ""} ${p.escenas.some((s) => Math.abs(s.inicio - w.a) < 0.02) ? "inicio-escena" : ""}`} onClick={() => alPalabra(w.a)}>{w.w}</button>
              ))}
            </div>
            <div className="ayuda" style={{ marginTop: 6 }}>{escena ? "Pulsa una palabra para que la escena elegida empiece justo ahí." : ""}</div>
          </>
        ) : (
          <>
            <label className="campo"><span>Corrige lo que se oyó mal (los tiempos se conservan)</span>
              <textarea rows={8} value={editando} onChange={(e) => setEditando(e.target.value)} />
            </label>
            <div className="fila">
              <button className="btn chico oro" onClick={guardarTexto}>Guardar</button>
              <button className="btn chico" onClick={() => setEditando(null)}>Cancelar</button>
            </div>
          </>
        )
      ) : null}
    </>
  );
};

const PanelEstilo: React.FC<{ p: Proyecto; cambiar: (c: Partial<Proyecto>) => void; avisar: (t: string) => void }> = ({ p, cambiar, avisar }) => {
  const [musicas, setMusicas] = React.useState<{ id: string; nombre: string }[]>([]);
  const audio = React.useRef<HTMLAudioElement | null>(null);
  const [sonando, setSonando] = React.useState(false);
  React.useEffect(() => {
    api("/api/musicas").then(setMusicas).catch(() => {});
    return () => audio.current?.pause();
  }, []);
  const s = p.subtitulos;
  const cs = (c: Partial<Proyecto["subtitulos"]>) => cambiar({ subtitulos: { ...s, ...c } });
  const subir = async (f: File | undefined) => {
    if (!f) return;
    try {
      const r = await api(`/api/proyectos/${p.id}/musica?nombre=${encodeURIComponent(f.name)}`, { method: "POST", body: f });
      cambiar({ musica: { ...p.musica, archivo: r.archivo } });
    } catch (e: any) {
      avisar(e.message);
    }
  };
  const propia = p.musica.archivo && !p.musica.archivo.startsWith("biblioteca:");
  const escuchar = () => {
    if (sonando) {
      audio.current?.pause();
      setSonando(false);
      return;
    }
    const a = p.musica.archivo!;
    audio.current = new Audio(a.startsWith("biblioteca:") ? `/datos/musica/${a.slice(11)}` : `/proyectos/${p.id}/${a}`);
    audio.current.volume = 0.6;
    audio.current.onended = () => setSonando(false);
    audio.current.play().then(() => setSonando(true)).catch(() => avisar("No se pudo reproducir esa música."));
  };
  return (
    <>
      <label className="campo"><span>Música</span>
        <div className="fila">
          <select className="crece" value={p.musica.archivo || ""} onChange={(e) => { audio.current?.pause(); setSonando(false); cambiar({ musica: { ...p.musica, archivo: e.target.value || null } }); }}>
            <option value="">Sin música</option>
            {musicas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            {propia ? <option value={p.musica.archivo!}>Mi música</option> : null}
          </select>
          <button type="button" className="btn" disabled={!p.musica.archivo} onClick={escuchar}>{sonando ? "Parar" : "Oír"}</button>
        </div>
      </label>
      <label className="caja-subir">
        <input type="file" accept=".mp3,.wav,.m4a,.ogg,.flac,audio/*" onChange={(e) => subir(e.target.files?.[0])} />
        <b>Subir mi propia música</b>
        <div className="ayuda">Asegúrate de tener permiso para usarla en tus videos.</div>
      </label>
      <label className="campo"><span>Volumen de la música: {Math.round(p.musica.volumen * 100)}%</span>
        <input type="range" min={0} max={1} step={0.01} value={p.musica.volumen} onChange={(e) => cambiar({ musica: { ...p.musica, volumen: +e.target.value } })} />
      </label>
      <label className="check"><input type="checkbox" checked={p.efectos} onChange={(e) => cambiar({ efectos: e.target.checked })} /> Efectos de sonido en los cambios de escena</label>
      <hr style={{ border: 0, borderTop: "1px solid var(--linea)", margin: "16px 0" }} />
      <label className="check"><input type="checkbox" checked={s.mostrar} onChange={(e) => cs({ mostrar: e.target.checked })} /> Mostrar subtítulos</label>
      <div className="fila" style={{ marginBottom: 12 }}>
        <input type="color" value={s.color} onChange={(e) => cs({ color: e.target.value })} aria-label="Color de la palabra activa" />
        <span className="ayuda crece">Color de la palabra que se está diciendo</span>
      </div>
      <label className="campo"><span>Letra</span>
        <select value={s.fuente} onChange={(e) => cs({ fuente: e.target.value as Proyecto["subtitulos"]["fuente"] })}><option value="Poppins">Poppins</option><option value="Playfair Display">Playfair Display</option></select>
      </label>
      <label className="campo"><span>Tamaño: {s.tam}</span><input type="range" min={40} max={100} value={s.tam} onChange={(e) => cs({ tam: +e.target.value })} /></label>
      <label className="campo"><span>Altura en pantalla: {s.y}</span><input type="range" min={900} max={1560} step={10} value={s.y} onChange={(e) => cs({ y: +e.target.value })} /></label>
      <label className="campo"><span>Palabras a la vez: {s.porGrupo}</span><input type="range" min={1} max={7} value={s.porGrupo} onChange={(e) => cs({ porGrupo: +e.target.value })} /></label>
    </>
  );
};

// ---------------------------------------------------------------- editor
const Editor: React.FC<{ id: string; salir: () => void }> = ({ id, salir }) => {
  const [p, setP] = React.useState<Proyecto | null>(null);
  const [paises, setPaises] = React.useState<Pais[]>([]);
  const [sel, setSel] = React.useState<string | null>(null);
  const [pestana, setPestana] = React.useState<"voz" | "estilo" | "publicar">("voz");
  const [ahora, setAhora] = React.useState(0);
  const [guardado, setGuardado] = React.useState(true);
  const [aviso, setAviso] = React.useState<string | null>(null);
  const [render, setRender] = React.useState<Trabajo | null>(null);
  const [final, setFinal] = React.useState<{ video: string; descripcion: string } | null>(null);
  const player = React.useRef<PlayerRef>(null);
  const espera = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimo = React.useRef<Proyecto | null>(null);

  const guardarYa = React.useCallback(async () => {
    if (espera.current) clearTimeout(espera.current);
    espera.current = null;
    const actual = ultimo.current;
    if (!actual) return;
    const cuerpo = Object.fromEntries(EDITABLES.map((k) => [k, actual[k]]));
    await api(`/api/proyectos/${actual.id}`, conJson("PUT", cuerpo));
    if (ultimo.current === actual) setGuardado(true);
  }, []);

  const cambiar = React.useCallback((c: Partial<Proyecto>) => {
    setP((v) => {
      const n = { ...v!, ...c };
      ultimo.current = n;
      return n;
    });
    setGuardado(false);
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(() => guardarYa().catch((e) => setAviso(`No se pudo guardar: ${e.message}`)), 500);
  }, [guardarYa]);

  const recargar = React.useCallback(async () => {
    const d: Proyecto = await api(`/api/proyectos/${id}`);
    setP((v) => {
      const n = v ? { ...v, voz: d.voz, duracionVoz: d.duracionVoz, palabras: d.palabras, video: d.video } : d;
      ultimo.current = n;
      return n;
    });
    setSel((s) => s ?? d.escenas[0]?.id ?? null);
  }, [id]);

  React.useEffect(() => {
    recargar().catch(() => salir());
    fetch("/datos/paises.json").then((r) => r.json()).then((d) => {
      setPaises(Object.entries<any>(d).map(([iso, x]) => ({ iso, n: x.n, a2: x.a2 })).sort((a, b) => a.n.localeCompare(b.n, "es")));
    }).catch(() => setAviso("No se pudo cargar la lista de países."));
    const alSalir = () => { if (espera.current) void guardarYa(); };
    window.addEventListener("beforeunload", alSalir);
    return () => {
      window.removeEventListener("beforeunload", alSalir);
      alSalir();
    };
  }, [recargar, salir, guardarYa]);

  const propsVideo = React.useMemo(() => (p ? { proyecto: p, base: "" } : null), [p]);

  React.useEffect(() => {
    const pl = player.current;
    if (!pl) return;
    let ult = 0;
    const f = (e: { detail: { frame: number } }) => {
      const a = performance.now();
      if (a - ult > 200) {
        ult = a;
        setAhora(e.detail.frame / FPS);
      }
    };
    pl.addEventListener("frameupdate", f);
    return () => pl.removeEventListener("frameupdate", f);
  }, [propsVideo !== null]);

  if (!p || !propsVideo) return null;

  const escenas = [...p.escenas].sort((a, b) => a.inicio - b.inicio);
  const dur = duracionDe(p);
  const e = escenas.find((x) => x.id === sel) || escenas[0];
  const primera = e?.id === escenas[0]?.id;
  const irA = (s: number) => player.current?.seekTo(Math.min(Math.round(s * FPS), fotogramasDe(p) - 1));
  const cambiarEscena = (c: Partial<Escena>) => cambiar({ escenas: p.escenas.map((x) => (x.id === e.id ? { ...x, ...c } : x)) });
  const elegir = (x: Escena) => {
    setSel(x.id);
    irA(x.inicio + 0.8);
  };
  const anadir = () => {
    let t = +Math.max(ahora, 0).toFixed(2);
    if (escenas.some((x) => Math.abs(x.inicio - t) < 0.5)) t = +(escenas[escenas.length - 1].inicio + 3).toFixed(2);
    const n: Escena = { ...e, id: idNuevo(), inicio: Math.min(t, Math.max(dur - 0.5, 0)), texto: "", subtexto: "", banderas: [], paises: [], marcador: false, figuras: [], ojos: false, comparar: [], ruta: undefined };
    cambiar({ escenas: [...p.escenas, n] });
    setSel(n.id);
  };
  const duplicar = () => {
    const sig = escenas[escenas.indexOf(e) + 1];
    const n: Escena = { ...e, id: idNuevo(), inicio: +(sig ? (e.inicio + sig.inicio) / 2 : Math.min(e.inicio + 3, dur - 0.5)).toFixed(2) };
    cambiar({ escenas: [...p.escenas, n] });
    setSel(n.id);
  };
  const quitar = () => {
    const i = escenas.indexOf(e);
    cambiar({ escenas: p.escenas.filter((x) => x.id !== e.id) });
    setSel((escenas[i + 1] || escenas[i - 1]).id);
  };
  const crear = async (borrador: boolean) => {
    try {
      await guardarYa();
      const t = await api(`/api/proyectos/${p.id}/render`, conJson("POST", { borrador }));
      setRender(t);
      const fin = await esperarTrabajo(t.id, setRender);
      setFinal(fin.resultado);
      await recargar();
    } catch (err: any) {
      setAviso(err.message);
    }
    setRender(null);
  };

  const anchoMovil = 286;
  return (
    <div className="editor">
      <datalist id="lista-paises">{paises.map((x) => <option key={x.iso} value={x.n} />)}</datalist>
      <header className="barra">
        <button className="btn" onClick={() => guardarYa().catch(() => {}).finally(salir)}>← Mis videos</button>
        <input className="titulo" type="text" value={p.titulo} onChange={(ev) => cambiar({ titulo: ev.target.value })} aria-label="Título del video" maxLength={120} />
        <span className="estado" aria-live="polite">{guardado ? "Guardado" : "Guardando…"}</span>
        <button className="btn" onClick={() => api("/api/abrir-videos", { method: "POST" })}>Carpeta de videos</button>
      </header>
      <div className="columnas">
        <aside className="col izq">
          <div className="pestanas" role="tablist">
            {([["voz", "Guion y voz"], ["estilo", "Música y estilo"], ["publicar", "Publicar"]] as const).map(([k, t]) => (
              <button key={k} role="tab" aria-selected={pestana === k} className={pestana === k ? "on" : ""} onClick={() => setPestana(k)}>{t}</button>
            ))}
          </div>
          {pestana === "voz" ? (
            <PanelVoz p={p} cambiar={cambiar} recargar={recargar} ahora={ahora} escena={e} avisar={setAviso} alPalabra={(s) => {
              irA(s);
              if (primera) setAviso("La primera escena siempre empieza en 0. Elige otra escena para moverla.");
              else cambiarEscena({ inicio: s });
            }} />
          ) : null}
          {pestana === "estilo" ? <PanelEstilo p={p} cambiar={cambiar} avisar={setAviso} /> : null}
          {pestana === "publicar" ? (
            <>
              <label className="campo"><span>Descripción para YouTube o TikTok</span>
                <textarea rows={7} value={p.descripcion} onChange={(ev) => cambiar({ descripcion: ev.target.value })} placeholder="Cuenta de qué va el video y añade tus hashtags." />
              </label>
              <div className="ayuda">Al crear el video se guarda un .txt con el título, esta descripción y los créditos obligatorios del mapa de satélite. Inclúyelos al publicar. Comprueba tú los datos antes de subirlo.</div>
            </>
          ) : null}
        </aside>

        <main className="col">
          <div className="tira" aria-label="Escenas en el tiempo">
            {escenas.map((x, i) => {
              const fin = i + 1 < escenas.length ? escenas[i + 1].inicio : dur;
              const ini = i === 0 ? 0 : x.inicio;
              return (
                <button key={x.id} className={`m-${x.mapa}${x.id === e.id ? " on" : ""}`} style={{ width: `${((fin - ini) / dur) * 100}%` }} title={`${NOMBRE_MAPA[x.mapa]} · ${reloj(ini)}`} onClick={() => elegir(x)}>
                  {x.texto || i + 1}
                </button>
              );
            })}
            <span className="cursor" style={{ left: `${Math.min(100, (ahora / dur) * 100)}%` }} />
          </div>
          <div className="tira-info">
            <span className="ayuda">{escenas.length} {escenas.length === 1 ? "escena" : "escenas"} · {reloj(dur)} en total</span>
            <button className="btn chico oro" onClick={anadir}>+ Escena en {reloj(ahora)}</button>
          </div>
          {e ? <EditorEscena key={e.id} e={e} primera={primera} paises={paises} dur={dur} cambiar={cambiarEscena} duplicar={duplicar} quitar={escenas.length > 1 ? quitar : null} /> : null}
        </main>

        <aside className="col der">
          <div className="movil">
            <div>
              <Player
                key={`${p.voz}-${p.duracionVoz}`}
                ref={player}
                component={Video}
                inputProps={propsVideo}
                durationInFrames={fotogramasDe(p)}
                compositionWidth={1080}
                compositionHeight={1920}
                fps={FPS}
                controls
                style={{ width: anchoMovil, height: (anchoMovil * 16) / 9 }}
              />
            </div>
          </div>
          <div className="acciones">
            {render ? (
              <>
                <div className="ayuda">{render.fase} · {Math.round(render.avance * 100)}%</div>
                <div className="barra-avance"><i style={{ width: `${Math.round(render.avance * 100)}%` }} /></div>
                <div className="ayuda">Puede tardar varios minutos. La primera vez descarga los mapas y el motor de video. Deja esta página abierta.</div>
              </>
            ) : (
              <>
                <button className="btn fuerte" onClick={() => crear(false)}>Crear video final</button>
                <button className="btn" onClick={() => crear(true)}>Borrador rápido</button>
                {p.video ? <div className="ayuda">Último video: {p.video}</div> : null}
              </>
            )}
          </div>
        </aside>
      </div>

      {final ? (
        <div className="capa" role="dialog" aria-modal="true">
          <div className="ventana">
            <video src={`/videos/${encodeURIComponent(final.video)}?v=${Date.now()}`} controls autoPlay />
            <div className="lado">
              <h2>¡Tu video está listo!</h2>
              <div className="ayuda">Guardado en «Videos listos» como <b>{final.video}</b></div>
              <label className="rotulo" htmlFor="texto-subir">Texto para publicar (con créditos)</label>
              <textarea id="texto-subir" readOnly value={final.descripcion} />
              <div className="fila">
                <button className="btn oro" onClick={() => api("/api/abrir-videos", { method: "POST" })}>Abrir carpeta</button>
                <button className="btn" onClick={() => setFinal(null)}>Seguir editando</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <Aviso texto={aviso} cerrar={() => setAviso(null)} />
    </div>
  );
};

// ---------------------------------------------------------------- app
const App: React.FC = () => {
  const idDe = () => decodeURIComponent(location.hash.replace(/^#\/?/, "")) || null;
  const [id, setId] = React.useState<string | null>(idDe());
  React.useEffect(() => {
    const f = () => setId(idDe());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  const salir = React.useCallback(() => { location.hash = ""; }, []);
  return id ? <Editor key={id} id={id} salir={salir} /> : <Inicio abrir={(n) => { location.hash = `#/${n}`; }} />;
};

createRoot(document.getElementById("raiz")!).render(<App />);
