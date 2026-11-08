// Saca fotos sueltas de un proyecto para revisarlo. Uso: node fotos.mjs <props.json> <carpeta> <fotograma,fotograma,...>
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const [archivoProps, carpeta, lista] = process.argv.slice(2);
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputProps = JSON.parse(readFileSync(archivoProps, "utf-8"));
mkdirSync(carpeta, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(raiz, "src", "index.ts") });
const composition = await selectComposition({ serveUrl, id: "Short", inputProps, timeoutInMilliseconds: 180000 });
let n = 0;
for (const f of lista.split(",").map(Number)) {
  await renderStill({
    composition, serveUrl, inputProps, frame: Math.min(f, composition.durationInFrames - 1), scale: 0.3, imageFormat: "jpeg", jpegQuality: 85,
    output: path.join(carpeta, `f_${String(n++).padStart(3, "0")}.jpg`), timeoutInMilliseconds: 240000,
  });
}
