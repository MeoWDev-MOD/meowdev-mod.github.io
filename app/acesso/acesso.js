// Página de acesso: confere o pagamento no servidor e mostra o download e o vídeo. Não guarda nada no navegador.
"use strict";
(() => {
  const texto = document.getElementById("texto");
  const estado = document.getElementById("estado");
  const entregas = document.getElementById("entregas");
  const baixar = document.getElementById("baixar");
  const video = document.getElementById("video");
  const form = document.getElementById("form");
  const numero = document.getElementById("numero");

  // Textos no idioma da página (<html lang>); as páginas en/, es/ e ru/ saem de site-src/i18n.
  const lang = (document.documentElement.lang || "pt").slice(0, 2).toLowerCase();
  const TR = {
      "en": {
          "Conferindo o pagamento…": "Checking the payment…",
          "Esse código não parece certo.": "That code doesn't look right.",
          "Digite só os números do seu código de acesso.": "Type only the numbers of your access code.",
          "A venda ainda não está aberta.": "Sales are not open yet.",
          "Volte daqui a pouco ou chame no WhatsApp.": "Come back in a little while or message us on WhatsApp.",
          "Sem conexão com o servidor.": "No connection to the server.",
          "Confira a internet e tente de novo.": "Check your internet and try again.",
          "Pagamento aprovado. Obrigado por apoiar o projeto!": "Payment approved. Thank you for supporting the project!",
          "Seu código de acesso: ": "Your access code: ",
          ". Anote ou tire print: com ele você volta aqui quando quiser e atualiza o app.": ". Write it down or take a screenshot: with it you can come back here any time and update the app.",
          "Esperando o Pix ser confirmado…": "Waiting for the Pix to be confirmed…",
          "Assim que o pagamento cair, esta página abre sozinha. Pode deixar aberta.": "As soon as the payment clears, this page opens by itself. You can leave it open.",
          "Não encontramos um pagamento aprovado com esse código.": "We did not find an approved payment with that code.",
          "Esse pagamento foi devolvido ou cancelado, então o acesso foi encerrado.": "That payment was refunded or cancelled, so access was closed.",
          "Confira o código. Se acabou de pagar, espere um minuto e tente de novo. Se o dinheiro foi devolvido, o acesso é encerrado.": "Check the code. If you just paid, wait a minute and try again. If the money was refunded, access is closed.",
          "Digite o código de acesso para abrir o seu acesso.": "Type your access code to open your access."
      },
      "es": {
          "Conferindo o pagamento…": "Comprobando el pago…",
          "Esse código não parece certo.": "Ese código no parece correcto.",
          "Digite só os números do seu código de acesso.": "Escribe solo los números de tu código de acceso.",
          "A venda ainda não está aberta.": "La venta todavía no está abierta.",
          "Volte daqui a pouco ou chame no WhatsApp.": "Vuelve en un rato o escríbenos por WhatsApp.",
          "Sem conexão com o servidor.": "Sin conexión con el servidor.",
          "Confira a internet e tente de novo.": "Revisa tu internet e inténtalo de nuevo.",
          "Pagamento aprovado. Obrigado por apoiar o projeto!": "Pago aprobado. ¡Gracias por apoyar el proyecto!",
          "Seu código de acesso: ": "Tu código de acceso: ",
          ". Anote ou tire print: com ele você volta aqui quando quiser e atualiza o app.": ". Anótalo o haz una captura: con él vuelves aquí cuando quieras y actualizas la app.",
          "Esperando o Pix ser confirmado…": "Esperando la confirmación del Pix…",
          "Assim que o pagamento cair, esta página abre sozinha. Pode deixar aberta.": "En cuanto se acredite el pago, esta página se abre sola. Puedes dejarla abierta.",
          "Não encontramos um pagamento aprovado com esse código.": "No encontramos un pago aprobado con ese código.",
          "Esse pagamento foi devolvido ou cancelado, então o acesso foi encerrado.": "Ese pago fue devuelto o cancelado, así que el acceso se cerró.",
          "Confira o código. Se acabou de pagar, espere um minuto e tente de novo. Se o dinheiro foi devolvido, o acesso é encerrado.": "Revisa el código. Si acabas de pagar, espera un minuto e inténtalo de nuevo. Si el dinero fue devuelto, el acceso se cierra.",
          "Digite o código de acesso para abrir o seu acesso.": "Escribe tu código de acceso para abrir tu acceso."
      },
      "ru": {
          "Conferindo o pagamento…": "Проверяем оплату…",
          "Esse código não parece certo.": "Этот код выглядит неправильно.",
          "Digite só os números do seu código de acesso.": "Введите только цифры кода доступа.",
          "A venda ainda não está aberta.": "Продажи ещё не открыты.",
          "Volte daqui a pouco ou chame no WhatsApp.": "Загляните чуть позже или напишите нам в WhatsApp.",
          "Sem conexão com o servidor.": "Нет связи с сервером.",
          "Confira a internet e tente de novo.": "Проверьте интернет и попробуйте снова.",
          "Pagamento aprovado. Obrigado por apoiar o projeto!": "Оплата подтверждена. Спасибо, что поддерживаете проект!",
          "Seu código de acesso: ": "Ваш код доступа: ",
          ". Anote ou tire print: com ele você volta aqui quando quiser e atualiza o app.": ". Запишите его или сделайте скриншот: с ним вы сможете вернуться сюда в любой момент и обновить приложение.",
          "Esperando o Pix ser confirmado…": "Ждём подтверждения Pix…",
          "Assim que o pagamento cair, esta página abre sozinha. Pode deixar aberta.": "Как только оплата поступит, страница откроется сама. Можете оставить её открытой.",
          "Não encontramos um pagamento aprovado com esse código.": "Мы не нашли подтверждённую оплату с этим кодом.",
          "Esse pagamento foi devolvido ou cancelado, então o acesso foi encerrado.": "Этот платёж был возвращён или отменён, поэтому доступ закрыт.",
          "Confira o código. Se acabou de pagar, espere um minuto e tente de novo. Se o dinheiro foi devolvido, o acesso é encerrado.": "Проверьте код. Если вы только что оплатили, подождите минуту и попробуйте снова. Если деньги были возвращены, доступ закрывается.",
          "Digite o código de acesso para abrir o seu acesso.": "Введите код доступа, чтобы открыть доступ."
      }
  };
  const L = (s) => TR[lang]?.[s] ?? s;

  let tentativas = 0;
  let timer = 0;

  function mostrar(classe, msg) {
    estado.className = "estado" + (classe ? " " + classe : "");
    estado.textContent = msg;
    estado.hidden = !msg;
  }

  // consulta: o que vai depois do "?" (o código de acesso, ou os três códigos que a InfinitePay devolve logo depois de pagar)
  async function consultar(id, consulta) {
    clearTimeout(timer);
    entregas.hidden = true;
    mostrar("", L("Conferindo o pagamento…"));
    const q = consulta || "payment_id=" + encodeURIComponent(id);
    let j;
    try {
      const r = await fetch("/api/acesso?" + q, { cache: "no-store" });
      j = await r.json();
      if (r.status === 400) {
        texto.textContent = L("Esse código não parece certo.");
        return mostrar("erro", L("Digite só os números do seu código de acesso."));
      }
      if (r.status === 503) {
        texto.textContent = L("A venda ainda não está aberta.");
        return mostrar("erro", L("Volte daqui a pouco ou chame no WhatsApp."));
      }
    } catch {
      texto.textContent = L("Sem conexão com o servidor.");
      return mostrar("erro", L("Confira a internet e tente de novo."));
    }

    if (j.liberado) {
      tentativas = 0;
      const codigo = j.codigo || id;
      numero.value = codigo;
      texto.textContent = L("Pagamento aprovado. Obrigado por apoiar o projeto!");
      mostrar("ok", L("Seu código de acesso: ") + codigo + L(". Anote ou tire print: com ele você volta aqui quando quiser e atualiza o app."));
      baixar.href = j.baixar;
      video.hidden = !j.video;
      if (j.video) video.href = j.video;
      entregas.hidden = false;
      return;
    }

    if (j.pendente && tentativas < 120) {
      // Pix ainda não compensou: confere de novo a cada 5 segundos, por até 10 minutos
      tentativas++;
      texto.textContent = L("Esperando o Pix ser confirmado…");
      mostrar("", L("Assim que o pagamento cair, esta página abre sozinha. Pode deixar aberta."));
      timer = setTimeout(() => consultar(id, consulta), 5000);
      return;
    }

    texto.textContent = L("Não encontramos um pagamento aprovado com esse código.");
    mostrar("erro", j.motivo === "refunded" || j.motivo === "cancelled"
      ? L("Esse pagamento foi devolvido ou cancelado, então o acesso foi encerrado.")
      : L("Confira o código. Se acabou de pagar, espere um minuto e tente de novo. Se o dinheiro foi devolvido, o acesso é encerrado."));
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    tentativas = 0;
    consultar(numero.value.trim());
  });

  // A InfinitePay volta para esta página com os códigos da compra no endereço; o Mercado Pago, com o número do pagamento
  const p = new URLSearchParams(location.search);
  const compra = ["order_nsu", "transaction_nsu", "slug"].map((k) => [k, p.get(k)]);
  const id = p.get("payment_id") || p.get("collection_id");
  if (compra.every(([, v]) => v)) {
    consultar("", new URLSearchParams(compra).toString());
  } else if (id && /^\d{5,20}$/.test(id)) {
    numero.value = id;
    consultar(id);
  } else {
    texto.textContent = L("Digite o código de acesso para abrir o seu acesso.");
  }
})();
