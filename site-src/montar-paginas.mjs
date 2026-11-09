// Monta as páginas do site principal (início, projetos, MeoWGuard, acesso e privacidade) a partir de:
//   site-src/paginas/*.html  o miolo de cada página
//   site-src/dados.mjs        a lista de projetos (menu, início e /projetos/ saem dela)
// e deste arquivo, que guarda o que é igual em todas: o topo com o menu, o rodapé, o <head> e os ícones.
// Rodar sozinho:  node site-src/montar-paginas.mjs     (o build.mjs também chama, depois de montar o JavaScript)
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIAS, ETIQUETA, GRUPOS_MENU, PROJETOS, SIZES_CARTAO, WHATSAPP } from "./dados.mjs";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aqui, "..");
const SITE = "https://techmeow.app";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const marca = (arq) => (existsSync(path.join(raiz, arq)) ? createHash("sha1").update(readFileSync(path.join(raiz, arq))).digest("hex").slice(0, 10) : "0");
const porId = (id) => PROJETOS.find((p) => p.id === id) ?? (() => { throw new Error(`projeto "${id}" não existe em dados.mjs`); })();

// ---------- ícones (um só lugar; as páginas usam <use href="#i-...">) ----------
const TRACO = {
  arrow: "M5 12h14M13 6l6 6-6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  chev: "M6 9l6 6 6-6",
  bars: "M4 7h16M4 12h16M4 17h16",
  x: "M6 6l12 12M18 6L6 18",
  pin: "M12 21s7-6.4 7-11.5a7 7 0 0 0-14 0C5 14.6 12 21 12 21zM12 7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  wrench: "M14.7 6.3a4 4 0 0 0-5.2 5.2L4 17l3 3 5.5-5.5a4 4 0 0 0 5.2-5.2l-2.5 2.5-2.4-.6-.6-2.4z",
  cart: "M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4L21 8H6.2M10 21h.01M17 21h.01",
  plug: "M9 2v6M15 2v6M7 8h10v4a5 5 0 0 1-10 0V8zM12 17v5",
  monitor: "M3 4h18v12H3zM8 20h8M12 16v4",
  sync: "M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5",
  card: "M6 2h9l4 4v16H6zM10 2v5M13 2v5",
  save: "M5 3h12l4 4v14H3V5a2 2 0 0 1 2-2zM7 3v6h8V3M7 21v-7h10v7",
  folder: "M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  light: "M8 2h8v20H8zM12 7h.01M12 12h.01M12 17h.01",
  sys: "M4 20V8l8-5 8 5v12M9 20v-6h6v6",
  book: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v14H6.5A2.5 2.5 0 0 0 4 19.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5M9 8h6M9 12h6",
};
const MARCAS = {
  wa: "M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.2 21.8l5.1-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3Z",
  ig: "M12 7.3A4.7 4.7 0 1 0 16.7 12 4.7 4.7 0 0 0 12 7.3Zm0 7.8a3.1 3.1 0 1 1 3.1-3.1 3.1 3.1 0 0 1-3.1 3.1Zm6-8a1.1 1.1 0 1 1-1.1-1.1A1.1 1.1 0 0 1 18 7.1ZM21.1 8.2a5.4 5.4 0 0 0-1.5-3.8 5.5 5.5 0 0 0-3.8-1.5c-1.5-.1-6-.1-7.6 0a5.5 5.5 0 0 0-3.8 1.5 5.5 5.5 0 0 0-1.5 3.8c-.1 1.5-.1 6 0 7.6a5.4 5.4 0 0 0 1.5 3.8 5.5 5.5 0 0 0 3.8 1.5c1.5.1 6 .1 7.6 0a5.4 5.4 0 0 0 3.8-1.5 5.5 5.5 0 0 0 1.5-3.8c.1-1.5.1-6 0-7.6Zm-2 9.2a3.1 3.1 0 0 1-1.8 1.8c-1.2.5-4.1.4-5.3.4s-4.2.1-5.3-.4a3.1 3.1 0 0 1-1.8-1.8c-.5-1.2-.4-4.1-.4-5.4s-.1-4.2.4-5.3a3.1 3.1 0 0 1 1.8-1.8c1.2-.5 4.1-.4 5.3-.4s4.2-.1 5.3.4a3.1 3.1 0 0 1 1.8 1.8c.5 1.2.4 4.1.4 5.3s.1 4.2-.4 5.4Z",
  yt: "M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.7 15V9l5.8 3Z",
  gh: "M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5a3.1 3.1 0 0 0-1.3-1.7c-1-.7.1-.7.1-.7a2.4 2.4 0 0 1 1.8 1.2 2.5 2.5 0 0 0 3.4 1 2.5 2.5 0 0 1 .7-1.6c-2.6-.3-5.3-1.3-5.3-5.7a4.5 4.5 0 0 1 1.2-3.1 4.2 4.2 0 0 1 .1-3.1s1-.3 3.2 1.2a10.9 10.9 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2a4.2 4.2 0 0 1 .1 3.1 4.5 4.5 0 0 1 1.2 3.1c0 4.4-2.7 5.4-5.3 5.7a2.8 2.8 0 0 1 .8 2.2v3.2c0 .4.2.7.8.6A11.5 11.5 0 0 0 12 .5Z",
};
const sprite = () => `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
${Object.entries(TRACO).map(([n, d]) => `  <symbol id="i-${n}" viewBox="0 0 24 24"><path d="${d}"/></symbol>`).join("\n")}
${Object.entries(MARCAS).map(([n, d]) => `  <symbol id="i-${n}" viewBox="0 0 24 24"><path d="${d}"/></symbol>`).join("\n")}
</svg>`;

// ---------- cartões de projeto ----------
function midia(p, destaque) {
  const m = p.midia;
  const selo = `<span class="pill">${esc(p.selo)}</span>`;
  if (destaque && p.id === "meowguard") {
    return `<div class="media"><img src="/img/meowguard-tela-inicio-720.webp" srcset="/img/meowguard-tela-inicio-720.webp 720w, /img/meowguard-tela-inicio-1200.webp 1200w" sizes="(max-width: 1040px) 92vw, 580px" width="1200" height="675" alt="Tela inicial do MeoWGuard, com os cartões Conectar ao PC, Instalar jogos, Copiar meu cartucho e outros" loading="lazy">${selo}</div>`;
  }
  if (m.semaforo) return `<div class="media semaforo" aria-hidden="true"><span class="luz luz-vermelha"></span><span class="luz luz-laranja"></span><span class="luz luz-verde"></span>${selo}</div>`;
  if (m.logo) return `<div class="media logo"><img src="${m.logo}" width="${m.w}" height="${m.h}" alt="" loading="lazy">${selo}</div>`;
  const srcset = m.srcset ? ` srcset="${m.srcset}" sizes="${SIZES_CARTAO}"` : "";
  const foco = m.foco ? ` style="object-position:${m.foco}"` : "";
  return `<div class="media"><img src="${m.img}"${srcset} width="${m.w}" height="${m.h}" alt="" loading="lazy"${foco}>${selo}</div>`;
}

function cartao(p, { filtro = false, destaque = false } = {}) {
  const alvo = p.externo ? ' target="_blank" rel="noopener"' : "";
  const cats = filtro ? ` data-cats="${p.cats.join(" ")}"` : "";
  const etq = `<span class="etq etq-${p.tipo}">${ETIQUETA[p.tipo]}</span>`;
  return `        <a class="card pj spot${destaque ? " destaque" : ""}" href="${esc(p.href)}"${alvo}${cats}>
          ${midia(p, destaque)}
          <div class="pj-body"><h3>${esc(p.nome)} ${etq}</h3><p>${esc(p.texto)}</p><span class="go">${esc(p.cta)}<svg class="i" aria-hidden="true"><use href="#i-arrow"/></svg></span></div>
        </a>`;
}
const cartoes = (ids, opcoes) => ids.map((id) => cartao(porId(id), opcoes)).join("\n");

// ---------- topo ----------
const ICONE_MENU = { "corrida-certa": "light", sistemas: "sys" };
function itemMenu(p) {
  const alvo = p.externo ? ' target="_blank" rel="noopener"' : "";
  const icone = p.mini
    ? `<img src="${p.mini}" width="42" height="42" alt="" loading="lazy">`
    : `<span class="mini-ico"><svg class="i" aria-hidden="true"><use href="#i-${ICONE_MENU[p.id] ?? "arrow"}"/></svg></span>`;
  const novo = p.tipo === "novo" ? ' <em class="novo">Novo</em>' : "";
  return `            <a class="dd-item" href="${esc(p.href)}"${alvo}>${icone}<span><b>${esc(p.nome)}${novo}</b><small>${esc(p.curto)}</small></span></a>`;
}

function cabecalho(ativo) {
  const grupos = GRUPOS_MENU.map((g) => `          <section>
            <h3>${esc(g.titulo)}</h3>
${PROJETOS.filter((p) => p.grupo === g.id).map(itemMenu).join("\n")}
          </section>`).join("\n");
  const atual = (id) => (ativo === id ? ' aria-current="page"' : "");
  return `<header class="top">
  <div class="wrap">
    <a class="brand" href="/" aria-label="Tech MeoW, página inicial"><img src="/img/logo-branca.webp" width="400" height="400" alt=""><span>Tech <b>MeoW</b></span></a>
    <nav class="links" id="menuPrincipal" aria-label="Principal">
      <a href="/#reparos" data-sec="reparos">Reparos</a>
      <a class="hl" href="/#desbloqueio" data-sec="desbloqueio">Desbloqueio <i>R$ 339,90</i></a>
      <div class="dd">
        <a class="dd-btn" href="/projetos/" aria-haspopup="true" aria-expanded="false" aria-controls="menuProjetos"${atual("projetos")}>Projetos<svg class="i" aria-hidden="true"><use href="#i-chev"/></svg></a>
        <div class="dd-panel" id="menuProjetos">
          <div class="dd-grid">
${grupos}
          </div>
          <a class="dd-all" href="/projetos/"><span>Ver todos os projetos</span><svg class="i" aria-hidden="true"><use href="#i-arrow"/></svg></a>
        </div>
      </div>
      <a href="/#loja" data-sec="loja">Loja</a>
      <a href="/#contato" data-sec="contato">Contato</a>
      <a class="b wa wa-menu" href="${WHATSAPP.padrao}" target="_blank" rel="noopener"><svg class="ib" aria-hidden="true"><use href="#i-wa"/></svg>Chamar no WhatsApp</a>
    </nav>
    <div class="acoes">
      <button class="iconbtn" id="themeBtn" type="button" aria-label="Mudar entre claro e escuro" title="Mudar entre claro e escuro">
        <svg class="i-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
        <svg class="i-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v2.5M12 20v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M1.5 12H4M20 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/></svg>
      </button>
      <a class="b mg" href="/app/"${atual("app")} aria-label="MeoWGuard, lançamento"><em class="novo">Novo</em><span class="nome">MeoWGuard</span><span class="ar"><svg class="i" aria-hidden="true"><use href="#i-arrow"/></svg></span></a>
      <a class="b wa sm" href="${WHATSAPP.padrao}" target="_blank" rel="noopener"><svg class="ib" aria-hidden="true"><use href="#i-wa"/></svg>WhatsApp</a>
      <button class="iconbtn menu-btn" type="button" aria-expanded="false" aria-controls="menuPrincipal" aria-label="Abrir o menu"><svg class="i-bars" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><svg class="i-x" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>
  </div>
  <i id="scrollBar" aria-hidden="true"></i>
</header>`;
}

// ---------- rodapé ----------
function rodape({ fotos = false, legalExtra = "" } = {}) {
  const projetos = ["meowguard", "control-ps5", "hdmi-tool", "iron-check", "bancadasync", "controle-test"].map(porId)
    .map((p) => `<a href="${esc(p.href)}"${p.externo ? ' target="_blank" rel="noopener"' : ""}>${esc(p.nome)}</a>`).join("\n        ");
  const redes = [
    ["Instagram @tech_meow.oficial", "https://www.instagram.com/tech_meow.oficial/", "ig"],
    ["YouTube @techmeow", "https://www.youtube.com/@techmeow", "yt"],
    ["Instagram @honorio.dev", "https://www.instagram.com/honorio.dev/", "ig"],
    ["GitHub MeoWDev-MOD", "https://github.com/MeoWDev-MOD", "gh"],
    ["WhatsApp (21) 96654-7296", WHATSAPP.padrao, "wa"],
  ].map(([rotulo, url, icone]) => `<li><a href="${url}" target="_blank" rel="noopener" aria-label="${rotulo}" title="${rotulo}"><svg class="ib" aria-hidden="true"><use href="#i-${icone}"/></svg></a></li>`).join("\n        ");
  const credito = fotos
    ? `\n    <p>Fotos de terceiros: <a href="https://commons.wikimedia.org/wiki/File:Steam_Deck_(front).png" target="_blank" rel="noopener">“Steam Deck (front)”</a>, de Liam Dawe/GamingOnLinux (PNG de VulcanSphere), e <a href="https://commons.wikimedia.org/wiki/File:2023_MSI_GeForce_RTX_2080_Gaming_X_Trio_(3).jpg" target="_blank" rel="noopener">“2023 MSI GeForce RTX 2080 Gaming X Trio (3)”</a>, de Jacek Halicki, ambas <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>, via Wikimedia Commons, recortadas para esta página.</p>`
    : "";
  return `<footer>
  <div class="wrap">
    <div class="fgrid">
      <div class="fmarca">
        <a class="brand" href="/"><img src="/img/logo-branca.webp" width="400" height="400" alt=""><span>Tech <b>MeoW</b></span></a>
        <p>Assistência técnica de videogame no Rio de Janeiro. Rua Sergio Silva, 50 · Engenho da Rainha · CEP 20766-670. Segunda a sexta, das 10h às 18h. WhatsApp <span class="nw">(21) 96654-7296</span>.</p>
        <ul class="socials" aria-label="Redes">
        ${redes}
        </ul>
      </div>
      <nav class="fcol" aria-label="Serviços">
        <h4>Serviços</h4>
        <a href="/#reparos">Reparos</a>
        <a href="/#desbloqueio">Desbloqueio de Switch</a>
        <a href="/#loja">Loja</a>
        <a href="/#contato">Contato e mapa</a>
      </nav>
      <nav class="fcol" aria-label="Projetos">
        <h4>Projetos</h4>
        ${projetos}
        <a href="/projetos/">Ver todos</a>
        <a href="/app/acesso/">Meu acesso ao MeoWGuard</a>
      </nav>
      <nav class="fcol" aria-label="Site">
        <h4>Site</h4>
        <a href="/privacidade/">Privacidade e cookies</a>
        <a href="#" data-ck-manage>Rever cookies</a>
        <a href="https://github.com/MeoWDev-MOD" target="_blank" rel="noopener">GitHub</a>
      </nav>
    </div>
    <div class="legal">
      <p><strong>Aviso sobre pirataria:</strong> a Tech MeoW não vende, não instala e não incentiva jogos piratas nem cópias de jogos que o cliente não comprou. O desbloqueio serve para rodar homebrews e fazer a cópia de segurança dos jogos que você comprou (Lei 9.609/1998, art. 6º, I). Vender ou passar adiante cópias de jogos é crime. Cada pessoa responde pelo uso que faz do próprio aparelho.</p>${legalExtra}
      <p>Assistência independente, sem ligação com Sony, Nintendo, Valve, NVIDIA ou Microsoft. As marcas citadas pertencem aos seus donos.</p>${credito}
      <p class="copy"><span>© 2024–2026 MeoWDev-MOD · Todos os direitos reservados</span><span>Desenvolvido por MeoWDev MOD</span></p>
    </div>
  </div>
</footer>`;
}

// ---------- <head> ----------
const PRIMEIRO_SCRIPT = `<script>
  // sem esperar o resto da página: marca que há JavaScript, aplica o tema guardado e liga a chegada com cortina
  (function () { var d = document.documentElement; d.classList.add("js");
    try { var t = localStorage.getItem("tm.theme"); if (t === "light" || t === "dark") d.dataset.theme = t; } catch (e) {}
    try { if (sessionStorage.getItem("ps5.pt")) { sessionStorage.removeItem("ps5.pt"); d.classList.add("pt"); } } catch (e) {} })();
</script>`;

function head(p, css, js) {
  const url = SITE + p.caminho;
  const og = p.og ?? { titulo: p.titulo, descricao: p.descricao };
  const imagem = p.imagem ?? `${SITE}/img/og.jpg`;
  const linhas = [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`,
    `<title>${esc(p.titulo)}</title>`,
    p.descricao && `<meta name="description" content="${esc(p.descricao)}">`,
    p.keywords && `<meta name="keywords" content="${esc(p.keywords)}">`,
    `<meta name="robots" content="${p.robots ?? "index,follow,max-image-preview:large,max-snippet:-1"}">`,
    `<meta name="theme-color" content="#f4f1ff" media="(prefers-color-scheme: light)">`,
    `<meta name="theme-color" content="#0c0920" media="(prefers-color-scheme: dark)">`,
    !/noindex/.test(p.robots ?? "") && `<link rel="canonical" href="${url}">`,
    p.caminho === "/" && `<link rel="sitemap" type="application/xml" href="${SITE}/sitemap.xml">`,
    p.caminho === "/" && `<meta name="geo.region" content="BR-RJ">\n<meta name="geo.placename" content="Engenho da Rainha, Rio de Janeiro">\n<meta name="geo.position" content="-22.8637;-43.3001">\n<meta name="ICBM" content="-22.8637, -43.3001">`,
    !/noindex/.test(p.robots ?? "") && [
      `<meta property="og:type" content="website">`,
      `<meta property="og:site_name" content="Tech MeoW">`,
      `<meta property="og:locale" content="pt_BR">`,
      `<meta property="og:url" content="${url}">`,
      `<meta property="og:title" content="${esc(og.titulo)}">`,
      `<meta property="og:description" content="${esc(og.descricao)}">`,
      `<meta property="og:image" content="${imagem}">`,
      `<meta property="og:image:width" content="1200">`,
      `<meta property="og:image:height" content="630">`,
      `<meta property="og:image:alt" content="${esc(p.imagemAlt ?? "Tech MeoW, assistência técnica de videogame no Rio, com a promoção do desbloqueio de Switch por R$ 339,90")}">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${esc(og.titulo)}">`,
      `<meta name="twitter:description" content="${esc(og.descricao)}">`,
      `<meta name="twitter:image" content="${imagem}">`,
    ].join("\n"),
    `<link rel="icon" href="/img/logo-192.png" type="image/png">`,
    `<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">`,
    `<link rel="preload" href="/fonts/inter-regular.woff2" as="font" type="font/woff2" crossorigin>`,
    `<link rel="preload" href="/fonts/inter-bold.woff2" as="font" type="font/woff2" crossorigin>`,
    PRIMEIRO_SCRIPT,
    `<link rel="stylesheet" href="/tm.css?v=${css}">`,
    ...(p.jsonld ?? []).map((j) => `<script type="application/ld+json">\n${j}\n</script>`),
  ];
  return linhas.filter(Boolean).join("\n");
}

// ---------- páginas ----------
const lerJson = (arq) => JSON.stringify(JSON.parse(readFileSync(path.join(aqui, "paginas", arq), "utf8")), null, 2);
const absoluto = (href) => (href.startsWith("/") ? SITE + href.split("#")[0] : href);

const PAGINAS = [
  {
    corpo: "home.html", saida: "index.html", caminho: "/", ativo: "inicio", fotos: true,
    titulo: "Conserto de PS5, Switch e Steam Deck no Rio, RJ | Tech MeoW",
    descricao: "Assistência técnica de videogame no Engenho da Rainha (RJ): conserto de PS5, Switch, Steam Deck, placa de vídeo e controle. Desbloqueio de Switch R$ 339,90.",
    keywords: "conserto de PS5, assistência técnica de PS5 no RJ, PS5 sem imagem, troca do CI HDMI do PS5, conserto de PS5 Slim, conserto de Nintendo Switch, desbloqueio de Nintendo Switch, desbloqueio de Switch no RJ, conserto de Steam Deck, reparo de placa de vídeo, conserto de controle de PS5, assistência técnica de videogame, Engenho da Rainha, Zona Norte, Rio de Janeiro",
    og: { titulo: "Conserto de PS5, Switch e Steam Deck no Rio | Tech MeoW", descricao: "Assistência técnica de videogame no Engenho da Rainha, Zona Norte do Rio. Desbloqueio de Switch por R$ 339,90. Orçamento no WhatsApp." },
    jsonld: [lerJson("home.jsonld.json")],
  },
  {
    corpo: "projetos.html", saida: "projetos/index.html", caminho: "/projetos/", ativo: "projetos",
    titulo: "Projetos da Tech MeoW: apps, peças e cursos para Switch, PS5 e assistência técnica",
    descricao: "Tudo o que a Tech MeoW cria: MeoWGuard, Control PS-5, PS5 HDMI Tool, Iron Check, BancadaSync, PS-5 Controle Test, curso de desbloqueio de Switch e mais.",
    og: { titulo: "Projetos da Tech MeoW", descricao: "Apps, peças, cursos e sistemas para Nintendo Switch, PS5 e assistência técnica, num lugar só." },
    jsonld: [JSON.stringify({
      "@context": "https://schema.org", "@type": "CollectionPage", name: "Projetos da Tech MeoW", url: `${SITE}/projetos/`, inLanguage: "pt-BR",
      isPartOf: { "@id": `${SITE}/#site` },
      mainEntity: { "@type": "ItemList", itemListElement: PROJETOS.filter((p) => !p.href.startsWith("https://wa.me")).map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.nome, url: absoluto(p.href) })) },
    }, null, 2)],
  },
  {
    corpo: "app.html", saida: "app/index.html", caminho: "/app/", ativo: "app", scripts: ["/app/app.js"],
    titulo: "MeoWGuard: guarde e instale os jogos do seu Switch | Tech MeoW",
    descricao: "MeoWGuard: app em português para Nintendo Switch desbloqueado. Instale e faça backup dos jogos que você comprou, copie o cartucho, guarde saves e fotos, pelo cabo no Windows, Mac e Linux.",
    og: { titulo: "MeoWGuard: guarde e instale os jogos do seu Switch", descricao: "App em português para Nintendo Switch desbloqueado: instalação pelo cabo, backup do cartucho, saves e fotos." },
    legalExtra: `\n      <p>O MeoWGuard serve para rodar homebrews e fazer a cópia de segurança dos jogos que você comprou (Lei 9.609/1998, art. 6º, I). Vender ou passar adiante cópias de jogos é crime.</p>\n      <p>MeoWGuard é um produto independente, sem ligação com a Nintendo. Feito sobre o sphaira, de ITotalJustice e colaboradores, licença GPLv3.</p>`,
    jsonld: [JSON.stringify({
      "@context": "https://schema.org", "@type": "SoftwareApplication", name: "MeoWGuard", applicationCategory: "UtilitiesApplication",
      operatingSystem: "Nintendo Switch (homebrew)", inLanguage: "pt-BR", url: `${SITE}/app/`,
      author: { "@type": "Organization", name: "MeoWDev MOD", url: `${SITE}/` },
      description: "Instala e faz backup dos jogos que você comprou no Nintendo Switch desbloqueado, pelo cabo USB, no Windows, Mac e Linux.",
    }, null, 2), JSON.stringify({
      "@context": "https://schema.org", "@type": "VideoObject", name: "MeoWGuard: lançamento",
      description: "Instalar jogos pelo cabo, os 8 cartões do app e as cópias de segurança, com as telas reais do MeoWGuard.",
      thumbnailUrl: `${SITE}/video/meowguard-poster.jpg`, contentUrl: `${SITE}/video/meowguard-lancamento.mp4`,
      uploadDate: "2026-11-08", duration: "PT26S", inLanguage: "pt-BR",
    }, null, 2)],
  },
  {
    corpo: "acesso.html", saida: "app/acesso/index.html", caminho: "/app/acesso/", ativo: "app", robots: "noindex,nofollow", scripts: ["/app/acesso/acesso.js"],
    titulo: "Acesso ao MeoWGuard | Tech MeoW",
  },
  {
    corpo: "privacidade.html", saida: "privacidade/index.html", caminho: "/privacidade/", ativo: "",
    titulo: "Privacidade e cookies · Tech MeoW",
    descricao: "O que o site da Tech MeoW guarda no seu navegador e como os anúncios são contados.",
  },
];

export function montar() {
  const css = marca("tm.css");
  const js = marca("js/tm.js");
  const zap = (texto) => WHATSAPP.url(texto);
  const feitos = [];
  for (const p of PAGINAS) {
    let corpo = readFileSync(path.join(aqui, "paginas", p.corpo), "utf8")
      .replace("{{FILTROS}}", CATEGORIAS.map((c, i) => `        <label><input type="radio" name="cat" value="${c.id}"${i === 0 ? " checked" : ""}><span>${esc(c.rotulo)}</span></label>`).join("\n"))
      .replace("{{CARTOES_TODOS}}", [cartao(porId("meowguard"), { filtro: true, destaque: true }), cartoes(PROJETOS.filter((x) => x.id !== "meowguard").map((x) => x.id), { filtro: true })].join("\n"))
      .replace("{{CARTOES_DEPOIS}}", cartoes(["meowguard", "control-ps5", "jnx"]))
      .replace("{{CARTOES_PROJETOS}}", cartoes(["hdmi-tool", "iron-check", "bancadasync", "controle-test"]))
      .replace(/\{\{zap:([^}]+)\}\}/g, (_, texto) => zap(texto));
    if (/\{\{/.test(corpo)) throw new Error(`${p.corpo}: sobrou marcador sem trocar: ${corpo.match(/\{\{[^}]*\}\}/)[0]}`);
    const extras = (p.scripts ?? []).map((s) => `<script src="${s}" defer></script>`).join("\n");
    const pagina = `<!doctype html>
<html lang="pt-BR">
<head>
${head(p, css, js)}
</head>
<body>
<a class="skip" href="#conteudo">Ir para o conteúdo</a>
<canvas id="fxBg" aria-hidden="true"></canvas>
${sprite()}

${cabecalho(p.ativo)}

<main id="conteudo">
${corpo.replace(/\s+$/, "")}
</main>

${rodape({ fotos: p.fotos, legalExtra: p.legalExtra })}

<a class="fab" href="${WHATSAPP.padrao}" target="_blank" rel="noopener" aria-label="Chamar no WhatsApp"><svg class="ib" aria-hidden="true"><use href="#i-wa"/></svg><span>WhatsApp</span></a>
${extras ? extras + "\n" : ""}<script type="module" src="/js/tm.js?v=${js}"></script>
</body>
</html>
`;
    const destino = path.join(raiz, p.saida);
    mkdirSync(path.dirname(destino), { recursive: true });
    writeFileSync(destino, pagina);
    feitos.push(p.saida);
  }
  console.log("páginas:", feitos.join(", "), "| carimbos:", `tm.css?v=${css}`, `tm.js?v=${js}`);
  return feitos;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) montar();
