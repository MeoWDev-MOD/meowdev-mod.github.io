// MeoWGuard: pagamento pela InfinitePay (Pix e cartão). Funções usadas por checkout, acesso, baixar e pelo aviso de pagamento.
//
// A InfinitePay não tem chave secreta: para confirmar um pagamento ela pede três códigos da compra (order_nsu, transaction_nsu e
// slug). Para o cliente não ter que guardar três códigos, o servidor lembra da compra e entrega um CÓDIGO DE ACESSO curto
// (13 números, sempre começando com 99). Quem diz se o pagamento vale continua sendo a InfinitePay, perguntada na hora:
// se o dinheiro for devolvido, a resposta deixa de ser "paid" e o acesso fecha.
//
// Variáveis de ambiente (painel da Vercel, nunca no código):
//   INFINITEPAY_HANDLE   a InfiniteTag da conta que recebe, sem o $ (não é segredo)
//   KV_REST_API_URL e KV_REST_API_TOKEN   (ou UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN) o banco de dados Redis
//                        da Upstash, criado pelo painel da Vercel (Storage), onde ficam as compras
"use strict";

const crypto = require("node:crypto");

const API = "https://api.checkout.infinitepay.io";
const REFERENCIA = "meowguard-";
const PISO_CENTAVOS = 100; // o mínimo que a InfinitePay aceita (R$ 1,00): quem pagou continua com acesso se o preço mudar
const DESCRICAO = "MeoWGuard (aplicativo para Nintendo Switch)";

const handle = () => String(process.env.INFINITEPAY_HANDLE ?? "").trim().replace(/^\$/, "");
const lojaUrl = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const lojaToken = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

const handleValido = () => /^[A-Za-z0-9_.-]{1,60}$/.test(handle());
const lojaConfigurada = () => /^https:\/\//.test(lojaUrl()) && Boolean(lojaToken());
const configurado = () => handleValido() && lojaConfigurada();

// Os nomes das variáveis que faltam para a InfinitePay funcionar (nunca os valores).
function faltandoInfinitepay() {
  const f = [];
  if (!handleValido()) f.push("INFINITEPAY_HANDLE");
  if (!/^https:\/\//.test(lojaUrl())) f.push("KV_REST_API_URL");
  if (!lojaToken()) f.push("KV_REST_API_TOKEN");
  return f;
}

// Código de acesso: 13 números começando com 99 (os números do Mercado Pago têm 10 a 12 e não começam assim).
const ehCodigo = (id) => typeof id === "string" && /^99\d{11}$/.test(id);

// Os três códigos que voltam no endereço da página de acesso e no aviso de pagamento.
function parametrosValidos(p) {
  return Boolean(p) && /^meowguard-[0-9a-f]{16}$/.test(p.order_nsu ?? "") && /^[\w-]{6,80}$/.test(p.transaction_nsu ?? "") && /^[\w-]{3,80}$/.test(p.slug ?? "");
}

// ---- banco de dados (Redis da Upstash pelo endereço REST: um comando por chamada, em JSON)
async function comando(...args) {
  const r = await fetch(lojaUrl(), {
    method: "POST",
    headers: { Authorization: `Bearer ${lojaToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(8000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error("loja");
  return j.result;
}

async function chamar(caminho, corpo) {
  const r = await fetch(API + caminho, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(10000),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, corpo: j };
}

// Cria o link de pagamento e devolve o endereço, ou null se a InfinitePay não respondeu como esperado.
async function criarLink({ valor, voltar, aviso }) {
  const orderNsu = REFERENCIA + crypto.randomBytes(8).toString("hex");
  const r = await chamar("/links", {
    handle: handle(),
    order_nsu: orderNsu,
    redirect_url: voltar,
    webhook_url: aviso,
    items: [{ quantity: 1, price: Math.round(valor * 100), description: DESCRICAO }],
  });
  const j = r.corpo || {};
  const url = [j.url, j.checkout_url, j.link, j.link_url].find((v) => typeof v === "string" && v.startsWith("https://"));
  return r.ok && url ? url : null;
}

// Pergunta à InfinitePay se a compra foi paga. Só vale se os três códigos baterem e o valor for de pelo menos R$ 1.
async function conferir(p) {
  if (!parametrosValidos(p)) return { pago: false, pendente: false };
  const r = await chamar("/payment_check", { handle: handle(), order_nsu: p.order_nsu, transaction_nsu: p.transaction_nsu, slug: p.slug });
  const j = r.corpo || {};
  if (!r.ok || j.success !== true) return { pago: false, pendente: false };
  if (j.paid !== true) return { pago: false, pendente: true };
  return { pago: Number(j.amount) >= PISO_CENTAVOS, pendente: false };
}

// Guarda a compra (uma vez só: a mesma compra sempre devolve o mesmo código) e devolve o código de acesso.
async function registrar(p) {
  const chaveCompra = `mg:tx:${p.transaction_nsu}`;
  const jaTem = await comando("GET", chaveCompra);
  if (typeof jaTem === "string" && ehCodigo(jaTem)) return jaTem;
  const registro = JSON.stringify({ o: p.order_nsu, t: p.transaction_nsu, s: p.slug, em: Date.now() });
  for (let i = 0; i < 8; i++) {
    const codigo = "99" + String(crypto.randomInt(0, 1e11)).padStart(11, "0");
    if ((await comando("SET", `mg:cod:${codigo}`, registro, "NX")) !== "OK") continue;
    if ((await comando("SET", chaveCompra, codigo, "NX")) === "OK") return codigo;
    // outra chamada (a página e o aviso de pagamento chegam juntos) registrou primeiro: fica o código dela
    await comando("DEL", `mg:cod:${codigo}`);
    const outro = await comando("GET", chaveCompra);
    if (ehCodigo(outro)) return outro;
  }
  throw new Error("codigo");
}

// Com o código de acesso: acha a compra e pergunta à InfinitePay de novo (devolveu o dinheiro, o acesso some).
async function liberadoPorCodigo(codigo) {
  if (!ehCodigo(codigo)) return { liberado: false, motivo: "numero_invalido" };
  const bruto = await comando("GET", `mg:cod:${codigo}`);
  if (typeof bruto !== "string") return { liberado: false, motivo: "nao_encontrado" };
  let reg;
  try {
    reg = JSON.parse(bruto);
  } catch {
    return { liberado: false, motivo: "falha" };
  }
  const c = await conferir({ order_nsu: reg.o, transaction_nsu: reg.t, slug: reg.s });
  return c.pago ? { liberado: true } : { liberado: false, motivo: "nao_pago", pendente: c.pendente };
}

module.exports = { REFERENCIA, comando, lojaConfigurada, configurado, faltandoInfinitepay, ehCodigo, parametrosValidos, criarLink, conferir, registrar, liberadoPorCodigo };
