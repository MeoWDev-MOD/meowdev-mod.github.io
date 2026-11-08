// GET /api/versao: a versão mais nova do app, pública (não entrega arquivo nenhum). O app compara com a dele e avisa.
// Vem da última release do repositório privado do GitHub (ou, sem ele, das variáveis da Vercel).
"use strict";
const { ultimaVersao, versaoValida } = require("./_comum");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=300");
  const v = await ultimaVersao().catch(() => null);
  if (!v || !versaoValida(v.versao)) return res.status(200).json({ versao: null });
  res.status(200).json({ versao: v.versao, notas: v.notas });
};
