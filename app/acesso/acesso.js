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

  let tentativas = 0;
  let timer = 0;

  function mostrar(classe, msg) {
    estado.className = "estado" + (classe ? " " + classe : "");
    estado.textContent = msg;
    estado.hidden = !msg;
  }

  async function consultar(id) {
    clearTimeout(timer);
    entregas.hidden = true;
    mostrar("", "Conferindo o pagamento…");
    let j;
    try {
      const r = await fetch("/api/acesso?payment_id=" + encodeURIComponent(id), { cache: "no-store" });
      j = await r.json();
      if (r.status === 400) {
        texto.textContent = "Esse número não parece certo.";
        return mostrar("erro", "Digite só os números do comprovante do Mercado Pago.");
      }
      if (r.status === 503) {
        texto.textContent = "A venda ainda não está aberta.";
        return mostrar("erro", "Volte daqui a pouco ou chame no WhatsApp.");
      }
    } catch {
      texto.textContent = "Sem conexão com o servidor.";
      return mostrar("erro", "Confira a internet e tente de novo.");
    }

    if (j.liberado) {
      tentativas = 0;
      texto.textContent = "Pagamento aprovado. Obrigado por apoiar o projeto!";
      mostrar("ok", "Número do pagamento: " + id + ". Guarde esse número: com ele você volta aqui quando quiser.");
      baixar.href = j.baixar;
      video.hidden = !j.video;
      if (j.video) video.href = j.video;
      entregas.hidden = false;
      return;
    }

    if (j.pendente && tentativas < 120) {
      // Pix ainda não compensou: confere de novo a cada 5 segundos, por até 10 minutos
      tentativas++;
      texto.textContent = "Esperando o Pix ser confirmado…";
      mostrar("", "Assim que o pagamento cair, esta página abre sozinha. Pode deixar aberta.");
      timer = setTimeout(() => consultar(id), 5000);
      return;
    }

    texto.textContent = "Não encontramos um pagamento aprovado com esse número.";
    mostrar("erro", j.motivo === "refunded" || j.motivo === "cancelled"
      ? "Esse pagamento foi devolvido ou cancelado, então o acesso foi encerrado."
      : "Confira o número no comprovante. Se acabou de pagar, espere um minuto e tente de novo.");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    tentativas = 0;
    consultar(numero.value.trim());
  });

  // O Mercado Pago volta para esta página com o número do pagamento no endereço
  const id = new URLSearchParams(location.search).get("payment_id") || new URLSearchParams(location.search).get("collection_id");
  if (id && /^\d{5,20}$/.test(id)) {
    numero.value = id;
    consultar(id);
  } else {
    texto.textContent = "Digite o número do pagamento para abrir o seu acesso.";
  }
})();
