// MeoWGuard: pagamento e acesso. Funções comuns das rotas /api/*.
// Nada é guardado: quem diz se o pagamento vale é sempre o Mercado Pago, perguntado na hora. Se o dinheiro for
// devolvido, o status deixa de ser "approved" e o acesso some sozinho.
//
// Variáveis de ambiente (painel da Vercel, nunca no código):
//   MP_ACCESS_TOKEN  chave de acesso do Mercado Pago (segredo)
//   PRECO_BRL        preço em reais, ex.: 49.90
//   ACCESS_SECRET    texto longo e aleatório que assina os links de acesso (segredo)
//   VIDEO_URL        link do vídeo tutorial (YouTube "não listado" ou outro)
//   DOWNLOAD_URL     link do pacote do app (arquivo longo e imprevisível, no Vercel Blob)
//   APP_VERSION      versão mais nova do app, ex.: 2.1.0 (o app compara com a dele e avisa)
//   APP_NOTES        (opcional) o que mudou, em uma frase
//   NRO_URL          link do arquivo MeoWGuard.nro sozinho, para a atualização dentro do app
//   NRO_SHA256       impressão digital (SHA-256, minúsculas) desse arquivo, para o app conferir
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
  return Boolean(process.env.MP_ACCESS_TOKEN && process.env.ACCESS_SECRET && process.env.DOWNLOAD_URL && preco() > 0);
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

function responder(res, status, corpo) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(corpo);
}

module.exports = { MP, REFERENCIA, site, preco, pronto, mp, idValido, pagamentoLiberado, linkDeDownload, assinaturaValida, versaoValida, responder };
