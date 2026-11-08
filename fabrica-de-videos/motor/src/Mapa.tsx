import React from "react";
import { AbsoluteFill, Img } from "remotion";
import { ANCLA, Cam, H, W } from "./camara";
import { PaisResaltado } from "./tipos";

export type DatosPais = { n: string; a2: string; c: [number, number]; b: [number, number, number, number]; d: string };
export type Paises = Record<string, DatosPais>;

const NIVEL_MIN = 2;
const NIVEL_MAX = 13; // Sentinel-2 no da más detalle; por encima se amplía

const limites = (c: Cam) => {
  const e = 256 * 2 ** c.z;
  return { x0: c.x - ANCLA[0] / e, x1: c.x + (W - ANCLA[0]) / e, y0: c.y - ANCLA[1] / e, y1: c.y + (H - ANCLA[1]) / e };
};

const Capa: React.FC<{ c: Cam; nivel: number; base: string }> = ({ c, nivel, base }) => {
  const n = 2 ** nivel;
  const e = 256 * 2 ** c.z;
  const lado = e / n;
  const { x0, x1, y0, y1 } = limites(c);
  const hijos: React.ReactNode[] = [];
  for (let i = Math.floor(x0 * n); i <= Math.floor(x1 * n); i++) {
    for (let j = Math.max(0, Math.floor(y0 * n)); j <= Math.min(n - 1, Math.floor(y1 * n)); j++) {
      const xReal = ((i % n) + n) % n; // el mundo da la vuelta
      hijos.push(
        <Img
          key={`${nivel}/${i}/${j}`}
          src={`${base}/t/${nivel}/${xReal}/${j}.jpg`}
          style={{ position: "absolute", left: ANCLA[0] + (i / n - c.x) * e, top: ANCLA[1] + (j / n - c.y) * e, width: lado + 0.7, height: lado + 0.7 }}
        />,
      );
    }
  }
  return <>{hijos}</>;
};

export const Satelite: React.FC<{ c: Cam; sepia: number; base: string }> = ({ c, sepia, base }) => {
  const nivel = Math.max(NIVEL_MIN, Math.min(NIVEL_MAX, Math.ceil(c.z)));
  const filtro = sepia > 0.001 ? `sepia(${0.92 * sepia}) saturate(${1 - 0.25 * sepia}) contrast(${1 + 0.06 * sepia}) brightness(${1 + 0.12 * sepia})` : undefined;
  return (
    <AbsoluteFill style={{ backgroundColor: "#16324f", filter: filtro }}>
      {/* la capa gruesa de debajo evita huecos mientras carga la fina */}
      {nivel > NIVEL_MIN + 1 ? <Capa c={c} nivel={nivel - 2} base={base} /> : null}
      <Capa c={c} nivel={nivel} base={base} />
    </AbsoluteFill>
  );
};

export const transformar = (c: Cam) => {
  const e = 2 ** c.z;
  return `translate(${ANCLA[0] - c.x * 256 * e} ${ANCLA[1] - c.y * 256 * e}) scale(${e})`;
};

const visibles = (c: Cam, paises: Paises) => {
  const { x0, x1, y0, y1 } = limites(c);
  return Object.entries(paises).filter(([, p]) => p.b[2] / 256 >= x0 && p.b[0] / 256 <= x1 && p.b[3] / 256 >= y0 && p.b[1] / 256 <= y1);
};

// Mapa de papel antiguo dibujado a tinta
export const Papel: React.FC<{ c: Cam; opacidad: number; paises: Paises; base: string }> = ({ c, opacidad, paises, base }) => {
  if (opacidad <= 0.001) return null;
  return (
    <AbsoluteFill style={{ opacity: opacidad }}>
      <Img src={`${base}/datos/pergamino.jpg`} style={{ position: "absolute", width: W, height: H }} />
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <pattern id="rayas" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
            <line x1="0" y1="0" x2="0" y2="12" stroke="#5b3a1e" strokeWidth="1.3" opacity="0.28" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="#7f9aa0" opacity="0.28" />
        <g transform={transformar(c)}>
          {visibles(c, paises).map(([iso, p]) => (
            <path key={iso} d={p.d} fill="#e6d3a8" stroke="#4a3018" strokeWidth={1.4} vectorEffect="non-scaling-stroke" fillRule="evenodd" />
          ))}
        </g>
        <rect width={W} height={H} fill="url(#rayas)" />
      </svg>
    </AbsoluteFill>
  );
};

// Países resaltados con su color
export const Tintes: React.FC<{ c: Cam; f: number; lista: PaisResaltado[]; paises: Paises; enPapel: number }> = ({ c, f, lista, paises, enPapel }) => {
  if (f <= 0.001 || !lista.length) return null;
  return (
    <svg width={W} height={H} style={{ position: "absolute", opacity: f }}>
      <g transform={transformar(c)}>
        {lista.map((r) =>
          paises[r.iso] ? (
            <path key={r.iso} d={paises[r.iso].d} fill={r.color} fillOpacity={0.42 + 0.3 * enPapel} stroke={enPapel > 0.5 ? "#3b1f10" : "#fff"} strokeWidth={enPapel > 0.5 ? 2.5 : 1.6} vectorEffect="non-scaling-stroke" fillRule="evenodd" />
          ) : null,
        )}
      </g>
    </svg>
  );
};
