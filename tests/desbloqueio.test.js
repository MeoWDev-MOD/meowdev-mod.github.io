// Página do desbloqueio de Switch (/desbloqueio-switch/): confere a página já montada (rode node site-src/build.mjs antes).
// Rodar: node --test tests/desbloqueio.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DESBLOQUEIO } from "../site-src/montar-paginas.mjs";

const html = readFileSync(new URL("../desbloqueio-switch/index.html", import.meta.url), "utf8");
const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
const grafo = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
const no = (tipo) => grafo.find((n) => n["@type"] === tipo);
const reais = (s) => Number(s.replace("R$", "").replace(/\./g, "").replace(",", ".").trim());

test("o preço do Google (JSON-LD) é o mesmo da tela", () => {
  assert.equal(no("Service").offers.price, DESBLOQUEIO.preco);
  assert.equal(reais(DESBLOQUEIO.precoTela), Number(DESBLOQUEIO.preco));
  assert.ok(main.includes(`<b>${DESBLOQUEIO.precoTela}</b>`), "preço em destaque na página");
});

test("a parcela sem juros vezes o número de parcelas dá o preço (até 2 centavos de arredondamento)", () => {
  const total = reais(DESBLOQUEIO.parcelaTela) * DESBLOQUEIO.parcelas;
  assert.ok(Math.abs(total - Number(DESBLOQUEIO.preco)) <= 0.02, `${DESBLOQUEIO.parcelas}x ${DESBLOQUEIO.parcelaTela} = ${total.toFixed(2)}`);
  assert.ok(reais(DESBLOQUEIO.parcelaTela) * DESBLOQUEIO.parcelas <= Number(DESBLOQUEIO.preco), "a parcela não pode somar mais que o preço");
});

test("o preço antigo só aparece como \"de ... por\" (riscado na tela) e é maior que o preço", () => {
  assert.ok(reais(DESBLOQUEIO.precoAntigo) > Number(DESBLOQUEIO.preco));
  const usos = main.split(DESBLOQUEIO.precoAntigo).length - 1;
  const deSp = (main.match(new RegExp(`\\bde (<s>)?${DESBLOQUEIO.precoAntigo.replace(/[$.]/g, "\\$&")}`, "gi")) || []).length;
  assert.ok(usos >= 3, "faixa, cartão e chamada final");
  assert.equal(usos, deSp, "todo uso do preço antigo vem depois de \"de\"");
  assert.ok(main.includes(`<s>${DESBLOQUEIO.precoAntigo}</s> por apenas`), "riscado no cartão do preço");
});

test("a escassez é a real: preço vale enquanto durarem os chips (sem contador falso)", () => {
  assert.match(main, /enquanto durarem/i);
  assert.match(main, /chip/i);
  assert.doesNotMatch(main, /restam \d|últimas \d|countdown|cronômetro/i);
});

test("toda pergunta da tela está no FAQPage, com a mesma resposta", () => {
  const naTela = [...main.matchAll(/<details><summary>([\s\S]*?)<\/summary>/g)].map((m) => m[1]);
  const faq = no("FAQPage").mainEntity;
  assert.equal(faq.length, naTela.length);
  assert.ok(faq.length >= 8);
  faq.forEach((q, i) => {
    assert.equal(q.name, naTela[i]);
    assert.ok(q.acceptedAnswer.text.length > 20 && !/[<>]/.test(q.acceptedAnswer.text), `resposta limpa: ${q.name}`);
  });
});

test("nada sobre jogos no conteúdo da página (regra do dono) e só Switch 1", () => {
  const texto = main.replace(/<[^>]+>/g, " ");
  assert.doesNotMatch(texto, /\bjogos?\b/i);
  assert.match(texto, /Switch 2 ainda não tem desbloqueio/);
});

test("todos os botões do WhatsApp vão para o número da Tech MeoW com a mensagem pronta", () => {
  const links = [...html.matchAll(/href="(https:\/\/wa\.me\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(links.length >= 6);
  for (const l of links) {
    assert.ok(l.startsWith("https://wa.me/5521966547296?text="), l);
    assert.ok(decodeURIComponent(l.split("text=")[1]).length > 10);
  }
  assert.ok(links.some((l) => decodeURIComponent(l).includes(DESBLOQUEIO.precoTela)), "mensagem com o preço");
});

test("Instagram, vídeo e endereço certos; sem marcador esquecido", () => {
  assert.ok(main.includes("https://www.instagram.com/tech_meow.oficial/"));
  assert.ok(main.includes(`data-yt="${DESBLOQUEIO.video.id}"`));
  assert.ok(html.includes('<link rel="canonical" href="https://techmeow.app/desbloqueio-switch/">'));
  assert.doesNotMatch(html, /\{\{/);
});
