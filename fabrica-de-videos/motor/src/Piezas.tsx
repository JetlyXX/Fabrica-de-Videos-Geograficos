import React from "react";
import { Img } from "remotion";

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lin = (t: number, a: number, b: number) => clamp((t - a) / Math.max(b - a, 0.0001));
export const suave = (u: number) => u * u * (3 - 2 * u);
// entra y sale suave entre a y b
export const vis = (t: number, a: number, b: number, e = 0.22) => suave(lin(t, a, a + e)) * (1 - suave(lin(t, b - e, b)));
// entrada con rebote pequeño
export const salto = (t: number, a: number, d = 0.34) => {
  const u = lin(t, a, a + d);
  return 1 + 2.4 * (u - 1) ** 3 + 1.4 * (u - 1) ** 2;
};

const SANS = "Poppins, sans-serif";
const SERIF = "'Playfair Display', serif";
const CREMA = "#f6e7c4";
const TINTA = "#2d1c0d";

// el tamaño de letra baja si el texto es largo
const tamPara = (texto: string, grande: number) => Math.round(Math.max(44, Math.min(grande, 1500 / Math.max(texto.length, 1))));

export const EnPantalla: React.FC<{ x: number; y: number; o?: number; s?: number; children: React.ReactNode }> = ({ x, y, o = 1, s = 1, children }) =>
  o <= 0.001 ? null : <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${s})`, opacity: o }}>{children}</div>;

export const Bandera: React.FC<{ a2: string; ancho: number; base: string; ondea: number }> = ({ a2, ancho, base, ondea }) => (
  <Img
    src={`${base}/datos/banderas/${a2}.svg`}
    style={{ width: ancho, height: ancho * 0.75, objectFit: "cover", borderRadius: 10, boxShadow: "0 10px 24px rgba(0,0,0,.55)", transform: `rotate(${Math.sin(ondea * 2.4) * 1.6}deg)` }}
  />
);

export const Rotulo: React.FC<{ texto: string; tam?: number; color?: string; serif?: boolean }> = ({ texto, tam = 54, color = "#fff", serif }) => (
  <div style={{ fontFamily: serif ? SERIF : SANS, fontWeight: 800, fontSize: tam, color, letterSpacing: 1, textAlign: "center", maxWidth: 860, lineHeight: 1.1, textShadow: serif ? "0 2px 0 rgba(255,245,220,.65)" : "0 3px 14px rgba(0,0,0,.85), 0 1px 3px rgba(0,0,0,.9)" }}>
    {texto}
  </div>
);

export const Cartela: React.FC<{ texto: string; sub?: string; color: string; papel: boolean }> = ({ texto, sub, color, papel }) => {
  const tam = tamPara(texto, 92);
  return (
    <div style={{ background: papel ? CREMA : "rgba(10,18,28,.84)", borderLeft: `14px solid ${color}`, borderRadius: 10, padding: `${tam * 0.26}px ${tam * 0.5}px`, boxShadow: "0 12px 34px rgba(0,0,0,.5)", maxWidth: 860 }}>
      <div style={{ fontFamily: papel ? SERIF : SANS, fontWeight: 800, fontSize: tam, lineHeight: 1.1, color: papel ? TINTA : "#fff" }}>{texto}</div>
      {sub ? <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: Math.max(32, tam * 0.46), color: papel ? "#6b4a24" : "#ffe9b8", marginTop: tam * 0.12 }}>{sub}</div> : null}
    </div>
  );
};

// Año con sello de lacre
export const Anio: React.FC<{ texto: string; sub?: string; color: string }> = ({ texto, sub, color }) => (
  <div style={{ background: CREMA, border: `6px double ${TINTA}`, padding: "2px 56px 10px", transform: "rotate(-2.5deg)", boxShadow: "0 16px 40px rgba(0,0,0,.55)", textAlign: "center", maxWidth: 860 }}>
    <div style={{ fontFamily: SERIF, fontWeight: 800, fontSize: tamPara(texto, 168), color, lineHeight: 1.1 }}>{texto}</div>
    {sub ? <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 38, color: TINTA }}>{sub}</div> : null}
  </div>
);

export const Marcador: React.FC<{ t: number; color: string }> = ({ t, color }) => {
  const r = 34 + 16 * Math.sin(t * 7) ** 2;
  return <div style={{ width: r, height: r, borderRadius: "50%", background: color, border: "6px solid #fff", boxShadow: "0 0 24px rgba(0,0,0,.8)" }} />;
};
