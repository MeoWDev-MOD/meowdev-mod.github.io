// Testa o pagamento pela InfinitePay sem chamar nada de verdade: InfinitePay e banco de dados (Redis da Upstash) de mentira.
// Rodar: node --test tests/
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

delete process.env.MP_ACCESS_TOKEN;
process.env.INFINITEPAY_HANDLE = "tech_meow_teste";
process.env.KV_REST_API_URL = "https://loja-teste.upstash.io";
process.env.KV_REST_API_TOKEN = "LOJA-TOKEN-SECRETO";
process.env.ACCESS_SECRET = "segredo-de-teste-longo-e-aleatorio";
process.env.DOWNLOAD_URL = "https://exemplo.blob.vercel-storage.com/pacote-abc123.zip";
process.env.VIDEO_URL = "https://youtu.be/exemplo";
process.env.PRECO_BRL = "24,90";

const comum = require("../api/_comum");
const preco = require("../api/preco");
const checkout = require("../api/checkout");
const acesso = require("../api/acesso");
const baixar = require("../api/baixar");
const aviso = require("../api/infinitepay");

function resposta() {
  const r = { cabecalhos: {}, codigo: 200, corpo: null, destino: null };
  r.setHeader = (k, v) => { r.cabecalhos[k] = v; };
  r.status = (c) => { r.codigo = c; return r; };
  r.json = (c) => { r.corpo = c; return r; };
  r.redirect = (c, d) => { r.codigo = c; r.destino = d; return r; };
  return r;
}

// ---- mundo de mentira
const banco = new Map(); // o Redis
const compras = new Map(); // o que a InfinitePay sabe: "ordem|transação|slug" -> { amount, paid }
const chamadas = [];
let linksAceitos = true;

global.fetch = async (url, opcoes = {}) => {
  chamadas.push({ url: String(url), opcoes });
  const u = String(url);
  if (u === process.env.KV_REST_API_URL) {
    assert.equal(opcoes.headers.Authorization, "Bearer LOJA-TOKEN-SECRETO");
    const [cmd, chave, valor, extra] = JSON.parse(opcoes.body);
    let result = null;
    if (cmd === "GET") result = banco.has(chave) ? banco.get(chave) : null;
    else if (cmd === "DEL") { result = banco.delete(chave) ? 1 : 0; }
    else if (cmd === "SET") {
      if (extra === "NX" && banco.has(chave)) result = null;
      else { banco.set(chave, valor); result = "OK"; }
    } else throw new Error("comando inesperado: " + cmd);
    return { ok: true, status: 200, json: async () => ({ result }) };
  }
  if (u === "https://api.checkout.infinitepay.io/links") {
    if (!linksAceitos) return { ok: false, status: 500, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ url: "https://checkout.infinitepay.io/tech_meow_teste?lenc=abc" }) };
  }
  if (u === "https://api.checkout.infinitepay.io/payment_check") {
    const b = JSON.parse(opcoes.body);
    const c = b.handle === "tech_meow_teste" ? compras.get(`${b.order_nsu}|${b.transaction_nsu}|${b.slug}`) : null;
    if (!c) return { ok: true, status: 200, json: async () => ({ success: false, paid: false }) };
    return { ok: true, status: 200, json: async () => ({ success: true, paid: c.paid, amount: c.amount, paid_amount: c.amount, installments: 1, capture_method: "pix" }) };
  }
  throw new Error("chamada inesperada: " + u);
};

let n = 0;
function novaCompra({ amount = 2490, paid = true, prefixo = "meowguard-" } = {}) {
  n++;
  const p = { order_nsu: prefixo + String(n).padStart(16, "0").replace(/0/g, "a").slice(0, 16), transaction_nsu: `tx-${n}-abcdef`, slug: `slug${n}abc` };
  compras.set(`${p.order_nsu}|${p.transaction_nsu}|${p.slug}`, { amount, paid });
  return p;
}
const chave = (p) => `${p.order_nsu}|${p.transaction_nsu}|${p.slug}`;
const abrir = async (query) => { const r = resposta(); await acesso({ method: "GET", query }, r); return r; };

test("o botão liga só com tudo configurado, e o que falta aparece só pelo nome", () => {
  const r = resposta();
  preco({}, r);
  assert.deepEqual(r.corpo, { disponivel: true, preco: 24.9 });

  const guardado = process.env.KV_REST_API_TOKEN;
  delete process.env.KV_REST_API_TOKEN;
  assert.deepEqual(comum.faltando(), ["KV_REST_API_TOKEN"]);
  assert.equal(comum.pronto(), false);
  process.env.KV_REST_API_TOKEN = guardado;

  const h = process.env.INFINITEPAY_HANDLE;
  delete process.env.INFINITEPAY_HANDLE;
  assert.deepEqual(comum.faltando(), ["MP_ACCESS_TOKEN"]);
  process.env.INFINITEPAY_HANDLE = h;
  assert.equal(comum.pronto(), true);
});

test("checkout cria o link na InfinitePay em centavos, com a volta e o aviso, e só aceita POST", async () => {
  const errado = resposta();
  await checkout({ method: "GET" }, errado);
  assert.equal(errado.codigo, 405);

  const r = resposta();
  await checkout({ method: "POST" }, r);
  assert.equal(r.codigo, 200);
  assert.equal(r.corpo.url, "https://checkout.infinitepay.io/tech_meow_teste?lenc=abc");
  const enviado = JSON.parse(chamadas.at(-1).opcoes.body);
  assert.equal(enviado.handle, "tech_meow_teste");
  assert.deepEqual(enviado.items, [{ quantity: 1, price: 2490, description: "MeoWGuard (aplicativo para Nintendo Switch)" }]);
  assert.match(enviado.order_nsu, /^meowguard-[0-9a-f]{16}$/);
  assert.equal(enviado.redirect_url, "https://techmeow.app/app/acesso/");
  assert.equal(enviado.webhook_url, "https://techmeow.app/api/infinitepay");
});

test("checkout: se a InfinitePay não devolve o link, avisa em vez de mandar o cliente para lugar nenhum", async () => {
  linksAceitos = false;
  const r = resposta();
  await checkout({ method: "POST" }, r);
  assert.equal(r.codigo, 502);
  linksAceitos = true;
});

test("compra paga: a volta da InfinitePay confirma, dá o código de acesso e o mesmo código sempre", async () => {
  const p = novaCompra();
  const r = await abrir(p);
  assert.equal(r.corpo.liberado, true);
  assert.match(r.corpo.codigo, /^99\d{11}$/);
  assert.equal(r.corpo.video, "https://youtu.be/exemplo");
  assert.match(r.corpo.baixar, new RegExp(`^/api/baixar\\?payment_id=${r.corpo.codigo}&exp=\\d{10}&arq=pacote&sig=[0-9a-f]{64}$`));

  const de_novo = await abrir(p);
  assert.equal(de_novo.corpo.codigo, r.corpo.codigo);

  // depois, só com o código (outro dia, outro aparelho)
  const volta = await abrir({ payment_id: r.corpo.codigo });
  assert.equal(volta.corpo.liberado, true);
  assert.match(volta.corpo.baixar, /^\/api\/baixar\?payment_id=99\d{11}&/);
});

test("não libera: não pago, valor menor que R$ 1, outro produto, códigos trocados, número inexistente", async () => {
  const naoPago = novaCompra({ paid: false });
  const a = await abrir(naoPago);
  assert.equal(a.corpo.liberado, false);
  assert.equal(a.corpo.pendente, true);

  const barato = novaCompra({ amount: 50 });
  assert.equal((await abrir(barato)).corpo.liberado, false);

  const outro = novaCompra({ prefixo: "outroprod-" });
  const o = await abrir(outro);
  assert.equal(o.codigo, 400);

  const bom = novaCompra();
  const trocado = await abrir({ ...bom, transaction_nsu: "tx-outra-coisa" });
  assert.equal(trocado.corpo.liberado, false);
  assert.ok(![...banco.keys()].some((k) => k.includes("tx-outra-coisa")));

  const inexistente = await abrir({ payment_id: "9900000000000" });
  assert.equal(inexistente.corpo.liberado, false);
  assert.equal(inexistente.corpo.motivo, "nao_encontrado");

  const lixo = await abrir({ order_nsu: "meowguard-zzzz", transaction_nsu: "x", slug: "y" });
  assert.equal(lixo.codigo, 400);
});

test("dinheiro devolvido: o código para de abrir o acesso e o download", async () => {
  const p = novaCompra();
  const ok = await abrir(p);
  const link = new URLSearchParams(ok.corpo.baixar.split("?")[1]);
  const q = { payment_id: link.get("payment_id"), exp: link.get("exp"), sig: link.get("sig"), arq: "pacote" };

  const bom = resposta();
  await baixar({ method: "GET", query: q }, bom);
  assert.equal(bom.codigo, 302);
  assert.equal(bom.destino, process.env.DOWNLOAD_URL);

  compras.set(chave(p), { amount: 2490, paid: false }); // a InfinitePay passa a dizer que não está paga
  const fechado = await abrir({ payment_id: ok.corpo.codigo });
  assert.equal(fechado.corpo.liberado, false);
  const sem = resposta();
  await baixar({ method: "GET", query: q }, sem);
  assert.equal(sem.codigo, 403);
  assert.equal(sem.destino, null);
});

test("o aviso de pagamento registra a compra paga, ignora o que não é compra e não aceita mentira", async () => {
  const p = novaCompra();
  const corpo = { order_nsu: p.order_nsu, transaction_nsu: p.transaction_nsu, invoice_slug: p.slug, amount: 2490, paid_amount: 2490, capture_method: "pix", items: [] };
  const r = resposta();
  await aviso({ method: "POST", body: corpo }, r);
  assert.equal(r.codigo, 200);
  assert.match(banco.get(`mg:tx:${p.transaction_nsu}`), /^99\d{11}$/);
  // a página que chega depois recebe o mesmo código que o aviso já guardou
  const ab = await abrir(p);
  assert.equal(ab.corpo.codigo, banco.get(`mg:tx:${p.transaction_nsu}`));

  const falso = { order_nsu: "meowguard-1111111111111111", transaction_nsu: "tx-falso-123456", invoice_slug: "slugfalso1" };
  const f = resposta();
  await aviso({ method: "POST", body: falso }, f);
  assert.equal(f.codigo, 200);
  assert.ok(!banco.has("mg:tx:tx-falso-123456"));

  const semCodigos = resposta();
  await aviso({ method: "POST", body: { event: "created" } }, semCodigos);
  assert.equal(semCodigos.codigo, 200);
  assert.equal(semCodigos.corpo.ignorado, true);

  const get = resposta();
  await aviso({ method: "GET" }, get);
  assert.equal(get.codigo, 405);
});

test("o banco fora do ar não libera ninguém", async () => {
  const p = novaCompra();
  const ok = await abrir(p);
  const antes = global.fetch;
  global.fetch = async (url, o) => {
    if (String(url) === process.env.KV_REST_API_URL) return { ok: false, status: 500, json: async () => ({ error: "x" }) };
    return antes(url, o);
  };
  const r = resposta();
  await assert.doesNotReject(acesso({ method: "GET", query: { payment_id: ok.corpo.codigo } }, r)).catch(() => {});
  assert.notEqual(r.corpo?.liberado, true);
  global.fetch = antes;
});

test("segredos não aparecem nas respostas", async () => {
  const p = novaCompra();
  const r = await abrir(p);
  const c = resposta();
  await checkout({ method: "POST" }, c);
  const tudo = JSON.stringify([r.corpo, c.corpo]);
  assert.ok(!tudo.includes("LOJA-TOKEN-SECRETO"));
  assert.ok(!tudo.includes(process.env.ACCESS_SECRET));
});
