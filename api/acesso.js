// GET /api/acesso?payment_id=...: se o pagamento foi aprovado, devolve o vídeo e um link de download que vale 30 minutos.
"use strict";
const { pronto, idValido, pagamentoLiberado, linkDeDownload, responder } = require("./_comum");

module.exports = async (req, res) => {
  if (req.method !== "GET") return responder(res, 405, { erro: "metodo" });
  if (!pronto()) return responder(res, 503, { erro: "indisponivel" });

  const id = String(req.query?.payment_id ?? "").trim();
  if (!idValido(id)) return responder(res, 400, { erro: "numero_invalido" });

  const p = await pagamentoLiberado(id).catch(() => ({ liberado: false, motivo: "falha" }));
  if (!p.liberado) return responder(res, 200, { liberado: false, motivo: p.motivo, pendente: Boolean(p.pendente) });

  responder(res, 200, { liberado: true, video: process.env.VIDEO_URL || null, baixar: linkDeDownload(id) });
};
