// GET /api/versao: a versão mais nova do app, pública (não entrega arquivo nenhum). O app compara com a dele e avisa.
"use strict";
const { versaoValida } = require("./_comum");

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=300");
  const versao = process.env.APP_VERSION;
  if (!versaoValida(versao)) return res.status(200).json({ versao: null });
  res.status(200).json({ versao, notas: String(process.env.APP_NOTES ?? "").slice(0, 200) });
};
