// Testa o pagamento do MeoWGuard sem chamar o Mercado Pago de verdade (fetch de mentira).
// Rodar: node --test tests/
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.MP_ACCESS_TOKEN = "TOKEN-DE-TESTE";
process.env.ACCESS_SECRET = "segredo-de-teste-longo-e-aleatorio";
process.env.DOWNLOAD_URL = "https://exemplo.blob.vercel-storage.com/pacote-abc123.zip";
process.env.VIDEO_URL = "https://youtu.be/exemplo";
process.env.PRECO_BRL = "49,90";

const comum = require("../api/_comum");
const preco = require("../api/preco");
const checkout = require("../api/checkout");
const acesso = require("../api/acesso");
const baixar = require("../api/baixar");

function resposta() {
  const r = { cabecalhos: {}, codigo: 200, corpo: null, destino: null };
  r.setHeader = (k, v) => { r.cabecalhos[k] = v; };
  r.status = (c) => { r.codigo = c; return r; };
  r.json = (c) => { r.corpo = c; return r; };
  r.redirect = (c, d) => { r.codigo = c; r.destino = d; return r; };
  return r;
}

let pagamentos = {};
const chamadas = [];
global.fetch = async (url, opcoes = {}) => {
  chamadas.push({ url, opcoes });
  const u = String(url);
  assert.equal(opcoes.headers.Authorization, "Bearer TOKEN-DE-TESTE");
  const m = u.match(/\/v1\/payments\/(\d+)$/);
  if (m) {
    const p = pagamentos[m[1]];
    return { ok: Boolean(p), status: p ? 200 : 404, json: async () => p || { message: "not found" } };
  }
  if (u.endsWith("/checkout/preferences")) {
    return { ok: true, status: 201, json: async () => ({ init_point: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=1" }) };
  }
  throw new Error("chamada inesperada: " + u);
};

const pago = (extra = {}) => ({ status: "approved", currency_id: "BRL", transaction_amount: 49.9, external_reference: "meowguard-abc", ...extra });

test("o preço aceita vírgula e o botão só liga com tudo configurado", () => {
  assert.equal(comum.preco(), 49.9);
  const r = resposta();
  preco({}, r);
  assert.deepEqual(r.corpo, { disponivel: true, preco: 49.9 });

  const guardado = process.env.MP_ACCESS_TOKEN;
  delete process.env.MP_ACCESS_TOKEN;
  const r2 = resposta();
  preco({}, r2);
  assert.deepEqual(r2.corpo, { disponivel: false, preco: null });
  process.env.MP_ACCESS_TOKEN = guardado;
});

test("checkout cria o pagamento com Pix, crédito e débito, sem boleto, e só aceita POST", async () => {
  const errado = resposta();
  await checkout({ method: "GET" }, errado);
  assert.equal(errado.codigo, 405);

  const r = resposta();
  await checkout({ method: "POST" }, r);
  assert.equal(r.codigo, 200);
  assert.match(r.corpo.url, /^https:\/\/www\.mercadopago\.com\.br\//);
  const enviado = JSON.parse(chamadas.at(-1).opcoes.body);
  assert.equal(enviado.items[0].unit_price, 49.9);
  assert.equal(enviado.items[0].currency_id, "BRL");
  assert.match(enviado.external_reference, /^meowguard-[0-9a-f]{16}$/);
  assert.deepEqual(enviado.payment_methods.excluded_payment_types, [{ id: "ticket" }]);
  assert.equal(enviado.back_urls.success, "https://techmeow.app/app/acesso/");
});

test("pagamento aprovado libera o vídeo e um link de download assinado", async () => {
  pagamentos = { 1234567890: pago() };
  const r = resposta();
  await acesso({ method: "GET", query: { payment_id: "1234567890" } }, r);
  assert.equal(r.corpo.liberado, true);
  assert.equal(r.corpo.video, "https://youtu.be/exemplo");
  assert.match(r.corpo.baixar, /^\/api\/baixar\?payment_id=1234567890&exp=\d{10}&sig=[0-9a-f]{64}$/);
  assert.equal(r.cabecalhos["Cache-Control"], "no-store");
});

test("Pix ainda pendente não libera, mas avisa que está pendente", async () => {
  pagamentos = { 1111111111: pago({ status: "pending" }) };
  const r = resposta();
  await acesso({ method: "GET", query: { payment_id: "1111111111" } }, r);
  assert.equal(r.corpo.liberado, false);
  assert.equal(r.corpo.pendente, true);
});

test("não libera: dinheiro devolvido, valor menor, outro produto, número inexistente ou inválido", async () => {
  pagamentos = {
    2000000001: pago({ status: "refunded" }),
    2000000002: pago({ transaction_amount: 5 }),
    2000000003: pago({ external_reference: "outra-loja-1" }),
    2000000004: pago({ currency_id: "USD" }),
  };
  for (const id of ["2000000001", "2000000002", "2000000003", "2000000004", "2999999999"]) {
    const r = resposta();
    await acesso({ method: "GET", query: { payment_id: id } }, r);
    assert.equal(r.corpo.liberado, false, id);
  }
  for (const id of ["abc", "12", "1; DROP TABLE", ""]) {
    const r = resposta();
    await acesso({ method: "GET", query: { payment_id: id } }, r);
    assert.equal(r.codigo, 400, id);
  }
});

test("download: com link bom vai para o arquivo; adulterado, vencido ou depois da devolução não", async () => {
  pagamentos = { 3000000001: pago() };
  const a = resposta();
  await acesso({ method: "GET", query: { payment_id: "3000000001" } }, a);
  const q = Object.fromEntries(new URL("https://x" + a.corpo.baixar).searchParams);

  const ok = resposta();
  await baixar({ method: "GET", query: q }, ok);
  assert.equal(ok.codigo, 302);
  assert.equal(ok.destino, process.env.DOWNLOAD_URL);

  const adulterado = resposta();
  await baixar({ method: "GET", query: { ...q, payment_id: "3000000002" } }, adulterado);
  assert.equal(adulterado.codigo, 403);

  const sigRuim = resposta();
  await baixar({ method: "GET", query: { ...q, sig: "0".repeat(64) } }, sigRuim);
  assert.equal(sigRuim.codigo, 403);

  const velha = comum.linkDeDownload("3000000001", Date.now() - 3600 * 1000);
  const qv = Object.fromEntries(new URL("https://x" + velha).searchParams);
  const vencido = resposta();
  await baixar({ method: "GET", query: qv }, vencido);
  assert.equal(vencido.codigo, 403);

  pagamentos = { 3000000001: pago({ status: "refunded" }) };
  const devolvido = resposta();
  await baixar({ method: "GET", query: q }, devolvido);
  assert.equal(devolvido.codigo, 403);
});

test("a chave do Mercado Pago nunca aparece nas respostas", async () => {
  pagamentos = { 4000000001: pago() };
  const r = resposta();
  await acesso({ method: "GET", query: { payment_id: "4000000001" } }, r);
  assert.ok(!JSON.stringify(r).includes("TOKEN-DE-TESTE"));
  assert.ok(!JSON.stringify(r).includes("segredo-de-teste"));
});
