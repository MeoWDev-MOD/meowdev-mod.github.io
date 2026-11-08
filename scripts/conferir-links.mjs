// Confere se tudo o que as páginas pedem (imagens, scripts, estilos, vídeos e links internos) existe no site.
//
// Rodar:   node scripts/conferir-links.mjs [endereço-base] [páginas...]
// Exemplo: node scripts/conferir-links.mjs http://127.0.0.1:8770 / /projetos/ /ps5-hdmi-tool/
//
// Sem páginas, confere as principais e as dos projetos trazidos. Segue só os links do próprio site (até 2 níveis de
// páginas) e relata cada endereço que não abrir. Sai com erro se achar algum, para dar para usar antes de publicar.
// No Git Bash do Windows, rode com MSYS_NO_PATHCONV=1 (senão ele troca os caminhos que começam com "/").
const base = (process.argv[2] || "http://127.0.0.1:8770").replace(/\/$/, "");
const inicio = process.argv.length > 3
  ? process.argv.slice(3)
  : ["/", "/projetos/", "/app/", "/app/acesso/", "/privacidade/", "/MeoWGuard/", "/ps5-hdmi-tool/", "/ps5-controle-test/", "/ps5-controle-test/web/",
     "/Iron-Check/", "/Iron-Check/en/", "/BancadaSync-Download/", "/Control-PS-5/"];

const status = new Map();   // endereço -> código
const textos = new Map();   // endereço -> html (só das páginas)
const visitadas = new Set();
const falhas = [];
const POR_VEZ = 6;

const ATRIBUTOS = /\b(?:src|href|poster|data-src|data-mapa)\s*=\s*"([^"]+)"/g;
const META_ENDERECO = /<meta[^>]+content\s*=\s*"((?:https?:)?\/[^"]*)"/g; // og:image e semelhantes: descrição e palavras-chave não são links
const SRCSET = /\bsrcset\s*=\s*"([^"]+)"/g;
const origemBase = new URL(base).origin;

function candidatos(html, paginaUrl) {
  const achados = new Set();
  // Algumas páginas (as versões em inglês e espanhol do testador) usam <base href="../">: os caminhos valem a partir dele.
  const tagBase = /<base[^>]+href\s*=\s*"([^"]+)"/.exec(html);
  let ancora = paginaUrl;
  if (tagBase) { try { ancora = new URL(tagBase[1], paginaUrl).href; } catch { /* usa a própria página */ } }
  const adiciona = (valor) => {
    const v = valor.trim();
    if (!v || /^(#|mailto:|tel:|javascript:|data:|blob:|about:)/i.test(v)) return;
    let u;
    try { u = new URL(v, ancora); } catch { return; }
    if (u.origin !== origemBase) return; // só o que é do próprio site
    u.hash = "";
    achados.add(u.href);
  };
  for (const m of html.matchAll(ATRIBUTOS)) adiciona(m[1]);
  for (const m of html.matchAll(META_ENDERECO)) adiciona(m[1]);
  for (const m of html.matchAll(SRCSET)) for (const parte of m[1].split(",")) adiciona(parte.trim().split(/\s+/)[0]);
  return achados;
}

async function checar(url, origem) {
  if (status.has(url)) return status.get(url);
  let codigo = 0;
  for (let tentativa = 0; tentativa < 3 && !codigo; tentativa++) {
    try {
      const r = await fetch(url, { redirect: "follow" });
      codigo = r.status;
      if (r.ok && /text\/html/.test(r.headers.get("content-type") || "")) textos.set(url, await r.text());
      else await r.arrayBuffer(); // lê o corpo até o fim para liberar a conexão
    } catch {
      await new Promise((ok) => setTimeout(ok, 150));
    }
  }
  status.set(url, codigo);
  if (codigo !== 200) falhas.push({ url, codigo, origem });
  return codigo;
}

async function visitar(caminho, nivel, origem) {
  const url = new URL(caminho, base + "/").href;
  visitadas.add(url);
  if ((await checar(url, origem)) !== 200) return;
  const html = textos.get(url);
  if (!html) return;
  const filhos = [...candidatos(html, url)];
  for (let i = 0; i < filhos.length; i += POR_VEZ) await Promise.all(filhos.slice(i, i + POR_VEZ).map((f) => checar(f, url)));
  if (nivel >= 2) return;
  for (const f of filhos) {
    const { pathname } = new URL(f);
    if ((pathname.endsWith("/") || pathname.endsWith(".html")) && textos.has(f) && !visitadas.has(f)) await visitar(f, nivel + 1, url);
  }
}

for (const p of inicio) if (!visitadas.has(new URL(p, base + "/").href)) await visitar(p, 0, "(início)");

console.log(`${status.size} endereços conferidos em ${base}`);
if (falhas.length) {
  console.log(`\n${falhas.length} NÃO ABRIRAM:`);
  for (const f of falhas.slice(0, 40)) console.log(`  ${f.codigo || "sem resposta"}  ${f.url.replace(base, "")}   (pedido por ${f.origem.replace(base, "")})`);
  process.exit(1);
}
console.log("Tudo abre.");
