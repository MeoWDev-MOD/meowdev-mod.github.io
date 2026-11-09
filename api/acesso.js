// GET /api/acesso?payment_id=...: se o pagamento foi aprovado, devolve o vídeo e um link de download que vale 30 minutos.
// Logo depois de pagar na InfinitePay, a página chega com ?order_nsu=...&transaction_nsu=...&slug=...: o servidor confirma a
// compra, guarda e devolve o código de acesso (o "payment_id" dali em diante).
"use strict";
const { pronto, idValido, pagamentoLiberado, linkDeDownload, infinitepay, responder } = require("./_comum");

async function pelaCompra(q, res) {
  if (!infinitepay.configurado()) return responder(res, 503, { erro: "indisponivel" });
  const p = { order_nsu: String(q.order_nsu ?? "").trim(), transaction_nsu: String(q.transaction_nsu ?? "").trim(), slug: String(q.slug ?? "").trim() };
  if (!infinitepay.parametrosValidos(p)) return responder(res, 400, { erro: "numero_invalido" });
  const c = await infinitepay.conferir(p).catch(() => ({ pago: false, pendente: false, falha: true }));
  if (!c.pago) return responder(res, 200, { liberado: false, motivo: c.falha ? "falha" : "nao_pago", pendente: Boolean(c.pendente) });
  const codigo = await infinitepay.registrar(p).catch(() => null);
  if (!codigo) return responder(res, 200, { liberado: false, motivo: "falha", pendente: true });
  responder(res, 200, { liberado: true, codigo, video: process.env.VIDEO_URL || null, baixar: linkDeDownload(codigo) });
}

module.exports = async (req, res) => {
  if (req.method !== "GET") return responder(res, 405, { erro: "metodo" });
  if (!pronto()) return responder(res, 503, { erro: "indisponivel" });
  if (req.query?.order_nsu) return pelaCompra(req.query, res);

  const id = String(req.query?.payment_id ?? "").trim();
  if (!idValido(id)) return responder(res, 400, { erro: "numero_invalido" });

  const p = await pagamentoLiberado(id).catch(() => ({ liberado: false, motivo: "falha" }));
  if (!p.liberado) return responder(res, 200, { liberado: false, motivo: p.motivo, pendente: Boolean(p.pendente) });

  responder(res, 200, { liberado: true, video: process.env.VIDEO_URL || null, baixar: linkDeDownload(id) });
};
