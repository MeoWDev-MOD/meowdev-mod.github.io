// Monta o site: o JavaScript (js/tm.js e os pedaços carregados à parte) e depois as páginas (montar-paginas.mjs).
// Usa o GSAP, o Lenis, o Three.js e o esbuild já instalados no site do Iron Check, para não instalar nada de novo
// (mesmas versões: gsap 3.15.0, lenis 1.3.27, three 0.187.0).
// Rodar: node site-src/build.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readdirSync, rmSync } from "node:fs";
import { montar } from "./montar-paginas.mjs";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const modulos = process.env.MODULOS || "F:/PROJECT IDE/iron-check-site/site-src/node_modules";
const require = createRequire(path.join(modulos, "x.js"));
const esbuild = require("esbuild");

// Apaga os pedaços da montagem anterior (o nome muda com o conteúdo), para não acumular arquivo sem uso em js/.
const saida = path.join(aqui, "..", "js");
for (const f of readdirSync(saida)) if (/^(chunk|cena3d)-[A-Z0-9]+\.js$/.test(f) || f === "main.js" || f === "consent.js") rmSync(path.join(saida, f));

await esbuild.build({
  entryPoints: [path.join(aqui, "tm.js")],
  bundle: true,
  splitting: true,
  format: "esm",
  minify: true,
  target: "es2020",
  outdir: saida,
  entryNames: "[name]",
  chunkNames: "[name]-[hash]",
  nodePaths: [modulos],
  legalComments: "none",
  loader: { ".json": "json" },
  logLevel: "info",
});

// Páginas, com o carimbo de versão do estilo e do script no endereço (muda quando o conteúdo muda, para nenhum navegador ficar com o antigo).
montar();
