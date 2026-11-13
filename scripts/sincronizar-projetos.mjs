// Traz as páginas dos outros projetos para dentro do site principal (techmeow.app/<projeto>/), com os links
// absolutos trocados do endereço antigo (meowdev-mod.github.io) para o novo (techmeow.app).
//
// Rodar:   node scripts/sincronizar-projetos.mjs            (todos)
//          node scripts/sincronizar-projetos.mjs ps5-hdmi-tool Iron-Check   (só alguns)
//
// Cada projeto continua sendo mantido no repositório dele; quando mudar algo lá, rode este comando de novo,
// confira o resultado e envie o site. A pasta de cada projeto guarda um arquivo ".sincronizado" com o commit de
// origem, e o script só apaga pastas que ele mesmo criou (nunca mexe numa pasta que tenha outra origem).
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOMINIO = "https://techmeow.app";

// pasta no site = nome do repositório (mantém os endereços antigos, assim nenhum link relativo quebra).
// origem: pasta do repositório que o GitHub Pages publica. incluir: só estes itens (quando o repositório tem mais coisa).
export const PROJETOS = [
  { pasta: "ps5-hdmi-tool", repo: "MeoWDev-MOD/ps5-hdmi-tool", origem: "docs" },
  { pasta: "ps5-controle-test", repo: "MeoWDev-MOD/ps5-controle-test", origem: "docs" },
  { pasta: "Iron-Check", repo: "MeoWDev-MOD/Iron-Check", origem: "docs" },
  { pasta: "BancadaSync-Download", repo: "MeoWDev-MOD/BancadaSync-Download", origem: "docs" },
  {
    pasta: "Control-PS-5",
    repo: "MeoWDev-MOD/Control-PS-5",
    origem: ".",
    incluir: ["index.html", "assets", "css", "img", "js", "vendor", "privacidade", "termos", "sitemap.xml", "switch", "en", "es", "ru", "sitemap-idiomas.xml"],
  },
];

const FORA = new Set([".git", ".github", "node_modules", "site-src", "README.md", "robots.txt", "CNAME", ".nojekyll", "LICENSE"]);
const TEXTO = new Set([".html", ".js", ".mjs", ".css", ".xml", ".json", ".webmanifest", ".txt", ".svg", ".md"]);
const MARCA = ".sincronizado";

// "googleXXXX.html" é a verificação do Search Console de outro endereço: não vale aqui.
const ehVerificacaoGoogle = (nome) => /^google[0-9a-f]{12,}\.html$/.test(nome);

// Troca o endereço antigo pelo novo, em links com e sem "https://".
export function trocarEndereco(texto) {
  return texto
    .replace(/https?:\/\/meowdev-mod\.github\.io(?=[\/"'\s)<>?#]|$)/g, DOMINIO)
    .replace(/(^|[^\w.\/-])meowdev-mod\.github\.io(?=[\/"'\s)<>?#]|$)/g, "$1techmeow.app");
}

function copiar(origem, destino) {
  cpSync(origem, destino, {
    recursive: true,
    filter: (src) => {
      const nome = path.basename(src);
      return !FORA.has(nome) && !ehVerificacaoGoogle(nome);
    },
  });
}

function reescrever(pasta) {
  let arquivos = 0;
  let trocas = 0;
  for (const nome of readdirSync(pasta, { recursive: true })) {
    const arq = path.join(pasta, nome);
    if (!statSync(arq).isFile() || !TEXTO.has(path.extname(arq).toLowerCase())) continue;
    const antes = readFileSync(arq, "utf8");
    const depois = trocarEndereco(antes);
    if (depois !== antes) {
      writeFileSync(arq, depois);
      arquivos++;
      trocas += (antes.match(/meowdev-mod\.github\.io/g) || []).length;
    }
  }
  return { arquivos, trocas };
}

function sincronizar(p) {
  const destino = path.join(raiz, p.pasta);
  if (existsSync(destino) && !existsSync(path.join(destino, MARCA))) {
    console.error(`  ! ${p.pasta}: já existe e não foi criada por este script. Nada foi alterado.`);
    return false;
  }
  const tmp = mkdtempSync(path.join(tmpdir(), "tm-sync-"));
  try {
    execFileSync("git", ["clone", "--quiet", "--depth", "1", `https://github.com/${p.repo}.git`, tmp], { stdio: "inherit" });
    const commit = execFileSync("git", ["-C", tmp, "rev-parse", "HEAD"]).toString().trim();
    const base = path.join(tmp, p.origem);
    if (existsSync(destino)) rmSync(destino, { recursive: true, force: true });
    mkdirSync(destino, { recursive: true });
    if (p.incluir) {
      for (const item of p.incluir) if (existsSync(path.join(base, item))) copiar(path.join(base, item), path.join(destino, item));
    } else {
      copiar(base, destino);
    }
    const r = reescrever(destino);
    writeFileSync(path.join(destino, MARCA), JSON.stringify({ repo: p.repo, origem: p.origem, commit, em: new Date().toISOString() }, null, 2) + "\n");
    console.log(`  ok ${p.pasta}: commit ${commit.slice(0, 7)}, ${r.trocas} links trocados em ${r.arquivos} arquivos`);
    return true;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pedidos = process.argv.slice(2);
  const lista = pedidos.length ? PROJETOS.filter((p) => pedidos.includes(p.pasta)) : PROJETOS;
  if (!lista.length) {
    console.error("Nenhum projeto com esse nome. Opções:", PROJETOS.map((p) => p.pasta).join(", "));
    process.exit(1);
  }
  console.log("Sincronizando", lista.length, "projeto(s) para", DOMINIO);
  const falhas = lista.filter((p) => !sincronizar(p));
  process.exit(falhas.length ? 1 : 0);
}
