// Página do MeoWGuard: mostra o preço e leva ao pagamento. Não guarda nada no navegador.
"use strict";
(() => {
  const preco = document.getElementById("preco");
  const botao = document.getElementById("botaoComprar");
  const erro = document.getElementById("erroCompra");
  // Textos no idioma da página (<html lang>); as páginas en/, es/ e ru/ saem de site-src/i18n.
  const lang = (document.documentElement.lang || "pt").slice(0, 2).toLowerCase();
  const TR = {
      "en": {
          "Em breve": "Coming soon",
          "Abrindo o pagamento…": "Opening the payment…",
          "Não deu para abrir o pagamento agora. Tente de novo em instantes ou chame no WhatsApp.": "We could not open the payment right now. Try again in a moment or message us on WhatsApp.",
          "Sem conexão com o pagamento. Confira a internet e tente de novo.": "No connection to the payment service. Check your internet and try again."
      },
      "es": {
          "Em breve": "Muy pronto",
          "Abrindo o pagamento…": "Abriendo el pago…",
          "Não deu para abrir o pagamento agora. Tente de novo em instantes ou chame no WhatsApp.": "No pudimos abrir el pago ahora. Inténtalo de nuevo en unos instantes o escríbenos por WhatsApp.",
          "Sem conexão com o pagamento. Confira a internet e tente de novo.": "Sin conexión con el pago. Revisa tu internet e inténtalo de nuevo."
      },
      "ru": {
          "Em breve": "Скоро",
          "Abrindo o pagamento…": "Открываем оплату…",
          "Não deu para abrir o pagamento agora. Tente de novo em instantes ou chame no WhatsApp.": "Сейчас не удалось открыть оплату. Попробуйте ещё раз чуть позже или напишите нам в WhatsApp.",
          "Sem conexão com o pagamento. Confira a internet e tente de novo.": "Нет связи с платёжным сервисом. Проверьте интернет и попробуйте снова."
      }
  };
  const L = (s) => TR[lang]?.[s] ?? s;
  const brl = (n) => n.toLocaleString(lang === "pt" ? "pt-BR" : lang, { style: "currency", currency: "BRL" });

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
    preco.textContent = L("Em breve");
    botao.textContent = L("Em breve");
  }

  botao.addEventListener("click", async () => {
    aviso("");
    botao.disabled = true;
    const texto = botao.textContent;
    botao.textContent = L("Abrindo o pagamento…");
    try {
      const r = await fetch("/api/checkout", { method: "POST" });
      const j = await r.json();
      if (r.ok && typeof j.url === "string" && j.url.startsWith("https://")) {
        location.href = j.url;
        return;
      }
      aviso(L("Não deu para abrir o pagamento agora. Tente de novo em instantes ou chame no WhatsApp."));
    } catch {
      aviso(L("Sem conexão com o pagamento. Confira a internet e tente de novo."));
    }
    botao.textContent = texto;
    botao.disabled = false;
  });

  carregarPreco();
})();
