export type TipoMapa = "satelite" | "papel" | "sepia";

export type PaisResaltado = { iso: string; color: string; rotulo: boolean };

export type Figura = "persona" | "rey" | "reina" | "soldado" | "explorador" | "barco" | "avion" | "castillo";

export type Ruta = { puntos: [number, number][]; color: string; curva: boolean; vehiculo: "" | Figura };

export type Comparacion = { iso: string; lon: number; lat: number; color: string; soloMayor?: boolean; fijo?: boolean }; // soloMayor: sin islas ni territorios sueltos; // fijo: ya está en su sitio, sin viajar

export type Escena = {
  id: string;
  ruta?: Ruta;
  linea?: Ruta; // como una ruta, pero ya dibujada desde el principio de la escena
  comparar?: Comparacion[];
  figuras?: Figura[];
  ojos?: boolean; // las banderas llevan ojos
  inicio: number; // segundo en que empieza; dura hasta la siguiente escena
  lon: number;
  lat: number;
  zoom: number;
  movimiento: "acercar" | "alejar" | "quieto";
  mapa: TipoMapa;
  paises: PaisResaltado[];
  texto: string;
  subtexto: string;
  tipoTexto: "cartela" | "anio" | "rotulo";
  colorTexto: string;
  posTexto: "arriba" | "centro";
  banderas: string[]; // códigos de dos letras, en minúsculas
  marcador: boolean;
};

export type Palabra = { w: string; a: number; b: number };

export type Proyecto = {
  id: string;
  titulo: string;
  guion: string;
  descripcion: string;
  idioma: string;
  voz: string | null; // nombre del archivo dentro de la carpeta del proyecto
  duracionVoz: number | null;
  duracionManual: number;
  palabras: Palabra[];
  musica: { archivo: string | null; volumen: number };
  efectos: boolean;
  subtitulos: {
    mostrar: boolean;
    color: string;
    fuente: "Poppins" | "Playfair Display";
    tam: number;
    y: number;
    porGrupo: number;
  };
  escenas: Escena[];
  video?: string; // último vídeo creado
};

export type PropsVideo = { proyecto: Proyecto; base: string };

export const FPS = 30;
const COLA = 0.6; // segundos de más al final, para que no se corte la última palabra

export const duracionDe = (p: Proyecto) => (p.voz && p.duracionVoz ? p.duracionVoz : p.duracionManual) + COLA;
export const fotogramasDe = (p: Proyecto) => Math.max(FPS, Math.ceil(duracionDe(p) * FPS));
