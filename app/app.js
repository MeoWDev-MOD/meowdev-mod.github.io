// Página do MeoWGuard: mostra o preço e leva ao pagamento. Não guarda nada no navegador.
"use strict";
(() => {
  const preco = document.getElementById("preco");
  const botao = document.getElementById("botaoComprar");
  const erro = document.getElementById("erroCompra");
  const brl = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function aviso(texto) {
    erro.textContent = texto;
    erro.hidden = !texto;
  }

  async function carregarPreco() {
    try {
      const r = await fetch("/api/preco", { cache: "no-store" });
      const j = await r.json();
      if (j.disponivel) {
        preco.textContent = brl(j.preco);
        botao.disabled = false;
        return;
      }
    } catch { /* cai no "em breve" */ }
    preco.textContent = "Em breve";
    botao.textContent = "Em breve";
  }

  botao.addEventListener("click", async () => {
    aviso("");
    botao.disabled = true;
    const texto = botao.textContent;
    botao.textContent = "Abrindo o pagamento…";
    try {
      const r = await fetch("/api/checkout", { method: "POST" });
      const j = await r.json();
      if (r.ok && typeof j.url === "string" && j.url.startsWith("https://")) {
        location.href = j.url;
        return;
      }
      aviso("Não deu para abrir o pagamento agora. Tente de novo em instantes ou chame no WhatsApp.");
    } catch {
      aviso("Sem conexão com o pagamento. Confira a internet e tente de novo.");
    }
    botao.textContent = texto;
    botao.disabled = false;
  });

  carregarPreco();
})();
