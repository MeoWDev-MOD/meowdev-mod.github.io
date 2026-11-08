// MeoWGuard: pagamento e acesso. Funções comuns das rotas /api/*.
// Nada é guardado: quem diz se o pagamento vale é sempre o Mercado Pago, perguntado na hora. Se o dinheiro for
// devolvido, o status deixa de ser "approved" e o acesso some sozinho.
//
// Variáveis de ambiente (painel da Vercel, nunca no código):
//   MP_ACCESS_TOKEN  chave de acesso do Mercado Pago (segredo)
//   PRECO_BRL        preço em reais, ex.: 49.90
//   ACCESS_SECRET    texto longo e aleatório que assina os links de acesso (segredo)
//   VIDEO_URL        link do vídeo tutorial (YouTube "não listado" ou outro)
//
// Versões do app, de duas formas (a primeira vale se estiver configurada):
//   1) Repositório privado do GitHub, automático: cada release nova aparece sozinha no app.
//      GH_REPO   dono/nome do repositório privado, ex.: MeoWDev-MOD/meowguard-app
//      GH_TOKEN  chave do GitHub só de leitura desse repositório (segredo)
//      A release traz MeoWGuard.nro e MeoWGuard-pacote.zip; o texto dela, uma linha "sha256: ..." e, na primeira linha, o que mudou.
//   2) À mão, no painel da Vercel:
//      DOWNLOAD_URL  link do pacote do app (arquivo longo e imprevisível, no Vercel Blob)
//      APP_VERSION   versão mais nova do app, ex.: 2.1.0 (o app compara com a dele e avisa)
//      APP_NOTES     (opcional) o que mudou, em uma frase
//      NRO_URL       link do arquivo MeoWGuard.nro sozinho, para a atualização dentro do app
//      NRO_SHA256    impressão digital (SHA-256, minúsculas) desse arquivo, para o app conferir
//   SITE_URL         (opcional) endereço do site, padrão https://techmeow.app
"use strict";

const crypto = require("node:crypto");

const MP = "https://api.mercadopago.com";
const REFERENCIA = "meowguard-";
const VALIDADE_LINK_S = 30 * 60;

const site = () => (process.env.SITE_URL || "https://techmeow.app").replace(/\/+$/, "");

function preco() {
  const n = Number(String(process.env.PRECO_BRL ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= 1 ? Math.round(n * 100) / 100 : 0;
}

// Só vende quando está tudo configurado; senão o site mostra "em breve".
function pronto() {
  return Boolean(process.env.MP_ACCESS_TOKEN && process.env.ACCESS_SECRET && preco() > 0 && (process.env.DOWNLOAD_URL || githubConfigurado()));
}

async function mp(caminho, opcoes = {}) {
  const r = await fetch(MP + caminho, {
    ...opcoes,
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, "Content-Type": "application/json", ...(opcoes.headers || {}) },
    signal: AbortSignal.timeout(10000),
  });
  const corpo = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, corpo };
}

const idValido = (id) => typeof id === "string" && /^\d{5,20}$/.test(id);

// O pagamento só vale se: aprovado, em reais, desta loja/produto (referência nossa) e com o valor do preço.
async function pagamentoLiberado(id) {
  if (!idValido(id)) return { liberado: false, motivo: "numero_invalido" };
  const r = await mp(`/v1/payments/${id}`);
  if (!r.ok) return { liberado: false, motivo: "nao_encontrado" };
  const p = r.corpo;
  if (typeof p.external_reference !== "string" || !p.external_reference.startsWith(REFERENCIA)) return { liberado: false, motivo: "outro_produto" };
  if (p.currency_id !== "BRL" || Number(p.transaction_amount) + 0.001 < preco()) return { liberado: false, motivo: "valor_menor" };
  if (p.status !== "approved") return { liberado: false, motivo: p.status || "desconhecido", pendente: ["pending", "in_process", "authorized"].includes(p.status) };
  return { liberado: true };
}

// O "arquivo" (pacote ou nro) entra na assinatura: um link do pacote não serve para baixar o nro, nem o contrário.
const ARQUIVOS = ["pacote", "nro"];
const assinatura = (id, exp, arq) => crypto.createHmac("sha256", process.env.ACCESS_SECRET).update(`${id}.${exp}.${arq}`).digest("hex");

function linkDeDownload(id, agora = Date.now(), arq = "pacote") {
  const exp = Math.floor(agora / 1000) + VALIDADE_LINK_S;
  return `/api/baixar?payment_id=${id}&exp=${exp}&arq=${arq}&sig=${assinatura(id, exp, arq)}`;
}

function assinaturaValida(id, exp, sig, arq = "pacote", agora = Date.now()) {
  if (!idValido(id) || !/^\d{10}$/.test(String(exp)) || typeof sig !== "string" || !/^[0-9a-f]{64}$/.test(sig) || !ARQUIVOS.includes(arq)) return false;
  if (Number(exp) < Math.floor(agora / 1000)) return false;
  return crypto.timingSafeEqual(Buffer.from(assinatura(id, exp, arq)), Buffer.from(sig));
}

// Número de versão "2.1.0": só dígitos e pontos.
const versaoValida = (v) => typeof v === "string" && /^\d{1,3}(\.\d{1,3}){1,2}$/.test(v);

// ---- Versões do app no repositório privado do GitHub ----
const GH = "https://api.github.com";
const NOME_NRO = "MeoWGuard.nro";
const NOME_PACOTE = "MeoWGuard-pacote.zip";
const CACHE_MS = 60 * 1000;
let cacheRelease = { em: 0, valor: null };

function githubConfigurado() {
  return Boolean(process.env.GH_TOKEN && /^[\w.-]+\/[\w.-]+$/.test(process.env.GH_REPO ?? ""));
}

function zerarCache() {
  cacheRelease = { em: 0, valor: null };
}

async function gh(caminho, opcoes = {}) {
  return fetch(GH + caminho, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "techmeow-site",
      ...(opcoes.headers || {}),
    },
    signal: AbortSignal.timeout(10000),
  });
}

// A versão mais nova: { versao, notas, sha256, temNro, idNro, idPacote }, ou null se não houver.
async function ultimaVersao(agora = Date.now()) {
  if (!githubConfigurado()) {
    if (!versaoValida(process.env.APP_VERSION)) return null;
    return {
      versao: process.env.APP_VERSION,
      notas: String(process.env.APP_NOTES ?? "").slice(0, 200),
      sha256: /^[0-9a-f]{64}$/.test(process.env.NRO_SHA256 ?? "") ? process.env.NRO_SHA256 : null,
      temNro: Boolean(process.env.NRO_URL),
      idNro: null,
      idPacote: null,
    };
  }
  if (cacheRelease.valor && agora - cacheRelease.em < CACHE_MS) return cacheRelease.valor;

  const r = await gh(`/repos/${process.env.GH_REPO}/releases/latest`);
  if (!r.ok) return cacheRelease.valor; // GitHub fora do ar: segue com a última resposta boa
  const j = await r.json();
  const versao = String(j.tag_name ?? "").replace(/^v/i, "");
  if (!versaoValida(versao)) return null;
  const corpo = String(j.body ?? "");
  const hash = /sha256:\s*([0-9a-f]{64})/i.exec(corpo);
  const notas = corpo.split(/\r?\n/).map((l) => l.trim()).find((l) => l && !/^sha256:/i.test(l)) ?? "";
  const assets = Array.isArray(j.assets) ? j.assets : [];
  const nro = assets.find((a) => a.name === NOME_NRO);
  const pacote = assets.find((a) => a.name === NOME_PACOTE);
  const valor = {
    versao,
    notas: notas.slice(0, 200),
    sha256: hash ? hash[1].toLowerCase() : null,
    temNro: Boolean(nro),
    idNro: nro ? nro.id : null,
    idPacote: pacote ? pacote.id : null,
  };
  cacheRelease = { em: agora, valor };
  return valor;
}

// Para onde mandar quem tem acesso: o link temporário do GitHub (repositório privado) ou o configurado à mão.
async function destinoDoArquivo(arq) {
  if (!githubConfigurado()) return (arq === "nro" ? process.env.NRO_URL : process.env.DOWNLOAD_URL) || null;
  const v = await ultimaVersao();
  const id = v ? (arq === "nro" ? v.idNro : v.idPacote) : null;
  if (!Number.isInteger(id)) return null;
  const r = await gh(`/repos/${process.env.GH_REPO}/releases/assets/${id}`, { headers: { Accept: "application/octet-stream" }, redirect: "manual" });
  const lugar = r.headers.get("location");
  return r.status === 302 && typeof lugar === "string" && lugar.startsWith("https://") ? lugar : null;
}

function responder(res, status, corpo) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(corpo);
}

module.exports = { MP, REFERENCIA, site, preco, pronto, mp, idValido, pagamentoLiberado, linkDeDownload, assinaturaValida, versaoValida, githubConfigurado, ultimaVersao, destinoDoArquivo, zerarCache, responder };
