// GET /api/atualizar?payment_id=...: dentro do app. Com pagamento aprovado, devolve o link do arquivo novo e o SHA-256 dele.
"use strict";
const { pronto, idValido, pagamentoLiberado, linkDeDownload, versaoValida, site, responder } = require("./_comum");

module.exports = async (req, res) => {
  if (req.method !== "GET") return responder(res, 405, { erro: "metodo" });
  if (!pronto() || !versaoValida(process.env.APP_VERSION) || !process.env.NRO_URL || !/^[0-9a-f]{64}$/.test(process.env.NRO_SHA256 ?? "")) {
    return responder(res, 503, { erro: "indisponivel" });
  }
  const id = String(req.query?.payment_id ?? "").trim();
  if (!idValido(id)) return responder(res, 400, { erro: "numero_invalido" });

  const p = await pagamentoLiberado(id).catch(() => ({ liberado: false, motivo: "falha" }));
  if (!p.liberado) return responder(res, 200, { liberado: false, motivo: p.motivo });

  responder(res, 200, {
    liberado: true,
    versao: process.env.APP_VERSION,
    sha256: process.env.NRO_SHA256,
    url: site() + linkDeDownload(id, Date.now(), "nro"),
  });
};
