// POST /api/infinitepay: aviso de pagamento da InfinitePay. Não é preciso confiar no aviso: cada um é confirmado de novo
// com a InfinitePay antes de guardar a compra. Serve para a compra ficar registrada mesmo se o cliente fechar a página.
"use strict";
const { infinitepay, limitar, responder } = require("./_comum");

module.exports = async (req, res) => {
  if (req.method !== "POST") return responder(res, 405, { erro: "metodo" });
  if (!infinitepay.configurado()) return responder(res, 503, { erro: "indisponivel" });
  if (await limitar(req, res, "aviso", 120, 600)) return;

  const b = req.body && typeof req.body === "object" ? req.body : {};
  const p = { order_nsu: String(b.order_nsu ?? ""), transaction_nsu: String(b.transaction_nsu ?? ""), slug: String(b.invoice_slug ?? b.slug ?? "") };
  // avisos sem os três códigos (compra criada, cancelada...) ou de outro produto: nada a guardar, e 200 para ela não reenviar
  if (!infinitepay.parametrosValidos(p)) return responder(res, 200, { ok: true, ignorado: true });

  const c = await infinitepay.conferir(p).catch(() => null);
  if (!c) return responder(res, 400, { erro: "falha" }); // a InfinitePay tenta de novo mais tarde
  if (c.pago && !(await infinitepay.registrar(p).catch(() => null))) return responder(res, 400, { erro: "falha" });
  responder(res, 200, { ok: true });
};
