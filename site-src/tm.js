// Tech MeoW · script de todas as páginas do site principal: menu e aba Projetos, tema claro/escuro, rolagem suave,
// entradas ao rolar, fundo vivo, 3D da Interposer, filtros, formulário do WhatsApp, mapa e anúncios do CRM.
// O conteúdo já nasce visível: só o script esconde algo (e só o que está abaixo da dobra). Sem script, ou com "reduzir
// movimento", a página mostra tudo parado e continua funcionando.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { iniciarEfeitos, trocarTema } from "./efeitos.js";
import { iniciarFundo } from "./fundo.js";
import { iniciarCortina } from "./cortina.js";
import { mountAdPairs } from "./banners.js";
import { mountConsent, optionalAllowed } from "./consent.js";
import { contarVisita } from "./visitas.js";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];
const html = document.documentElement;
const parado = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mouse = matchMedia("(hover: hover) and (pointer: fine)").matches;
const economia = navigator.connection?.saveData === true;
const escuro = () => (html.dataset.theme ? html.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
const telaGrande = () => matchMedia("(min-width: 1181px)").matches; // acima disso o menu fica aberto no topo

// ---------- Tema claro/escuro (a escolha fica só neste navegador) ----------
$("#themeBtn")?.addEventListener("click", (e) => trocarTema(e, () => {
  const novo = escuro() ? "light" : "dark";
  html.dataset.theme = novo;
  try { localStorage.setItem("tm.theme", novo); } catch { /* modo privado */ }
}));

// ---------- Topo: sombra ao rolar, menu do celular e aba Projetos ----------
const topo = $(".top");
const menuBtn = $(".menu-btn");
const aba = $(".dd");
const abaBtn = $(".dd-btn");

addEventListener("scroll", () => topo?.classList.toggle("rolou", scrollY > 8), { passive: true });

function menu(abrir) {
  if (!topo || !menuBtn) return;
  topo.dataset.menu = abrir ? "open" : "closed";
  menuBtn.setAttribute("aria-expanded", String(abrir));
  menuBtn.setAttribute("aria-label", abrir ? "Fechar o menu" : "Abrir o menu");
  if (!abrir) projetos(false);
}
function projetos(abrir) {
  if (!aba || !abaBtn) return;
  if (abrir) aba.dataset.open = ""; else delete aba.dataset.open;
  abaBtn.setAttribute("aria-expanded", String(abrir));
}
menuBtn?.addEventListener("click", () => menu(topo.dataset.menu !== "open"));
abaBtn?.addEventListener("click", (e) => {
  if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return; // abrir em outra aba continua indo para /projetos/
  if (e.pointerType === "mouse" && telaGrande()) return; // com o mouse o menu já abriu ao passar: o clique leva para /projetos/
  e.preventDefault();
  projetos(!aba.hasAttribute("data-open"));
});
let fechar = 0;
aba?.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && telaGrande()) { clearTimeout(fechar); projetos(true); } });
aba?.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && telaGrande()) fechar = setTimeout(() => projetos(false), 180); });
aba?.addEventListener("focusout", (e) => { if (!aba.contains(e.relatedTarget)) projetos(false); });
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (aba?.hasAttribute("data-open")) { projetos(false); abaBtn.focus(); }
  else if (topo?.dataset.menu === "open") { menu(false); menuBtn.focus(); }
});
document.addEventListener("click", (e) => {
  if (aba && !e.target.closest(".dd")) projetos(false);
  if (topo && !e.target.closest(".top")) menu(false);
  if (e.target.closest(".links > a, .dd-item, .dd-all")) menu(false);
});
addEventListener("resize", () => { if (telaGrande()) menu(false); }, { passive: true });

// ---------- Rolagem suave (mouse e trackpad); no toque, a rolagem do celular é melhor ----------
let lenis = null;
if (!parado && mouse) {
  lenis = new Lenis({ lerp: 0.11 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
// Links para um ponto da mesma página (ex.: "Reparos" na página inicial) rolam suave, com a folga do topo.
document.addEventListener("click", (e) => {
  const a = e.target.closest?.("a[href*='#']");
  if (!a || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || a.target === "_blank") return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname || url.hash.length < 2) return;
  const alvo = document.getElementById(decodeURIComponent(url.hash.slice(1)));
  if (!alvo) return;
  e.preventDefault();
  const folga = (topo?.offsetHeight || 64) + 12;
  if (lenis) lenis.scrollTo(alvo, { offset: -folga, duration: 1.1 });
  else alvo.scrollIntoView({ behavior: parado ? "auto" : "smooth", block: "start" });
  try { history.replaceState(null, "", url.hash); } catch { /* segue sem mudar o endereço */ }
});

// ---------- Efeitos de interface, fundo vivo e cortina entre páginas ----------
iniciarEfeitos();
iniciarFundo($("#fxBg"), escuro).start();
iniciarCortina(gsap);

// ---------- Abertura da página inicial: o título palavra por palavra e o cartão da promoção ----------
function dividirPalavras(h) {
  const embrulha = (txt, cls) => txt.split(/(\s+)/).map((p) => (/^\s*$/.test(p) ? p : `<span class="w ${cls}">${p}</span>`)).join("");
  h.innerHTML = [...h.childNodes].map((n) => (n.nodeType === 3 ? embrulha(n.textContent, "") : embrulha(n.textContent, n.className))).join("");
  return $$(".w", h);
}
const h1 = $(".hero h1");
if (h1 && !parado) {
  const palavras = dividirPalavras(h1);
  gsap.timeline({ defaults: { ease: "power3.out", clearProps: "transform,opacity,visibility" } })
    .from(".hero .local", { y: -12, autoAlpha: 0, duration: 0.5 })
    .from(palavras, { yPercent: 55, autoAlpha: 0, duration: 0.65, stagger: 0.05 }, "-=0.3")
    .from(".hero .lead, .hero .cta, .hero .chips", { y: 18, autoAlpha: 0, duration: 0.55, stagger: 0.09 }, "-=0.4")
    .from(".hero .card_box", { y: 44, autoAlpha: 0, duration: 0.85 }, 0.2);
}

// ---------- Entradas ao rolar: só o que ainda está abaixo da dobra é escondido e depois revelado ----------
if (!parado) {
  const itens = $$(".sec .h > *, .sec .card, .sec .steps li, .sec details, .sec .unlock, .sec .sub, .sec .sub-p, .sec .filtros, .lanc, .final > *")
    .filter((el) => el.getBoundingClientRect().top > innerHeight * 0.92);
  if (itens.length) {
    gsap.set(itens, { y: 26, autoAlpha: 0 });
    ScrollTrigger.batch(itens, {
      start: "top 92%",
      once: true,
      onEnter: (lote) => gsap.to(lote, { y: 0, autoAlpha: 1, duration: 0.6, ease: "power3.out", stagger: 0.06, clearProps: "transform,opacity,visibility" }),
    });
  }
  gsap.to("#scrollBar", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
  addEventListener("load", () => ScrollTrigger.refresh());
}
// Aba ativa no menu, enquanto a seção correspondente está na tela (só na página inicial)
$$(".links a[data-sec]").forEach((a) => {
  const sec = document.getElementById(a.dataset.sec);
  if (sec) ScrollTrigger.create({ trigger: sec, start: "top 45%", end: "bottom 45%", toggleClass: { targets: a, className: "on" } });
});

// ---------- Vídeo do conserto de PS5: só baixa e toca com o cartão na tela ----------
$$(".media video[data-src]").forEach((v) => {
  new IntersectionObserver(([en]) => {
    if (parado) return;
    if (en.isIntersecting) {
      if (!v.getAttribute("src")) v.src = v.dataset.src;
      v.play().catch(() => {});
    } else v.pause();
  }, { threshold: 0.35 }).observe(v);
});

// ---------- Interposer em 3D: só baixa quando a loja está perto da tela. Sem WebGL, fica a foto ----------
const palco = $("#palco3d");
const tela3d = $("#peca3d");
if (palco && tela3d && !parado && !economia) {
  new IntersectionObserver(async ([en], obs) => {
    if (!en.isIntersecting) return;
    obs.disconnect();
    try {
      const m = await import("./cena3d.js");
      if (!m.has3D()) return;
      await m.initHero(tela3d, { onReady: () => palco.classList.add("pronto") });
    } catch (e) {
      console.warn("3D da interposer indisponível, ficou a foto", e);
    }
  }, { rootMargin: "300px" }).observe(palco);
}

// ---------- Projetos: a aba escolhida esconde os cartões das outras (sem script, aparecem todos) ----------
const filtros = $(".filtros");
if (filtros) {
  const cartoes = $$("[data-cats]");
  const categorias = $$("input[name=cat]", filtros).map((i) => i.value);
  const aplicar = (cat, animar) => {
    cartoes.forEach((c) => { c.hidden = !(cat === "tudo" || c.dataset.cats.split(" ").includes(cat)); });
    const vazio = $("#pjVazio");
    if (vazio) vazio.hidden = cartoes.some((c) => !c.hidden);
    if (animar && !parado) gsap.fromTo(cartoes.filter((c) => !c.hidden), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.04, ease: "power3.out", clearProps: "transform,opacity,visibility" });
    ScrollTrigger.refresh();
  };
  filtros.addEventListener("change", (e) => {
    aplicar(e.target.value, true);
    try { history.replaceState(null, "", e.target.value === "tudo" ? location.pathname : `#${e.target.value}`); } catch { /* sem endereço novo */ }
  });
  // O endereço com a aba (ex.: /projetos/#switch) abre já nela, também quando só o "#" muda com a página aberta.
  const daAba = (animar) => {
    const cat = decodeURIComponent(location.hash.slice(1));
    if (!categorias.includes(cat)) return;
    $(`input[name=cat][value="${cat}"]`, filtros).checked = true;
    aplicar(cat, animar);
  };
  daAba(false);
  addEventListener("hashchange", () => daAba(true));
}

// ---------- Contato: a tecla escolhida troca a dica e o exemplo; o botão monta a mensagem ----------
const form = $(".pedido");
if (form) {
  const texto = $("textarea", form);
  // idioma da página (as páginas en/, es/ e ru/ saem de site-src/i18n): troca os exemplos e o começo da mensagem
  const LANG = (document.documentElement.lang || "pt").slice(0, 2).toLowerCase();
  const EXEMPLOS = {"en": {"reparo": "E.g.: PS5 Slim with no picture on the TV", "desbloqueio": "E.g.: Switch OLED", "interposer": "E.g.: I'd like 2 units", "curso": "E.g.: I already work with the Switch and want to learn unlocking", "parceria": "E.g.: I run a repair shop"}, "es": {"reparo": "Ej.: PS5 Slim sin imagen en la TV", "desbloqueio": "Ej.: Switch OLED", "interposer": "Ej.: quiero 2 unidades", "curso": "Ej.: ya trabajo con Switch y quiero aprender el desbloqueo", "parceria": "Ej.: tengo un taller de reparación"}, "ru": {"reparo": "Например: PS5 Slim без изображения на телевизоре", "desbloqueio": "Например: Switch OLED", "interposer": "Например: нужно 2 штуки", "curso": "Например: уже работаю со Switch, хочу научиться прошивке", "parceria": "Например: у меня сервисный центр"}};
  const INICIO = {"en": "Hello, Tech MeoW! I came from the website and {frase}.", "es": "¡Hola, Tech MeoW! Vengo del sitio y {frase}.", "ru": "Здравствуйте, Tech MeoW! Я пришёл с сайта и {frase}."};
  const exemplos = EXEMPLOS[LANG] ?? {
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
    const frase = $("input[name=assunto]:checked", form)?.getAttribute("data-frase") ?? "";
    let msg = INICIO[LANG] ? INICIO[LANG].replace("{frase}", frase) : `Olá, Tech MeoW! Vim pelo site e ${frase}.`;
    const extra = texto.value.trim();
    if (extra) msg += `\n${extra}`;
    const url = `https://wa.me/${form.dataset.whats}?text=${encodeURIComponent(msg)}`;
    // Com "noopener" o navegador devolve nulo e abriria duas vezes; por isso corta o vínculo à mão.
    const janela = window.open(url, "_blank");
    if (janela) janela.opener = null;
    else location.href = url;
  });
}

// ---------- Cookies, mapa do Google e anúncios do CRM ----------
mountConsent("/");
const mapa = $(".mapa[data-mapa]");
const abrirMapa = () => {
  if (!mapa || mapa.querySelector("iframe")) return;
  const f = document.createElement("iframe");
  const MAPA = {"en": "Google map: Rua Sergio Silva, 50, Engenho da Rainha, Rio de Janeiro", "es": "Mapa de Google: Rua Sergio Silva, 50, Engenho da Rainha, Río de Janeiro", "ru": "Карта Google: Rua Sergio Silva, 50, Engenho da Rainha, Рио-де-Жанейро"};
  f.title = MAPA[(document.documentElement.lang || "pt").slice(0, 2)] ?? "Mapa do Google: Rua Sergio Silva, 50, Engenho da Rainha, Rio de Janeiro";
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
const espacos = [["adProjetos", "adProjetosMidia"], ["adLoja", "adLojaMidia"]]
  .map(([a, b]) => [document.getElementById(a), document.getElementById(b)])
  .filter(([a, b]) => a && b);
if (espacos.length) mountAdPairs(espacos, "bio-site");
contarVisita();
