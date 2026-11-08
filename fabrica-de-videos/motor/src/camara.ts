import { Escena } from "./tipos";

export type Cam = { x: number; y: number; z: number };
export type XY = [number, number];

export const W = 1080;
export const H = 1920;
export const ANCLA: XY = [W / 2, H / 2]; // la cámara apunta al centro de la pantalla

export const merc = (lon: number, lat: number): XY => {
  const r = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  return [(lon + 180) / 360, (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2];
};

export const aPantalla = (c: Cam, m: XY): XY => {
  const e = 256 * 2 ** c.z;
  return [ANCLA[0] + (m[0] - c.x) * e, ANCLA[1] + (m[1] - c.y) * e];
};

const EMPUJE = 0.28; // cuánto se acerca o aleja la cámara durante una escena
const ease = (u: number) => (u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2);

type Tramo = { t0: number; t1: number; a: Cam; b: Cam; salto: number };

const zooms = (e: Escena): [number, number] =>
  e.movimiento === "acercar" ? [e.zoom, e.zoom + EMPUJE] : e.movimiento === "alejar" ? [e.zoom + EMPUJE, e.zoom] : [e.zoom, e.zoom];

// Una escena: primero viaja desde la anterior; luego se mueve despacio hasta que acaba
export const tramosDe = (escenas: Escena[], dur: number): Tramo[] => {
  const tramos: Tramo[] = [];
  let previa: Cam | null = null;
  escenas.forEach((e, i) => {
    const t0 = i === 0 ? 0 : e.inicio;
    const t1 = i + 1 < escenas.length ? escenas[i + 1].inicio : dur;
    const [m0, m1] = merc(e.lon, e.lat);
    const [z0, z1] = zooms(e);
    let inicioLento = t0;
    if (previa) {
      const lejos = Math.hypot(m0 - previa.x, m1 - previa.y) * 256 * 2 ** Math.max(previa.z, z0);
      const salto = Math.max(0, Math.log2(Math.max(lejos, 1) / 1400));
      const viaje = Math.min(salto > 0 ? 1.5 : 1, (t1 - t0) * 0.55);
      inicioLento = t0 + viaje;
      const bajo = Math.max(3.2, Math.min(previa.z, z0) - salto);
      tramos.push({ t0, t1: inicioLento, a: previa, b: { x: m0, y: m1, z: z0 }, salto: Math.max(0, Math.min(previa.z, z0) - bajo) });
    }
    tramos.push({ t0: inicioLento, t1, a: { x: m0, y: m1, z: z0 }, b: { x: m0, y: m1, z: z1 }, salto: 0 });
    previa = { x: m0, y: m1, z: z1 };
  });
  return tramos;
};

export const camara = (t: number, tramos: Tramo[]): Cam => {
  const tr = tramos.find((x) => t < x.t1) ?? tramos[tramos.length - 1];
  if (!tr) return { x: 0.5, y: 0.5, z: 2 };
  const lineal = Math.min(1, Math.max(0, (t - tr.t0) / Math.max(tr.t1 - tr.t0, 0.001)));
  if (tr.salto === 0 && tr.a.x === tr.b.x && tr.a.y === tr.b.y) {
    return { x: tr.a.x, y: tr.a.y, z: tr.a.z + (tr.b.z - tr.a.z) * lineal };
  }
  const u = ease(lineal);
  const z = tr.a.z + (tr.b.z - tr.a.z) * u - tr.salto * Math.sin(Math.PI * u);
  return { x: tr.a.x + (tr.b.x - tr.a.x) * u, y: tr.a.y + (tr.b.y - tr.a.y) * u, z };
};
