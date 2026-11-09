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

  // consulta: o que vai depois do "?" (o código de acesso, ou os três códigos que a InfinitePay devolve logo depois de pagar)
  async function consultar(id, consulta) {
    clearTimeout(timer);
    entregas.hidden = true;
    mostrar("", "Conferindo o pagamento…");
    const q = consulta || "payment_id=" + encodeURIComponent(id);
    let j;
    try {
      const r = await fetch("/api/acesso?" + q, { cache: "no-store" });
      j = await r.json();
      if (r.status === 400) {
        texto.textContent = "Esse código não parece certo.";
        return mostrar("erro", "Digite só os números do seu código de acesso.");
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
      const codigo = j.codigo || id;
      numero.value = codigo;
      texto.textContent = "Pagamento aprovado. Obrigado por apoiar o projeto!";
      mostrar("ok", "Seu código de acesso: " + codigo + ". Anote ou tire print: com ele você volta aqui quando quiser e atualiza o app.");
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
      timer = setTimeout(() => consultar(id, consulta), 5000);
      return;
    }

    texto.textContent = "Não encontramos um pagamento aprovado com esse código.";
    mostrar("erro", j.motivo === "refunded" || j.motivo === "cancelled"
      ? "Esse pagamento foi devolvido ou cancelado, então o acesso foi encerrado."
      : "Confira o código. Se acabou de pagar, espere um minuto e tente de novo. Se o dinheiro foi devolvido, o acesso é encerrado.");
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
    texto.textContent = "Digite o código de acesso para abrir o seu acesso.";
  }
})();
