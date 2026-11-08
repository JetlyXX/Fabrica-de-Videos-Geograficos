import React from "react";
import { aPantalla, Cam, H, merc, W, XY } from "./camara";
import { Paises, transformar } from "./Mapa";
import { lin, suave } from "./Piezas";
import { Comparacion, Figura, Ruta } from "./tipos";

// ---------------------------------------------------------------- personajes y objetos, dibujados aquí
const Cara: React.FC<{ t: number }> = ({ t }) => {
  const parpadeo = t % 3.1 < 0.12 ? 0.15 : 1;
  return (
    <>
      <circle cx="60" cy="50" r="30" fill="#f2c9a1" stroke="#2d1c0d" strokeWidth="4" />
      <ellipse cx="50" cy="48" rx="4.5" ry={6 * parpadeo} fill="#1b1209" />
      <ellipse cx="70" cy="48" rx="4.5" ry={6 * parpadeo} fill="#1b1209" />
      <path d="M50 63 Q60 71 70 63" fill="none" stroke="#2d1c0d" strokeWidth="3.5" strokeLinecap="round" />
    </>
  );
};

const Cuerpo: React.FC<{ color: string }> = ({ color }) => (
  <path d="M28 150 Q28 86 60 84 Q92 86 92 150 Z" fill={color} stroke="#2d1c0d" strokeWidth="4" />
);

const Corona: React.FC<{ color?: string }> = ({ color = "#ffc531" }) => (
  <path d="M36 30 L34 4 L48 18 L60 0 L72 18 L86 4 L84 30 Z" fill={color} stroke="#2d1c0d" strokeWidth="3.5" strokeLinejoin="round" />
);

const DIBUJOS: Record<Figura, (t: number) => React.ReactNode> = {
  persona: (t) => (<><Cuerpo color="#3f7fbf" /><Cara t={t} /></>),
  rey: (t) => (<><Cuerpo color="#a3201a" /><path d="M60 84 V150" stroke="#f6e7c4" strokeWidth="9" /><Cara t={t} /><Corona /></>),
  reina: (t) => (
    <>
      <path d="M22 150 Q30 90 60 84 Q90 90 98 150 Z" fill="#7a3fb0" stroke="#2d1c0d" strokeWidth="4" />
      <path d="M30 56 Q24 92 40 94 M90 56 Q96 92 80 94" stroke="#6b3a14" strokeWidth="10" fill="none" strokeLinecap="round" />
      <Cara t={t} /><Corona />
    </>
  ),
  soldado: (t) => (
    <>
      <Cuerpo color="#4c6133" />
      <path d="M32 102 L88 138 M32 138 L88 102" stroke="#2f3d1f" strokeWidth="6" />
      <Cara t={t} />
      <path d="M26 44 Q28 10 60 10 Q92 10 94 44 Z" fill="#3b4d27" stroke="#2d1c0d" strokeWidth="4" />
    </>
  ),
  explorador: (t) => (
    <>
      <Cuerpo color="#b58a4c" />
      <Cara t={t} />
      <path d="M18 32 H102" stroke="#2d1c0d" strokeWidth="11" strokeLinecap="round" />
      <path d="M18 32 H102" stroke="#8a6232" strokeWidth="5" strokeLinecap="round" />
      <path d="M36 32 Q38 6 60 6 Q82 6 84 32 Z" fill="#8a6232" stroke="#2d1c0d" strokeWidth="4" />
    </>
  ),
  barco: () => (
    <>
      <path d="M58 16 V96" stroke="#2d1c0d" strokeWidth="6" />
      <path d="M62 20 L104 86 H62 Z" fill="#f6e7c4" stroke="#2d1c0d" strokeWidth="4" strokeLinejoin="round" />
      <path d="M54 34 L22 86 H54 Z" fill="#fff8e6" stroke="#2d1c0d" strokeWidth="4" strokeLinejoin="round" />
      <path d="M10 98 H112 L94 132 H28 Z" fill="#7a4a1f" stroke="#2d1c0d" strokeWidth="4" strokeLinejoin="round" />
    </>
  ),
  avion: () => (
    <g transform="translate(60 76) rotate(90) translate(-60 -76)">
      <path d="M60 4 Q72 18 72 42 L116 86 V100 L72 82 V118 L90 132 V142 L60 132 L30 142 V132 L48 118 V82 L4 100 V86 L48 42 Q48 18 60 4 Z" fill="#f4f6f8" stroke="#22303f" strokeWidth="4" strokeLinejoin="round" />
    </g>
  ),
  castillo: () => (
    <>
      <path d="M14 150 V50 H30 V64 H44 V50 H76 V64 H90 V50 H106 V150 Z" fill="#a8a29a" stroke="#2d1c0d" strokeWidth="4" strokeLinejoin="round" />
      <path d="M46 150 V112 Q60 92 74 112 V150 Z" fill="#3a2a1a" stroke="#2d1c0d" strokeWidth="4" />
      <path d="M60 50 V14 L84 24 L60 32" fill="#e8352b" stroke="#2d1c0d" strokeWidth="3.5" strokeLinejoin="round" />
    </>
  ),
};

export const DibujoFigura: React.FC<{ tipo: Figura; tam: number; t: number; rebote?: boolean }> = ({ tipo, tam, t, rebote = true }) => (
  <svg viewBox="0 0 120 155" width={tam} height={(tam * 155) / 120} style={{ overflow: "visible", filter: "drop-shadow(0 8px 12px rgba(0,0,0,.5))", transform: rebote ? `translateY(${Math.sin(t * 3.4) * 5}px)` : undefined }}>
    {DIBUJOS[tipo]?.(t)}
  </svg>
);

export const OjosBandera: React.FC<{ ancho: number; t: number }> = ({ ancho, t }) => {
  const r = ancho * 0.1;
  const cierre = t % 2.7 < 0.11 ? 0.12 : 1;
  const mira = Math.sin(t * 1.3) * r * 0.3;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: ancho * 0.2, display: "flex", justifyContent: "center", gap: r * 0.5 }}>
      {[0, 1].map((k) => (
        <div key={k} style={{ width: r * 2, height: r * 2 * cierre, background: "#fff", borderRadius: "50%", border: `${r * 0.16}px solid #111`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <div style={{ width: r * 0.9, height: r * 0.9, background: "#111", borderRadius: "50%", transform: `translateX(${mira}px)` }} />
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- rutas sobre el mapa
const RAD = Math.PI / 180;
const aVector = ([lon, lat]: number[]) => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)];

// Con «curva», el camino más corto de verdad sobre la Tierra (círculo máximo)
const puntosRuta = (ruta: Ruta): XY[] => {
  const salida: XY[] = [];
  for (let i = 0; i + 1 < ruta.puntos.length; i++) {
    const a = ruta.puntos[i];
    const b = ruta.puntos[i + 1];
    const va = aVector(a);
    const vb = aVector(b);
    const w = Math.acos(Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2])));
    for (let k = 0; k < 64; k++) {
      const f = k / 64;
      if (ruta.curva && w > 0.001) {
        const p = [0, 1, 2].map((j) => (Math.sin((1 - f) * w) * va[j] + Math.sin(f * w) * vb[j]) / Math.sin(w));
        salida.push(merc(Math.atan2(p[1], p[0]) / RAD, Math.asin(p[2]) / RAD));
      } else {
        salida.push(merc(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f));
      }
    }
  }
  const fin = ruta.puntos[ruta.puntos.length - 1];
  salida.push(merc(fin[0], fin[1]));
  for (let i = 1; i < salida.length; i++) {
    while (salida[i][0] - salida[i - 1][0] > 0.5) salida[i] = [salida[i][0] - 1, salida[i][1]];
    while (salida[i][0] - salida[i - 1][0] < -0.5) salida[i] = [salida[i][0] + 1, salida[i][1]];
  }
  return salida;
};

export const RutaDibujada: React.FC<{ ruta: Ruta; c: Cam; t: number; a: number; b: number; o: number; fija?: boolean }> = ({ ruta, c, t, a, b, o, fija }) => {
  const todos = React.useMemo(() => puntosRuta(ruta), [ruta]);
  if (o <= 0.001 || todos.length < 2) return null;
  const u = fija ? 1 : suave(lin(t, a, b));
  const n = Math.max(1, Math.floor(u * (todos.length - 1)));
  const px = todos.slice(0, n + 1).map((m) => aPantalla(c, m));
  const linea = px.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const cabeza = px[px.length - 1];
  const previo = px[Math.max(0, px.length - 3)];
  const angulo = (Math.atan2(cabeza[1] - previo[1], cabeza[0] - previo[0]) * 180) / Math.PI;
  const inicio = px[0];
  const haciaIzquierda = Math.abs(angulo) > 90;
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", opacity: o }}>
        <polyline points={linea} fill="none" stroke="#fff" strokeWidth={17} strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={linea} fill="none" stroke={ruta.color} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
        {!fija ? <circle cx={inicio[0]} cy={inicio[1]} r={15} fill={ruta.color} stroke="#fff" strokeWidth={5} /> : null}
        {!ruta.vehiculo && !fija ? <circle cx={cabeza[0]} cy={cabeza[1]} r={15} fill="#fff" stroke={ruta.color} strokeWidth={6} /> : null}
      </svg>
      {ruta.vehiculo ? (
        <div style={{ position: "absolute", left: cabeza[0], top: cabeza[1], opacity: o, transform: ruta.vehiculo === "avion" ? `translate(-50%,-50%) rotate(${angulo}deg)` : `translate(-50%,-62%) scaleX(${haciaIzquierda ? -1 : 1})` }}>
          <DibujoFigura tipo={ruta.vehiculo} tam={120} t={t} rebote={false} />
        </div>
      ) : null}
    </>
  );
};

// El trazo con más puntos es el territorio principal (sin Alaska, Hawái, islas…)
const trozos = new Map<string, string>();
const trozoMayor = (d: string) => {
  let r = trozos.get(d);
  if (!r) {
    r = d.split(/(?=M)/).reduce((a, b) => (b.length > a.length ? b : a), "");
    trozos.set(d, r);
  }
  return r;
};

// ---------------------------------------------------------------- un país que viaja y cambia a su tamaño real
export const PaisViajero: React.FC<{ comp: Comparacion; c: Cam; t: number; a: number; paises: Paises; o: number }> = ({ comp, c, t, a, paises, o }) => {
  const p = paises[comp.iso];
  if (!p || o <= 0.001) return null;
  const u = comp.fijo ? 1 : suave(lin(t, a, a + 1.5));
  const lat = p.c[1] + (comp.lat - p.c[1]) * u;
  const lon = p.c[0] + (comp.lon - p.c[0]) * u;
  const origen = merc(p.c[0], p.c[1]);
  const aqui = merc(lon, lat);
  // Mercator estira según la latitud: esta escala devuelve el tamaño real en el punto de llegada
  const escala = Math.cos(p.c[1] * RAD) / Math.cos(lat * RAD);
  return (
    <svg width={W} height={H} style={{ position: "absolute", opacity: o }}>
      <g transform={transformar(c)}>
        <g transform={`translate(${aqui[0] * 256} ${aqui[1] * 256}) scale(${escala}) translate(${-origen[0] * 256} ${-origen[1] * 256})`}>
          <path d={comp.soloMayor ? trozoMayor(p.d) : p.d} fill={comp.color} fillOpacity={0.5} stroke="#fff" strokeWidth={3} vectorEffect="non-scaling-stroke" fillRule="evenodd" />
        </g>
      </g>
    </svg>
  );
};
