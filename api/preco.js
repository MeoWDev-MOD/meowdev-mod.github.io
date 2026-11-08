// GET /api/preco: o site mostra o preço e liga o botão "Comprar" só quando o pagamento está configurado.
"use strict";
const { preco, pronto } = require("./_comum");

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=60");
  const ok = pronto();
  res.status(200).json({ disponivel: ok, preco: ok ? preco() : null });
};
