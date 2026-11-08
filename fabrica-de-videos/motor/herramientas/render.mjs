// Hace el vídeo de un proyecto. Uso: node render.mjs <props.json> <salida.mp4> <escala>
// Escribe el avance como una línea JSON por paso, y el servidor la lee.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const [archivoProps, salida, escala] = process.argv.slice(2);
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const avisar = (fase, avance) => console.log(JSON.stringify({ fase, avance }));

const inputProps = JSON.parse(readFileSync(archivoProps, "utf-8"));
avisar("Preparando", 0);
const serveUrl = await bundle({ entryPoint: path.join(raiz, "src", "index.ts"), onProgress: (p) => avisar("Preparando", p / 100) });
const composition = await selectComposition({ serveUrl, id: "Short", inputProps, timeoutInMilliseconds: 180000 });
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  crf: 18,
  outputLocation: salida,
  inputProps,
  scale: Number(escala) || 1,
  timeoutInMilliseconds: 300000,
  onProgress: ({ progress }) => avisar("Creando el video", progress),
});
avisar("Terminado", 1);
