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
// GitHub de mentira: a última release do repositório privado e o link temporário de cada arquivo
let release = null;
const HASH_REL = "b".repeat(64);
const releaseBoa = (extra = {}) => ({
  tag_name: "v2.3.0",
  body: `Corrige o Mac e acelera a instalação\nsha256: ${HASH_REL}`,
  assets: [{ id: 111, name: "MeoWGuard.nro" }, { id: 222, name: "MeoWGuard-pacote.zip" }, { id: 333, name: "outro.txt" }],
  ...extra,
});
function githubDeMentira(u, opcoes) {
  assert.equal(opcoes.headers.Authorization, "Bearer GH-TOKEN-DE-TESTE");
  assert.equal(opcoes.headers["User-Agent"], "techmeow-site");
  if (u.endsWith("/repos/MeoWDev-MOD/meowguard-app/releases/latest")) {
    return release ? { ok: true, status: 200, json: async () => release } : { ok: false, status: 404, json: async () => ({}) };
  }
  const a = u.match(/\/releases\/assets\/(\d+)$/);
  if (a) {
    assert.equal(opcoes.headers.Accept, "application/octet-stream");
    assert.equal(opcoes.redirect, "manual");
    return { ok: false, status: 302, headers: { get: (k) => (k === "location" ? `https://objects.githubusercontent.com/temporario/${a[1]}?assinado=1` : null) } };
  }
  throw new Error("chamada inesperada ao GitHub: " + u);
}

global.fetch = async (url, opcoes = {}) => {
  chamadas.push({ url, opcoes });
  const u = String(url);
  if (u.startsWith("https://api.github.com/")) return githubDeMentira(u, opcoes);
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
  assert.match(r.corpo.baixar, /^\/api\/baixar\?payment_id=1234567890&exp=\d{10}&arq=pacote&sig=[0-9a-f]{64}$/);
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

// ---- atualização do app ----
const versao = require("../api/versao");
const atualizar = require("../api/atualizar");
const SHA = "a".repeat(64);

test("versão: pública, só aceita número de versão", async () => {
  process.env.APP_VERSION = "2.2.0";
  process.env.APP_NOTES = "Corrige o Mac";
  const r = resposta();
  await versao({}, r);
  assert.deepEqual(r.corpo, { versao: "2.2.0", notas: "Corrige o Mac" });
  process.env.APP_VERSION = "<script>";
  const r2 = resposta();
  await versao({}, r2);
  assert.deepEqual(r2.corpo, { versao: null });
  process.env.APP_VERSION = "2.2.0";
});

test("atualizar: com pagamento aprovado devolve o link do nro e o SHA-256; sem, não", async () => {
  process.env.NRO_URL = "https://exemplo.blob.vercel-storage.com/nro-xyz.nro";
  process.env.NRO_SHA256 = SHA;
  pagamentos = { 5000000001: pago(), 5000000002: pago({ status: "refunded" }) };

  const ok = resposta();
  await atualizar({ method: "GET", query: { payment_id: "5000000001" } }, ok);
  assert.equal(ok.corpo.liberado, true);
  assert.equal(ok.corpo.versao, "2.2.0");
  assert.equal(ok.corpo.sha256, SHA);
  assert.match(ok.corpo.url, /^https:\/\/techmeow\.app\/api\/baixar\?payment_id=5000000001&exp=\d{10}&arq=nro&sig=[0-9a-f]{64}$/);

  const devolvido = resposta();
  await atualizar({ method: "GET", query: { payment_id: "5000000002" } }, devolvido);
  assert.equal(devolvido.corpo.liberado, false);

  const ruim = resposta();
  await atualizar({ method: "GET", query: { payment_id: "x" } }, ruim);
  assert.equal(ruim.codigo, 400);

  process.env.NRO_SHA256 = "curto";
  const semConfig = resposta();
  await atualizar({ method: "GET", query: { payment_id: "5000000001" } }, semConfig);
  assert.equal(semConfig.codigo, 503);
  process.env.NRO_SHA256 = SHA;
});

test("download do nro: o link do pacote não baixa o nro e o do nro leva ao nro", async () => {
  pagamentos = { 5000000003: pago() };
  const pacote = new URL("https://x" + comum.linkDeDownload("5000000003")).searchParams;
  const nro = new URL("https://x" + comum.linkDeDownload("5000000003", Date.now(), "nro")).searchParams;

  const trocado = resposta();
  await baixar({ method: "GET", query: { payment_id: "5000000003", exp: pacote.get("exp"), sig: pacote.get("sig"), arq: "nro" } }, trocado);
  assert.equal(trocado.codigo, 403);

  const ok = resposta();
  await baixar({ method: "GET", query: Object.fromEntries(nro) }, ok);
  assert.equal(ok.codigo, 302);
  assert.equal(ok.destino, process.env.NRO_URL);

  const pacoteOk = resposta();
  await baixar({ method: "GET", query: Object.fromEntries(pacote) }, pacoteOk);
  assert.equal(pacoteOk.destino, process.env.DOWNLOAD_URL);
});

// ---- versões vindas do repositório privado do GitHub ----
function comGithub(fn) {
  return async () => {
    const antes = { repo: process.env.GH_REPO, token: process.env.GH_TOKEN, dl: process.env.DOWNLOAD_URL };
    process.env.GH_REPO = "MeoWDev-MOD/meowguard-app";
    process.env.GH_TOKEN = "GH-TOKEN-DE-TESTE";
    delete process.env.DOWNLOAD_URL;
    comum.zerarCache();
    release = releaseBoa();
    try {
      await fn();
    } finally {
      for (const [k, v] of Object.entries({ GH_REPO: antes.repo, GH_TOKEN: antes.token, DOWNLOAD_URL: antes.dl })) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
      comum.zerarCache();
      release = null;
    }
  };
}

test("GitHub: versão, notas e SHA-256 saem da última release, sem mexer em painel", comGithub(async () => {
  const r = resposta();
  await versao({}, r);
  assert.deepEqual(r.corpo, { versao: "2.3.0", notas: "Corrige o Mac e acelera a instalação" });

  const v = await comum.ultimaVersao();
  assert.equal(v.sha256, HASH_REL);
  assert.equal(v.temNro, true);
  assert.equal(v.idNro, 111);
  assert.equal(v.idPacote, 222);
}));

test("GitHub: release nova aparece depois do cache de 1 minuto", comGithub(async () => {
  assert.equal((await comum.ultimaVersao()).versao, "2.3.0");
  release = releaseBoa({ tag_name: "v2.4.0" });
  assert.equal((await comum.ultimaVersao()).versao, "2.3.0"); // ainda no cache
  assert.equal((await comum.ultimaVersao(Date.now() + 61 * 1000)).versao, "2.4.0");
}));

test("GitHub: atualizar devolve o SHA da release; sem o arquivo ou sem hash na release, fica indisponível", comGithub(async () => {
  pagamentos = { 6000000001: pago() };
  const ok = resposta();
  await atualizar({ method: "GET", query: { payment_id: "6000000001" } }, ok);
  assert.equal(ok.corpo.liberado, true);
  assert.equal(ok.corpo.versao, "2.3.0");
  assert.equal(ok.corpo.sha256, HASH_REL);

  comum.zerarCache();
  release = releaseBoa({ body: "Sem impressão digital" });
  const semHash = resposta();
  await atualizar({ method: "GET", query: { payment_id: "6000000001" } }, semHash);
  assert.equal(semHash.codigo, 503);

  comum.zerarCache();
  release = releaseBoa({ assets: [{ id: 222, name: "MeoWGuard-pacote.zip" }] });
  const semNro = resposta();
  await atualizar({ method: "GET", query: { payment_id: "6000000001" } }, semNro);
  assert.equal(semNro.codigo, 503);
}));

test("GitHub: o download só pede o link temporário depois de confirmar o pagamento", comGithub(async () => {
  pagamentos = { 6000000002: pago(), 6000000003: pago({ status: "refunded" }) };
  const nro = new URL("https://x" + comum.linkDeDownload("6000000002", Date.now(), "nro")).searchParams;
  const pacote = new URL("https://x" + comum.linkDeDownload("6000000002", Date.now(), "pacote")).searchParams;

  const antes = chamadas.length;
  const ok = resposta();
  await baixar({ method: "GET", query: Object.fromEntries(nro) }, ok);
  assert.equal(ok.codigo, 302);
  assert.equal(ok.destino, "https://objects.githubusercontent.com/temporario/111?assinado=1");

  const ok2 = resposta();
  await baixar({ method: "GET", query: Object.fromEntries(pacote) }, ok2);
  assert.equal(ok2.destino, "https://objects.githubusercontent.com/temporario/222?assinado=1");

  // pagamento devolvido: nenhuma chamada ao GitHub para baixar o arquivo
  const devolvido = new URL("https://x" + comum.linkDeDownload("6000000003", Date.now(), "nro")).searchParams;
  const mpAntes = chamadas.length;
  const negado = resposta();
  await baixar({ method: "GET", query: Object.fromEntries(devolvido) }, negado);
  assert.equal(negado.codigo, 403);
  assert.ok(chamadas.slice(mpAntes).every((c) => !String(c.url).includes("/releases/assets/")));
  assert.ok(chamadas.length > antes);
}));

test("GitHub: a chave do GitHub e o link temporário não aparecem nas respostas de versão e de atualização", comGithub(async () => {
  pagamentos = { 6000000004: pago() };
  const a = resposta();
  await versao({}, a);
  const b = resposta();
  await atualizar({ method: "GET", query: { payment_id: "6000000004" } }, b);
  for (const r of [a, b]) {
    assert.ok(!JSON.stringify(r).includes("GH-TOKEN-DE-TESTE"));
    assert.ok(!JSON.stringify(r).includes("objects.githubusercontent.com"));
  }
}));

test("GitHub fora do ar: segue com a última versão boa; sem nenhuma, versão nula", comGithub(async () => {
  assert.equal((await comum.ultimaVersao()).versao, "2.3.0");
  release = null; // o GitHub passa a responder erro
  assert.equal((await comum.ultimaVersao(Date.now() + 61 * 1000)).versao, "2.3.0");

  comum.zerarCache();
  const r = resposta();
  await versao({}, r);
  assert.deepEqual(r.corpo, { versao: null });
}));
