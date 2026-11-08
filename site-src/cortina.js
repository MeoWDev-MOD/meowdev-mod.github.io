// Cortina entre as páginas do próprio site (início, projetos, MeoWGuard, privacidade). A chegada é só CSS (classe "pt" no
// <html>, ligada por um script bem pequeno no <head>): nunca fica presa. Páginas de projeto trazidas para cá (como o
// /ps5-hdmi-tool/) abrem sem cortina, porque têm a própria identidade.
"use strict";

const PAGINAS = new Set(["/", "/projetos/", "/app/", "/app/acesso/", "/privacidade/"]);

/** Vale a cortina? Só para outra página do site da lista, na mesma aba e sem ser download. */
export function ehLinkDePagina(href, aqui, { target = "", download = false, modificado = false } = {}) {
  if (!href || target === "_blank" || download || modificado) return false;
  let para;
  try { para = new URL(href, aqui); } catch { return false; }
  const de = new URL(aqui);
  if (para.origin !== de.origin || para.pathname === de.pathname) return false;
  return PAGINAS.has(para.pathname);
}

export function iniciarCortina(gsap) {
  const calmo = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  let cortina = null;
  const LOGO = "/img/logo-gato-tech-meow.webp";
  new Image().src = LOGO; // já carregada quando a cortina fechar
  document.addEventListener("click", (e) => {
    const a = e.target.closest?.("a[href]");
    if (!a || e.defaultPrevented || calmo()) return;
    if (!ehLinkDePagina(a.href, location.href, { target: a.target, download: a.hasAttribute("download"), modificado: e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0 })) return;
    e.preventDefault();
    cortina = document.createElement("div");
    cortina.className = "ptc";
    cortina.innerHTML = `<img src="${LOGO}" alt="">`;
    document.body.appendChild(cortina);
    try { sessionStorage.setItem("ps5.pt", "1"); } catch { /* modo privado: chega sem cortina */ }
    gsap.timeline({ onComplete: () => location.assign(a.href) })
      .fromTo(cortina, { clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)", duration: 0.42, ease: "power3.inOut" })
      .fromTo(cortina.firstChild, { scale: 0.7, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.24, ease: "back.out(2)" }, "-=0.18");
  });
  // voltar pelo navegador restaura a página como estava: tira a cortina
  addEventListener("pageshow", (e) => { if (e.persisted && cortina) { cortina.remove(); cortina = null; } });
}
