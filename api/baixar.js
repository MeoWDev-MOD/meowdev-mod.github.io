// GET /api/baixar?payment_id=...&exp=...&sig=...: confere a assinatura e o pagamento e manda para o arquivo do app.
"use strict";
const { pronto, pagamentoLiberado, assinaturaValida, destinoDoArquivo, limitar, responder } = require("./_comum");

module.exports = async (req, res) => {
  if (req.method !== "GET") return responder(res, 405, { erro: "metodo" });
  if (!pronto()) return responder(res, 503, { erro: "indisponivel" });
  if (await limitar(req, res, "baixar", 40, 600)) return;

  const { payment_id: id, exp, sig, arq = "pacote" } = req.query || {};
  if (!assinaturaValida(String(id ?? ""), String(exp ?? ""), String(sig ?? ""), String(arq))) return responder(res, 403, { erro: "link_invalido" });

  const p = await pagamentoLiberado(String(id)).catch(() => ({ liberado: false }));
  if (!p.liberado) return responder(res, 403, { erro: "sem_acesso" });

  // só depois de confirmar o pagamento: o link temporário do arquivo nunca é pedido (nem aparece) antes disso
  const destino = await destinoDoArquivo(String(arq)).catch(() => null);
  if (!destino) return responder(res, 503, { erro: "indisponivel" });

  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, destino);
};
