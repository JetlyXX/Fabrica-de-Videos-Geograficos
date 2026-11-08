// Construye la página del estudio (web/app.tsx → web/dist)
import { build } from "esbuild";

await build({
  entryPoints: ["web/app.tsx"],
  bundle: true,
  outdir: "web/dist",
  loader: { ".woff": "file", ".woff2": "file", ".png": "file" },
  jsx: "automatic",
  minify: true,
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});
