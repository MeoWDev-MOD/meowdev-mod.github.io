// POST /api/checkout: cria o pagamento no Mercado Pago (Pix, cartão de crédito e débito) e devolve o endereço dele.
"use strict";
const crypto = require("node:crypto");
const { REFERENCIA, site, preco, pronto, mp, responder } = require("./_comum");

module.exports = async (req, res) => {
  if (req.method !== "POST") return responder(res, 405, { erro: "metodo" });
  if (!pronto()) return responder(res, 503, { erro: "indisponivel" });

  const volta = `${site()}/app/acesso/`;
  const r = await mp("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [{ id: "meowguard", title: "MeoWGuard (aplicativo para Nintendo Switch)", quantity: 1, currency_id: "BRL", unit_price: preco() }],
      external_reference: REFERENCIA + crypto.randomBytes(8).toString("hex"),
      back_urls: { success: volta, pending: volta, failure: `${site()}/app/#comprar` },
      auto_return: "approved",
      statement_descriptor: "MEOWGUARD",
      payment_methods: { excluded_payment_types: [{ id: "ticket" }], installments: 3 },
    }),
  }).catch(() => null);

  if (!r || !r.ok || typeof r.corpo.init_point !== "string") return responder(res, 502, { erro: "mercado_pago" });
  responder(res, 200, { url: r.corpo.init_point });
};
