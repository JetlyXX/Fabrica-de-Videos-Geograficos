import React from "react";
import { Palabra, Proyecto } from "./tipos";

// Grupos de pocas palabras, que se cortan en las pausas
export const agrupar = (lista: Palabra[], porGrupo: number): Palabra[][] => {
  const grupos: Palabra[][] = [];
  let actual: Palabra[] = [];
  lista.forEach((p, i) => {
    const prev = lista[i - 1];
    const corte = prev ? /[.,?!:;]$/.test(prev.w) || p.a - prev.b > 0.28 : false;
    if (actual.length && (corte || actual.length >= porGrupo)) {
      grupos.push(actual);
      actual = [];
    }
    actual.push(p);
  });
  if (actual.length) grupos.push(actual);
  return grupos;
};

export const Subtitulos: React.FC<{ t: number; grupos: Palabra[][]; estilo: Proyecto["subtitulos"] }> = ({ t, grupos, estilo }) => {
  if (!estilo.mostrar) return null;
  const g = grupos.find((gr, i) => {
    const sig = grupos[i + 1];
    return t >= gr[0].a - 0.04 && t < (sig ? Math.min(sig[0].a - 0.04, gr[gr.length - 1].b + 0.4) : gr[gr.length - 1].b + 0.8);
  });
  if (!g) return null;
  return (
    <div style={{ position: "absolute", left: 60, width: 830, top: estilo.y, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 24px", textAlign: "center" }}>
      {g.map((p, i) => {
        const dicha = t >= p.a - 0.03;
        const activa = dicha && t < p.b + 0.03;
        return (
          <span
            key={i}
            style={{
              fontFamily: `'${estilo.fuente}', sans-serif`,
              fontWeight: 800,
              fontSize: estilo.tam,
              lineHeight: 1.15,
              color: activa ? estilo.color : "#ffffff",
              opacity: dicha ? 1 : 0.72,
              WebkitTextStroke: "9px #0b121a",
              paintOrder: "stroke",
              textShadow: "0 4px 12px rgba(0,0,0,.85)",
              transform: activa ? "scale(1.06)" : undefined,
              display: "inline-block",
            }}
          >
            {p.w}
          </span>
        );
      })}
    </div>
  );
};
