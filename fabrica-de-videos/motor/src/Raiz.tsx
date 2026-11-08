import React from "react";
import { Composition } from "remotion";
import { Video } from "./Video";
import { fotogramasDe, FPS, PropsVideo, Proyecto } from "./tipos";

// Solo para que la composición tenga valores por defecto: el servidor siempre pasa el proyecto de verdad
const VACIO: Proyecto = {
  id: "", titulo: "", guion: "", descripcion: "", idioma: "es", voz: null, duracionVoz: null, duracionManual: 10, palabras: [],
  musica: { archivo: null, volumen: 0.25 }, efectos: true,
  subtitulos: { mostrar: true, color: "#ffc531", fuente: "Poppins", tam: 66, y: 1340, porGrupo: 4 }, escenas: [],
};

export const Raiz: React.FC = () => (
  <Composition
    id="Short"
    component={Video}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={300}
    defaultProps={{ proyecto: VACIO, base: "" } as PropsVideo}
    calculateMetadata={({ props }) => ({ durationInFrames: fotogramasDe(props.proyecto) })}
  />
);
