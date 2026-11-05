// Monta js/ a partir de main.js. Usa o GSAP, o Lenis, o Three.js e o esbuild já instalados no site do Iron Check,
// para não instalar nada de novo (mesmas versões: gsap 3.15.0, lenis 1.3.27, three 0.187.0).
// Rodar: node site-src/build.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const modulos = process.env.MODULOS || "F:/PROJECT IDE/iron-check-site/site-src/node_modules";
const require = createRequire(path.join(modulos, "x.js"));
const esbuild = require("esbuild");

await esbuild.build({
  entryPoints: [path.join(aqui, "main.js")],
  bundle: true,
  splitting: true,
  format: "esm",
  minify: true,
  target: "es2020",
  outdir: path.join(aqui, "..", "js"),
  entryNames: "[name]",
  chunkNames: "[name]-[hash]",
  nodePaths: [modulos],
  legalComments: "none",
  loader: { ".json": "json" },
  logLevel: "info",
});

// Carimbo de versão: o endereço do script e do estilo muda quando o conteúdo muda, para nenhum navegador ficar com o antigo.
const raiz = path.join(aqui, "..");
const marca = (arq) => createHash("sha1").update(readFileSync(path.join(raiz, arq))).digest("hex").slice(0, 10);
const html = path.join(raiz, "index.html");
const novo = readFileSync(html, "utf8")
  .replace(/js\/main\.js(\?v=[0-9a-f]+)?/, `js/main.js?v=${marca("js/main.js")}`)
  .replace(/site\.css(\?v=[0-9a-f]+)?"/, `site.css?v=${marca("site.css")}"`);
writeFileSync(html, novo);
console.log("carimbo:", novo.match(/main\.js\?v=\w+/)[0], novo.match(/site\.css\?v=\w+/)[0]);
