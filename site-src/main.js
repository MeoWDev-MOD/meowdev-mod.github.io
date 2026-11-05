// Tech MeoW · site e link da bio. Mesmas animações do site do Iron Check: rolagem suave (Lenis), entradas por seção e
// linha dos passos (GSAP + ScrollTrigger), blocos que aproximam ao aparecer e os selos que batem na foto.
// A abertura usa a Interposer Tech MeoW em 3D do site do PS5 HDMI Tool (cena3d.js), carregada à parte.
// Anúncios: lugar "bio-site" da aba Publicidade do CRM (banners.js), com o aviso de cookies (consent.js).
// Sem script, ou com "reduzir movimento", a página mostra tudo parado e continua funcionando.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { mountAdPairs } from "./banners.js";
import { mountConsent, optionalAllowed } from "./consent.js";

gsap.registerPlugin(ScrollTrigger);
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const economia = navigator.connection?.saveData === true;

// ---------- Rolagem suave, inclusive nos links do menu (o espaço da barra do topo vem do scroll-padding do CSS) ----------
if (!still) {
  const lenis = new Lenis({ lerp: 0.12, anchors: { offset: 0, duration: 1.15, easing: (x) => 1 - Math.pow(1 - x, 4) } });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

// ---------- Abertura: o selo, o título linha por linha e a peça entrando ----------
if (!still) {
  gsap.from(".promo-pill", { y: -14, opacity: 0, duration: 0.6, ease: "power3.out" });
  gsap.from(".h1-line", { y: 40, opacity: 0, duration: 0.9, stagger: 0.12, delay: 0.1, ease: "power3.out" });
  gsap.from(".hero-copy .lead, .hero-copy .cta, .hero-copy .fine", { y: 22, opacity: 0, duration: 0.7, stagger: 0.08, delay: 0.3, ease: "power3.out" });
  gsap.from(".stage3d", { y: 40, opacity: 0, scale: 0.94, duration: 1.1, delay: 0.15, ease: "power3.out" });
  gsap.to(".hero-glow", { xPercent: 4, yPercent: -3, scale: 1.08, duration: 9, ease: "sine.inOut", yoyo: true, repeat: -1 });
}

// A peça em 3D só baixa quando o navegador está livre. Sem WebGL, fica a foto.
const palco = document.getElementById("palco3d");
const canvas = document.getElementById("peca3d");
if (palco && canvas && !still && !economia) {
  const ocioso = (fn) => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 700));
  ocioso(async () => {
    try {
      const m = await import("./cena3d.js");
      if (!m.has3D()) return;
      await m.initHero(canvas, { onReady: () => palco.classList.add("pronto") });
    } catch (e) {
      console.warn("3D da interposer indisponível, ficou a foto", e);
    }
  });
}

// ---------- Números: os que são contagem sobem até o valor ----------
if (!still) {
  document.querySelectorAll("[data-conta]").forEach((el) => {
    const alvo = Number(el.dataset.conta);
    const n = { v: 0 };
    gsap.to(n, { v: alvo, duration: 1.2, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 88%", once: true }, onUpdate: () => (el.textContent = String(Math.round(n.v))) });
  });
}

// ---------- Blocos: a foto aproxima devagar, a barrinha corre e o vídeo só baixa e toca com o bloco na tela ----------
document.querySelectorAll(".tile").forEach((tile) => {
  const v = tile.querySelector("video");
  new IntersectionObserver(
    ([en]) => {
      tile.classList.toggle("is-in", en.isIntersecting);
      if (!v || still) return;
      if (en.isIntersecting) {
        if (!v.getAttribute("src")) v.src = v.dataset.src;
        v.play().catch(() => {});
      } else v.pause();
    },
    { threshold: 0.35 },
  ).observe(tile);
});

// ---------- Soluções: a categoria escolhida esconde as outras (CSS); aqui só a entrada dos blocos que ficam ----------
const filtros = document.querySelector(".filtros");
if (filtros) {
  filtros.addEventListener("change", () => {
    const visiveis = [...document.querySelectorAll(".solucoes .tile")].filter((t) => t.offsetParent !== null);
    if (!still) gsap.fromTo(visiveis, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.04, ease: "power3.out", clearProps: "transform,opacity" });
    ScrollTrigger.refresh();
  });
}

// ---------- Contato: a tecla escolhida troca a dica e o exemplo; o botão monta a mensagem ----------
const form = document.querySelector(".pedido");
if (form) {
  const texto = form.querySelector("textarea");
  const exemplos = {
    reparo: "Ex.: PS5 Slim sem imagem na TV",
    desbloqueio: "Ex.: Switch OLED",
    interposer: "Ex.: quero 2 unidades",
    curso: "Ex.: já mexo com Switch, quero aprender o desbloqueio",
    parceria: "Ex.: tenho uma assistência técnica",
  };
  form.addEventListener("change", (e) => {
    if (e.target.name === "assunto") texto.placeholder = exemplos[e.target.value] || "";
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const frase = form.querySelector("input[name=assunto]:checked")?.getAttribute("data-frase") ?? "";
    let msg = `Olá, Tech MeoW! Vim pelo site e ${frase}.`;
    const extra = texto.value.trim();
    if (extra) msg += `\n${extra}`;
    const url = `https://wa.me/${form.dataset.whats}?text=${encodeURIComponent(msg)}`;
    // Com "noopener" o navegador devolve nulo e abriria duas vezes; por isso corta o vínculo à mão.
    const janela = window.open(url, "_blank");
    if (janela) janela.opener = null;
    else location.href = url;
  });
}

// ---------- Passos e selos: a linha se desenha com a rolagem e os selos batem na foto ----------
if (!still) {
  const line = document.querySelector(".flow-line");
  if (line) gsap.fromTo(line, { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { trigger: ".flow", start: "top 78%", end: "bottom 58%", scrub: 0.4 } });
  document.querySelectorAll(".stamp").forEach((stamp) => {
    const giro = stamp.classList.contains("stamp-nfc") ? 26 : -26;
    gsap.from(stamp, { scale: 1.4, rotate: giro, opacity: 0, duration: 0.5, ease: "back.out(2)", scrollTrigger: { trigger: stamp, start: "top 82%", once: true } });
  });
}

// ---------- Entradas de seção: nada fica escondido sem script, porque só o script esconde ----------
if (!still) {
  document.querySelectorAll("main > section:not(.hero)").forEach((section) => {
    const parts = section.querySelectorAll("h2, .lead, .stats > div, .reparos .tile, .flow li, .promo-texto > *, .promo-foto, .sub-titulo, .plan, .filtros, .produto .paper-wrap, .produto-texto > *, .teclas, .pedido-dica, .pedido textarea, .btn-grande, .endereco, details, .final .cta");
    if (!parts.length) return;
    gsap.set(parts, { opacity: 0, y: 22 });
    ScrollTrigger.batch(parts, {
      start: "top 92%",
      once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: "power3.out", clearProps: "transform,opacity" }),
    });
  });
  // Os blocos das soluções entram em lote também, mas fora da lista acima: o filtro precisa deles sem estilo preso.
  const solucoes = document.querySelectorAll(".solucoes .tile");
  gsap.set(solucoes, { opacity: 0, y: 22 });
  ScrollTrigger.batch(solucoes, { start: "top 92%", once: true, onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: "power3.out", clearProps: "transform,opacity" }) });
  addEventListener("load", () => ScrollTrigger.refresh());
}

// ---------- Anúncios do CRM e aviso de cookies ----------
mountConsent("");

// ---------- Mapa do Google: com "Aceitar tudo" abre sozinho; sem isso, só com o clique no botão ----------
const mapa = document.querySelector(".mapa[data-mapa]");
const abrirMapa = () => {
  if (!mapa || mapa.querySelector("iframe")) return;
  const f = document.createElement("iframe");
  f.title = "Mapa do Google: Rua Sergio Silva, 50, Engenho da Rainha, Rio de Janeiro";
  f.src = mapa.dataset.mapa;
  f.loading = "lazy";
  f.referrerPolicy = "no-referrer-when-downgrade";
  f.allowFullscreen = true;
  mapa.querySelector(".mapa-capa")?.remove();
  mapa.append(f);
};
if (mapa) {
  mapa.querySelector(".mapa-capa")?.addEventListener("click", (e) => { e.preventDefault(); abrirMapa(); });
  if (optionalAllowed()) abrirMapa();
  document.addEventListener("bio-consent", (e) => { if (e.detail?.optional) abrirMapa(); });
}
const espacos = [
  ["adSolucoes", "adSolucoesMidia"],
  ["adLoja", "adLojaMidia"],
]
  .map(([a, b]) => [document.getElementById(a), document.getElementById(b)])
  .filter(([a, b]) => a && b);
if (espacos.length) mountAdPairs(espacos, "bio-site");
